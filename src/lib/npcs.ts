import { getDb } from "./db";

export interface Npc {
  id: number;
  name: string;
  race: string;
  role: string;
  location: string;
  description: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface NpcInput {
  name: string;
  race?: string;
  role?: string;
  location?: string;
  description?: string;
  tags?: string;
}

export function listNpcs(query?: string): Npc[] {
  const db = getDb();
  if (!query || !query.trim()) {
    return db.prepare("SELECT * FROM npcs ORDER BY name COLLATE NOCASE").all() as Npc[];
  }
  const q = `%${query.trim().toLowerCase()}%`;
  return db
    .prepare(
      `SELECT * FROM npcs
       WHERE lower(name) LIKE ? OR lower(location) LIKE ? OR lower(tags) LIKE ?
       ORDER BY name COLLATE NOCASE`
    )
    .all(q, q, q) as Npc[];
}

export function getNpc(id: number): Npc | undefined {
  return getDb().prepare("SELECT * FROM npcs WHERE id = ?").get(id) as Npc | undefined;
}

export function createNpc(input: NpcInput): Npc {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO npcs (name, race, role, location, description, tags)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.race ?? "",
      input.role ?? "",
      input.location ?? "",
      input.description ?? "",
      input.tags ?? ""
    );
  return getNpc(result.lastInsertRowid as number)!;
}

export function updateNpc(id: number, input: NpcInput): Npc | undefined {
  const db = getDb();
  db.prepare(
    `UPDATE npcs SET name = ?, race = ?, role = ?, location = ?, description = ?, tags = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.name,
    input.race ?? "",
    input.role ?? "",
    input.location ?? "",
    input.description ?? "",
    input.tags ?? "",
    id
  );
  return getNpc(id);
}

export function deleteNpc(id: number): void {
  getDb().prepare("DELETE FROM npcs WHERE id = ?").run(id);
}
