import { getDb } from "./db";

/* -------------------------------------------------------------- campaigns */

export interface Campaign {
  id: number;
  name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignSummary extends Campaign {
  pcCount: number;
  locationCount: number;
  sessionCount: number;
}

export function listCampaigns(): CampaignSummary[] {
  return getDb()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM campaign_pcs p WHERE p.campaign_id = c.id) AS pcCount,
              (SELECT COUNT(*) FROM campaign_locations l WHERE l.campaign_id = c.id) AS locationCount,
              (SELECT COUNT(*) FROM campaign_sessions s WHERE s.campaign_id = c.id) AS sessionCount
       FROM campaigns c
       ORDER BY c.updated_at DESC`
    )
    .all() as CampaignSummary[];
}

export function getCampaign(id: number): Campaign | undefined {
  return getDb().prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as Campaign | undefined;
}

export function createCampaign(name: string, notes = ""): Campaign {
  const result = getDb().prepare("INSERT INTO campaigns (name, notes) VALUES (?, ?)").run(name, notes);
  return getCampaign(result.lastInsertRowid as number)!;
}

export function updateCampaign(id: number, name: string, notes = ""): Campaign | undefined {
  getDb()
    .prepare("UPDATE campaigns SET name = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name, notes, id);
  return getCampaign(id);
}

export function deleteCampaign(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM campaign_pcs WHERE campaign_id = ?").run(id);
  db.prepare("DELETE FROM campaign_locations WHERE campaign_id = ?").run(id);
  db.prepare("DELETE FROM campaign_sessions WHERE campaign_id = ?").run(id);
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
}

/* ------------------------------------------------------------- campaign PCs */

export interface CampaignPc {
  id: number;
  campaignId: number;
  name: string;
  classLevel: string;
  maxHp: number;
  ac: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignPcInput {
  campaignId: number;
  name: string;
  classLevel?: string;
  maxHp: number;
  ac: number;
  notes?: string;
}

interface CampaignPcRow {
  id: number;
  campaign_id: number;
  name: string;
  class_level: string;
  max_hp: number;
  ac: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function rowToPc(row: CampaignPcRow): CampaignPc {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    classLevel: row.class_level,
    maxHp: row.max_hp,
    ac: row.ac,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listCampaignPcs(campaignId: number): CampaignPc[] {
  const rows = getDb()
    .prepare("SELECT * FROM campaign_pcs WHERE campaign_id = ? ORDER BY name COLLATE NOCASE")
    .all(campaignId) as CampaignPcRow[];
  return rows.map(rowToPc);
}

export function getCampaignPc(id: number): CampaignPc | undefined {
  const row = getDb().prepare("SELECT * FROM campaign_pcs WHERE id = ?").get(id) as
    | CampaignPcRow
    | undefined;
  return row ? rowToPc(row) : undefined;
}

export function createCampaignPc(input: CampaignPcInput): CampaignPc {
  const result = getDb()
    .prepare(
      `INSERT INTO campaign_pcs (campaign_id, name, class_level, max_hp, ac, notes) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.campaignId,
      input.name,
      input.classLevel ?? "",
      input.maxHp,
      input.ac,
      input.notes ?? ""
    );
  return getCampaignPc(result.lastInsertRowid as number)!;
}

export function updateCampaignPc(id: number, input: CampaignPcInput): CampaignPc | undefined {
  getDb()
    .prepare(
      `UPDATE campaign_pcs SET name = ?, class_level = ?, max_hp = ?, ac = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(input.name, input.classLevel ?? "", input.maxHp, input.ac, input.notes ?? "", id);
  return getCampaignPc(id);
}

export function deleteCampaignPc(id: number): void {
  getDb().prepare("DELETE FROM campaign_pcs WHERE id = ?").run(id);
}

/* ---------------------------------------------------------------- locations */

export interface CampaignLocation {
  id: number;
  campaignId: number;
  name: string;
  description: string;
  mapId: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocationSummary extends CampaignLocation {
  npcCount: number;
  encounterCount: number;
  noteCount: number;
}

export interface CampaignLocationInput {
  campaignId: number;
  name: string;
  description?: string;
  mapId?: number | null;
}

interface CampaignLocationRow {
  id: number;
  campaign_id: number;
  name: string;
  description: string;
  map_id: number | null;
  created_at: string;
  updated_at: string;
}

function rowToLocation(row: CampaignLocationRow): CampaignLocation {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    description: row.description,
    mapId: row.map_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listCampaignLocations(campaignId: number): LocationSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT l.*,
              (SELECT COUNT(DISTINCT npc_id) FROM npc_appearances a WHERE a.location_id = l.id) AS npcCount,
              (SELECT COUNT(*) FROM encounters e WHERE e.location_id = l.id) AS encounterCount,
              (SELECT COUNT(*) FROM notes n WHERE n.location_id = l.id) AS noteCount
       FROM campaign_locations l
       WHERE l.campaign_id = ?
       ORDER BY l.name COLLATE NOCASE`
    )
    .all(campaignId) as (CampaignLocationRow & { npcCount: number; encounterCount: number; noteCount: number })[];
  return rows.map((row) => ({ ...rowToLocation(row), npcCount: row.npcCount, encounterCount: row.encounterCount, noteCount: row.noteCount }));
}

export function getCampaignLocation(id: number): CampaignLocation | undefined {
  const row = getDb().prepare("SELECT * FROM campaign_locations WHERE id = ?").get(id) as
    | CampaignLocationRow
    | undefined;
  return row ? rowToLocation(row) : undefined;
}

export function createCampaignLocation(input: CampaignLocationInput): CampaignLocation {
  const result = getDb()
    .prepare(`INSERT INTO campaign_locations (campaign_id, name, description, map_id) VALUES (?, ?, ?, ?)`)
    .run(input.campaignId, input.name, input.description ?? "", input.mapId ?? null);
  return getCampaignLocation(result.lastInsertRowid as number)!;
}

export function updateCampaignLocation(
  id: number,
  input: CampaignLocationInput
): CampaignLocation | undefined {
  getDb()
    .prepare(
      `UPDATE campaign_locations SET name = ?, description = ?, map_id = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(input.name, input.description ?? "", input.mapId ?? null, id);
  return getCampaignLocation(id);
}

export function deleteCampaignLocation(id: number): void {
  getDb().prepare("DELETE FROM campaign_locations WHERE id = ?").run(id);
}

/* ----------------------------------------------------------------- sessions */

export interface CampaignSession {
  id: number;
  campaignId: number;
  number: number;
  name: string;
  playedOn: string | null;
  recap: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignSessionInput {
  name?: string;
  playedOn?: string | null;
  recap?: string;
}

interface CampaignSessionRow {
  id: number;
  campaign_id: number;
  number: number;
  name: string;
  played_on: string | null;
  recap: string;
  created_at: string;
  updated_at: string;
}

function rowToSession(row: CampaignSessionRow): CampaignSession {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    number: row.number,
    name: row.name,
    playedOn: row.played_on,
    recap: row.recap,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listCampaignSessions(campaignId: number): CampaignSession[] {
  const rows = getDb()
    .prepare("SELECT * FROM campaign_sessions WHERE campaign_id = ? ORDER BY number DESC")
    .all(campaignId) as CampaignSessionRow[];
  return rows.map(rowToSession);
}

export function getCampaignSession(id: number): CampaignSession | undefined {
  const row = getDb().prepare("SELECT * FROM campaign_sessions WHERE id = ?").get(id) as
    | CampaignSessionRow
    | undefined;
  return row ? rowToSession(row) : undefined;
}

export function createCampaignSession(campaignId: number, input: CampaignSessionInput = {}): CampaignSession {
  const db = getDb();
  const maxNumber = db
    .prepare("SELECT MAX(number) AS n FROM campaign_sessions WHERE campaign_id = ?")
    .get(campaignId) as { n: number | null };
  const nextNumber = (maxNumber?.n ?? 0) + 1;
  const result = db
    .prepare(
      `INSERT INTO campaign_sessions (campaign_id, number, name, played_on, recap) VALUES (?, ?, ?, ?, ?)`
    )
    .run(campaignId, nextNumber, input.name ?? `Session ${nextNumber}`, input.playedOn ?? null, input.recap ?? "");
  return getCampaignSession(result.lastInsertRowid as number)!;
}

export function updateCampaignSession(
  id: number,
  input: CampaignSessionInput
): CampaignSession | undefined {
  const existing = getCampaignSession(id);
  if (!existing) return undefined;
  getDb()
    .prepare(
      `UPDATE campaign_sessions SET name = ?, played_on = ?, recap = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(input.name ?? existing.name, input.playedOn ?? existing.playedOn, input.recap ?? existing.recap, id);
  return getCampaignSession(id);
}

export function deleteCampaignSession(id: number): void {
  getDb().prepare("DELETE FROM campaign_sessions WHERE id = ?").run(id);
}

/* ------------------------------------------------------------ NPC appearances */

export interface NpcAppearance {
  id: number;
  npcId: number;
  locationId: number;
  sessionId: number | null;
  notes: string;
  created_at: string;
}

export interface LocationAppearance extends NpcAppearance {
  npcName: string;
}

export interface NpcAppearanceDetail extends NpcAppearance {
  locationName: string;
  campaignId: number;
  campaignName: string;
  sessionNumber: number | null;
}

export interface NpcAppearanceInput {
  npcId: number;
  locationId: number;
  sessionId?: number | null;
  notes?: string;
}

/** NPCs who've appeared at a location, for the Location hub's "NPCs here" list. */
export function listAppearancesByLocation(locationId: number): LocationAppearance[] {
  return getDb()
    .prepare(
      `SELECT a.*, n.name AS npcName
       FROM npc_appearances a
       JOIN npcs n ON n.id = a.npc_id
       WHERE a.location_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(locationId) as LocationAppearance[];
}

/** Every place/session an NPC has shown up, for the NPC detail screen. */
export function listAppearancesByNpc(npcId: number): NpcAppearanceDetail[] {
  return getDb()
    .prepare(
      `SELECT a.*, l.name AS locationName, l.campaign_id AS campaignId, c.name AS campaignName,
              s.number AS sessionNumber
       FROM npc_appearances a
       JOIN campaign_locations l ON l.id = a.location_id
       JOIN campaigns c ON c.id = l.campaign_id
       LEFT JOIN campaign_sessions s ON s.id = a.session_id
       WHERE a.npc_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(npcId) as NpcAppearanceDetail[];
}

export function createNpcAppearance(input: NpcAppearanceInput): NpcAppearance {
  const result = getDb()
    .prepare(`INSERT INTO npc_appearances (npc_id, location_id, session_id, notes) VALUES (?, ?, ?, ?)`)
    .run(input.npcId, input.locationId, input.sessionId ?? null, input.notes ?? "");
  return getDb().prepare("SELECT * FROM npc_appearances WHERE id = ?").get(result.lastInsertRowid) as NpcAppearance;
}

export function deleteNpcAppearance(id: number): void {
  getDb().prepare("DELETE FROM npc_appearances WHERE id = ?").run(id);
}
