import * as LegacyFileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { getDb } from "./db";

const BACKUP_FORMAT = "campaign-backup";
const BACKUP_VERSION = 1;

// Order matters for restore: sessions before session_members, campaigns
// before its child tables, and campaign_locations/campaign_sessions before
// npc_appearances, since these reference each other's ids. No declared
// foreign keys exist in the schema, so this is a data-integrity convention,
// not something SQLite enforces.
const BACKUP_TABLES = [
  "campaigns",
  "campaign_pcs",
  "campaign_locations",
  "campaign_sessions",
  "npcs",
  "notes",
  "encounters",
  "maps",
  "bestiary",
  "npc_appearances",
  "npc_relations",
  "sessions",
  "session_members",
  "settings",
] as const;

type Row = Record<string, unknown>;

interface BackupPayload {
  format: string;
  version: number;
  exportedAt: string;
  tables: Partial<Record<(typeof BACKUP_TABLES)[number], Row[]>>;
  mapImages: { filename: string; base64: string }[];
}

export interface BackupCounts {
  npcs: number;
  notes: number;
  encounters: number;
  maps: number;
  bestiary: number;
  sessions: number;
  sessionMembers: number;
  campaigns: number;
}

function mapsDirUri(): string {
  return `${LegacyFileSystem.documentDirectory}maps/`;
}

function countsFromTables(tables: BackupPayload["tables"]): BackupCounts {
  return {
    npcs: tables.npcs?.length ?? 0,
    notes: tables.notes?.length ?? 0,
    encounters: tables.encounters?.length ?? 0,
    maps: tables.maps?.length ?? 0,
    bestiary: tables.bestiary?.length ?? 0,
    sessions: tables.sessions?.length ?? 0,
    sessionMembers: tables.session_members?.length ?? 0,
    campaigns: tables.campaigns?.length ?? 0,
  };
}

/**
 * Bundles every table plus the raw bytes of every locally-stored map image
 * into one JSON file, then hands it to the OS share sheet. Self-contained on
 * purpose (no zip dependency) so it doesn't need a native module beyond what
 * the app already ships with.
 */
export async function exportBackup(): Promise<BackupCounts> {
  const db = getDb();
  const tables: BackupPayload["tables"] = {};
  for (const table of BACKUP_TABLES) {
    tables[table] = db.prepare(`SELECT * FROM ${table}`).all() as Row[];
  }

  const mapImages: BackupPayload["mapImages"] = [];
  const dirUri = mapsDirUri();
  const dirInfo = await LegacyFileSystem.getInfoAsync(dirUri);
  if (dirInfo.exists) {
    const filenames = await LegacyFileSystem.readDirectoryAsync(dirUri);
    for (const filename of filenames) {
      const base64 = await LegacyFileSystem.readAsStringAsync(dirUri + filename, {
        encoding: "base64",
      });
      mapImages.push({ filename, base64 });
    }
  }

  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    mapImages,
  };

  const stamp = payload.exportedAt.replace(/[:.]/g, "-");
  const outUri = `${LegacyFileSystem.cacheDirectory}campaign-backup-${stamp}.json`;
  await LegacyFileSystem.writeAsStringAsync(outUri, JSON.stringify(payload));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(outUri, {
      mimeType: "application/json",
      dialogTitle: "Save campaign backup",
    });
  }

  return countsFromTables(tables);
}

function rewriteMapFilePath(row: Row, dirUri: string): Row {
  if (row.type !== "image" || typeof row.file_path !== "string" || !row.file_path) return row;
  const filename = row.file_path.split("/").pop();
  return filename ? { ...row, file_path: `${dirUri}${filename}` } : row;
}

function insertRow(db: ReturnType<typeof getDb>, table: string, row: Row): void {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => "?").join(", ");
  db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`).run(
    ...columns.map((column) => row[column])
  );
}

/**
 * Fully replaces the current campaign with the one in the backup file —
 * intended for moving to a new phone, not merging. Original row ids are
 * preserved so cross-references (e.g. session_members.session_id) stay
 * intact; image file paths are rewritten to this device's actual document
 * directory, since the exported paths point at the *old* device's.
 */
export async function importBackup(fileUri: string): Promise<BackupCounts> {
  const raw = await LegacyFileSystem.readAsStringAsync(fileUri);
  let payload: BackupPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid — it may be corrupted.");
  }
  if (payload.format !== BACKUP_FORMAT || typeof payload.version !== "number") {
    throw new Error("That file doesn't look like a campaign backup.");
  }

  const dirUri = mapsDirUri();
  const dirInfo = await LegacyFileSystem.getInfoAsync(dirUri);
  if (!dirInfo.exists) {
    await LegacyFileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  }
  for (const image of payload.mapImages ?? []) {
    await LegacyFileSystem.writeAsStringAsync(dirUri + image.filename, image.base64, {
      encoding: "base64",
    });
  }

  const db = getDb();
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("BEGIN;");
  try {
    for (const table of [...BACKUP_TABLES].reverse()) {
      db.exec(`DELETE FROM ${table};`);
    }
    for (const table of BACKUP_TABLES) {
      const rows = payload.tables[table] ?? [];
      for (const row of rows) {
        insertRow(db, table, table === "maps" ? rewriteMapFilePath(row, dirUri) : row);
      }
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }

  return countsFromTables(payload.tables);
}
