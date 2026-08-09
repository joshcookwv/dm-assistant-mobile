import { getDb } from "./db";
import { listCampaignSessions, type CampaignSession } from "./campaigns";
import type { Note } from "./notes";

/* ------------------------------------------------------------ overview stats */

export interface CampaignOverviewStats {
  pcCount: number;
  locationCount: number;
  sessionCount: number;
  npcCount: number;
  noteCount: number;
  encounterCount: number;
}

function countWhere(sql: string, ...params: unknown[]): number {
  return (getDb().prepare(sql).get(...params) as { n: number }).n;
}

/** Powers the Campaign Overview screen's stat row. Free feature, no AI. */
export function getCampaignOverviewStats(campaignId: number): CampaignOverviewStats {
  return {
    pcCount: countWhere("SELECT COUNT(*) AS n FROM campaign_pcs WHERE campaign_id = ?", campaignId),
    locationCount: countWhere("SELECT COUNT(*) AS n FROM campaign_locations WHERE campaign_id = ?", campaignId),
    sessionCount: countWhere("SELECT COUNT(*) AS n FROM campaign_sessions WHERE campaign_id = ?", campaignId),
    npcCount: countWhere(
      `SELECT COUNT(DISTINCT a.npc_id) AS n FROM npc_appearances a
       JOIN campaign_locations l ON l.id = a.location_id
       WHERE l.campaign_id = ?`,
      campaignId
    ),
    noteCount: countWhere("SELECT COUNT(*) AS n FROM notes WHERE campaign_id = ?", campaignId),
    encounterCount: countWhere("SELECT COUNT(*) AS n FROM encounters WHERE campaign_id = ?", campaignId),
  };
}

/* ------------------------------------------------------------------ timeline */

export interface SessionTimelineEntry {
  session: CampaignSession;
  npcNames: string[];
  locationNames: string[];
  encounterNames: string[];
}

export interface CampaignTimeline {
  sessions: SessionTimelineEntry[];
  /** Campaign-wide notes, most recent first. Notes have no session_id in the
   * schema, so they can't be precisely slotted into a session's entry. */
  notes: Note[];
}

/**
 * Assembles a campaign's chronological history from the existing relational
 * data (npc_appearances, encounters, notes) into one structured object. This
 * is the canonical context object AI features build prompts from — write
 * once, reuse for campaign recaps, session summaries, and search, rather than
 * having each feature re-derive its own view of "what happened."
 */
export function getCampaignTimeline(campaignId: number): CampaignTimeline {
  const db = getDb();
  const sessions = listCampaignSessions(campaignId)
    .slice()
    .sort((a, b) => a.number - b.number);

  const timelineSessions: SessionTimelineEntry[] = sessions.map((session) => {
    const npcNames = (
      db
        .prepare(
          `SELECT DISTINCT n.name FROM npc_appearances a
           JOIN npcs n ON n.id = a.npc_id
           WHERE a.session_id = ?
           ORDER BY n.name COLLATE NOCASE`
        )
        .all(session.id) as { name: string }[]
    ).map((row) => row.name);

    const locationNames = (
      db
        .prepare(
          `SELECT DISTINCT l.name FROM campaign_locations l
           WHERE l.id IN (
             SELECT location_id FROM npc_appearances WHERE session_id = ?
             UNION
             SELECT location_id FROM encounters WHERE session_id = ? AND location_id IS NOT NULL
           )
           ORDER BY l.name COLLATE NOCASE`
        )
        .all(session.id, session.id) as { name: string }[]
    ).map((row) => row.name);

    const encounterNames = (
      db
        .prepare("SELECT name FROM encounters WHERE session_id = ? ORDER BY name COLLATE NOCASE")
        .all(session.id) as { name: string }[]
    ).map((row) => row.name);

    return { session, npcNames, locationNames, encounterNames };
  });

  const notes = db
    .prepare("SELECT * FROM notes WHERE campaign_id = ? ORDER BY updated_at DESC")
    .all(campaignId) as Note[];

  return { sessions: timelineSessions, notes };
}

/* -------------------------------------------------------------------- search */

export interface CampaignSearchResult {
  type: "npc" | "location" | "session" | "note";
  id: number;
  title: string;
  subtitle: string;
}

function buildFtsQuery(raw: string): string {
  const tokens = raw
    .split(/\s+/)
    .map((t) => t.replace(/["^*:]/g, ""))
    .filter(Boolean);
  return tokens.map((t) => `${t}*`).join(" ");
}

/**
 * Local search scoped to one campaign — NPCs that have appeared in it,
 * its locations, its sessions, and its notes. Plain SQL, no AI, free on
 * every tier.
 */
export function searchCampaign(campaignId: number, query: string): CampaignSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const db = getDb();
  const like = `%${trimmed.toLowerCase()}%`;

  const npcs = db
    .prepare(
      `SELECT DISTINCT n.id, n.name, n.role FROM npcs n
       JOIN npc_appearances a ON a.npc_id = n.id
       JOIN campaign_locations l ON l.id = a.location_id
       WHERE l.campaign_id = ? AND (lower(n.name) LIKE ? OR lower(n.description) LIKE ?)
       ORDER BY n.name COLLATE NOCASE`
    )
    .all(campaignId, like, like) as { id: number; name: string; role: string }[];

  const locations = db
    .prepare(
      `SELECT id, name, description FROM campaign_locations
       WHERE campaign_id = ? AND (lower(name) LIKE ? OR lower(description) LIKE ?)
       ORDER BY name COLLATE NOCASE`
    )
    .all(campaignId, like, like) as { id: number; name: string; description: string }[];

  const sessions = db
    .prepare(
      `SELECT id, number, name FROM campaign_sessions
       WHERE campaign_id = ? AND (lower(name) LIKE ? OR lower(recap) LIKE ?)
       ORDER BY number DESC`
    )
    .all(campaignId, like, like) as { id: number; number: number; name: string }[];

  const ftsMatch = buildFtsQuery(trimmed);
  const notes = ftsMatch
    ? (db
        .prepare(
          `SELECT notes.id, notes.title FROM notes_fts
           JOIN notes ON notes.id = notes_fts.rowid
           WHERE notes.campaign_id = ? AND notes_fts MATCH ?
           ORDER BY rank`
        )
        .all(campaignId, ftsMatch) as { id: number; title: string }[])
    : [];

  return [
    ...npcs.map((n) => ({ type: "npc" as const, id: n.id, title: n.name, subtitle: n.role || "NPC" })),
    ...locations.map((l) => ({ type: "location" as const, id: l.id, title: l.name, subtitle: "Location" })),
    ...sessions.map((s) => ({
      type: "session" as const,
      id: s.id,
      title: `Session ${s.number}${s.name ? ` — ${s.name}` : ""}`,
      subtitle: "Session",
    })),
    ...notes.map((n) => ({ type: "note" as const, id: n.id, title: n.title, subtitle: "Note" })),
  ];
}
