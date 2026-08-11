import { getDb } from "./db";

export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string;
  campaign_id: number | null;
  location_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface NoteInput {
  title: string;
  content?: string;
  tags?: string;
  campaignId?: number | null;
  locationId?: number | null;
}

function buildFtsQuery(raw: string): string {
  const tokens = raw
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  // FTS5 still parses its own query grammar for bound MATCH parameters.
  // Quote each user token and escape embedded quotes so punctuation such as
  // periods, colons, dashes, and parentheses is always treated as text.
  return tokens.map((token) => `"${token.replace(/"/g, '""')}"*`).join(" ");
}

export function listNotes(query?: string): Note[] {
  const db = getDb();
  if (!query || !query.trim()) {
    return db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all() as Note[];
  }

  const match = buildFtsQuery(query);
  if (!match) {
    return db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all() as Note[];
  }

  return db
    .prepare(
      `SELECT notes.* FROM notes_fts
       JOIN notes ON notes.id = notes_fts.rowid
       WHERE notes_fts MATCH ?
       ORDER BY rank`
    )
    .all(match) as Note[];
}

export function listNotesByLocation(locationId: number): Note[] {
  return getDb()
    .prepare("SELECT * FROM notes WHERE location_id = ? ORDER BY updated_at DESC")
    .all(locationId) as Note[];
}

export function getNote(id: number): Note | undefined {
  return getDb().prepare("SELECT * FROM notes WHERE id = ?").get(id) as Note | undefined;
}

export function createNote(input: NoteInput): Note {
  const db = getDb();
  const result = db
    .prepare(`INSERT INTO notes (title, content, tags, campaign_id, location_id) VALUES (?, ?, ?, ?, ?)`)
    .run(input.title, input.content ?? "", input.tags ?? "", input.campaignId ?? null, input.locationId ?? null);
  return getNote(result.lastInsertRowid as number)!;
}

export function updateNote(id: number, input: NoteInput): Note | undefined {
  const db = getDb();
  db.prepare(
    `UPDATE notes SET title = ?, content = ?, tags = ?, campaign_id = ?, location_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(input.title, input.content ?? "", input.tags ?? "", input.campaignId ?? null, input.locationId ?? null, id);
  return getNote(id);
}

export function deleteNote(id: number): void {
  getDb().prepare("DELETE FROM notes WHERE id = ?").run(id);
}
