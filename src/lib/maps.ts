import { getDb } from "./db";

export type MapType = "image" | "link";

export interface MapRecord {
  id: number;
  name: string;
  type: MapType;
  file_path: string | null;
  url: string | null;
  notes: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface MapInput {
  name: string;
  type: MapType;
  file_path?: string | null;
  url?: string | null;
  notes?: string;
  tags?: string;
}

export function listMaps(query?: string): MapRecord[] {
  const db = getDb();
  if (!query || !query.trim()) {
    return db.prepare("SELECT * FROM maps ORDER BY name COLLATE NOCASE").all() as MapRecord[];
  }
  const q = `%${query.trim().toLowerCase()}%`;
  return db
    .prepare(
      `SELECT * FROM maps WHERE lower(name) LIKE ? OR lower(tags) LIKE ? ORDER BY name COLLATE NOCASE`
    )
    .all(q, q) as MapRecord[];
}

export function getMap(id: number): MapRecord | undefined {
  return getDb().prepare("SELECT * FROM maps WHERE id = ?").get(id) as MapRecord | undefined;
}

export function createMap(input: MapInput): MapRecord {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO maps (name, type, file_path, url, notes, tags) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.type,
      input.file_path ?? null,
      input.url ?? null,
      input.notes ?? "",
      input.tags ?? ""
    );
  return getMap(result.lastInsertRowid as number)!;
}

export function updateMap(id: number, input: MapInput): MapRecord | undefined {
  const db = getDb();
  db.prepare(
    `UPDATE maps SET name = ?, type = ?, file_path = ?, url = ?, notes = ?, tags = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.name,
    input.type,
    input.file_path ?? null,
    input.url ?? null,
    input.notes ?? "",
    input.tags ?? "",
    id
  );
  return getMap(id);
}

export function deleteMap(id: number): void {
  getDb().prepare("DELETE FROM maps WHERE id = ?").run(id);
}
