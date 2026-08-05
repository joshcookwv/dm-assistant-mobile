import { getDb } from "./db";

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  maxHp: number;
  currentHp: number;
  ac: number | null;
  conditions: string;
  isPc: boolean;
}

export interface Encounter {
  id: number;
  name: string;
  round: number;
  active_index: number;
  combatants: Combatant[];
  created_at: string;
  updated_at: string;
}

interface EncounterRow {
  id: number;
  name: string;
  round: number;
  active_index: number;
  combatants: string;
  created_at: string;
  updated_at: string;
}

export interface EncounterUpdateInput {
  name: string;
  round: number;
  active_index: number;
  combatants: Combatant[];
}

function rowToEncounter(row: EncounterRow): Encounter {
  return {
    ...row,
    combatants: JSON.parse(row.combatants) as Combatant[],
  };
}

export function listEncounters(): Encounter[] {
  const rows = getDb()
    .prepare("SELECT * FROM encounters ORDER BY updated_at DESC")
    .all() as EncounterRow[];
  return rows.map(rowToEncounter);
}

export function getEncounter(id: number): Encounter | undefined {
  const row = getDb().prepare("SELECT * FROM encounters WHERE id = ?").get(id) as
    | EncounterRow
    | undefined;
  return row ? rowToEncounter(row) : undefined;
}

export function createEncounter(name: string): Encounter {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO encounters (name, round, active_index, combatants) VALUES (?, 1, 0, '[]')`
    )
    .run(name);
  return getEncounter(result.lastInsertRowid as number)!;
}

export function updateEncounter(
  id: number,
  input: EncounterUpdateInput
): Encounter | undefined {
  const db = getDb();
  db.prepare(
    `UPDATE encounters SET name = ?, round = ?, active_index = ?, combatants = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(input.name, input.round, input.active_index, JSON.stringify(input.combatants), id);
  return getEncounter(id);
}

export function deleteEncounter(id: number): void {
  getDb().prepare("DELETE FROM encounters WHERE id = ?").run(id);
}
