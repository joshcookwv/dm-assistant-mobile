import { getDb } from "./db";

export interface BestiaryMonster {
  id: number;
  name: string;
  size: string;
  type: string;
  alignment: string;
  armor_class: number | null;
  hit_points: number | null;
  hit_dice: string;
  speed: string;
  challenge_rating: string;
  stat_block: string;
  source_note: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface BestiaryInput {
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  armor_class?: number | null;
  hit_points?: number | null;
  hit_dice?: string;
  speed?: string;
  challenge_rating?: string;
  stat_block?: string;
  source_note?: string;
  tags?: string;
}

export function listBestiary(query?: string): BestiaryMonster[] {
  const db = getDb();
  if (!query || !query.trim()) {
    return db.prepare("SELECT * FROM bestiary ORDER BY name COLLATE NOCASE").all() as BestiaryMonster[];
  }
  const q = `%${query.trim().toLowerCase()}%`;
  return db
    .prepare(
      `SELECT * FROM bestiary WHERE lower(name) LIKE ? OR lower(tags) LIKE ? ORDER BY name COLLATE NOCASE`
    )
    .all(q, q) as BestiaryMonster[];
}

export function getBestiaryMonster(id: number): BestiaryMonster | undefined {
  return getDb().prepare("SELECT * FROM bestiary WHERE id = ?").get(id) as
    | BestiaryMonster
    | undefined;
}

export function createBestiaryMonster(input: BestiaryInput): BestiaryMonster {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO bestiary
        (name, size, type, alignment, armor_class, hit_points, hit_dice, speed, challenge_rating, stat_block, source_note, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.size ?? "",
      input.type ?? "",
      input.alignment ?? "",
      input.armor_class ?? null,
      input.hit_points ?? null,
      input.hit_dice ?? "",
      input.speed ?? "",
      input.challenge_rating ?? "",
      input.stat_block ?? "",
      input.source_note ?? "",
      input.tags ?? ""
    );
  return getBestiaryMonster(result.lastInsertRowid as number)!;
}

export function updateBestiaryMonster(id: number, input: BestiaryInput): BestiaryMonster | undefined {
  const db = getDb();
  db.prepare(
    `UPDATE bestiary SET
       name = ?, size = ?, type = ?, alignment = ?, armor_class = ?, hit_points = ?,
       hit_dice = ?, speed = ?, challenge_rating = ?, stat_block = ?, source_note = ?, tags = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.name,
    input.size ?? "",
    input.type ?? "",
    input.alignment ?? "",
    input.armor_class ?? null,
    input.hit_points ?? null,
    input.hit_dice ?? "",
    input.speed ?? "",
    input.challenge_rating ?? "",
    input.stat_block ?? "",
    input.source_note ?? "",
    input.tags ?? "",
    id
  );
  return getBestiaryMonster(id);
}

export function deleteBestiaryMonster(id: number): void {
  getDb().prepare("DELETE FROM bestiary WHERE id = ?").run(id);
}
