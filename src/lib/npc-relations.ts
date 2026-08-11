import { getDb } from "./db";

export interface NpcRelation {
  id: number;
  npcId: number;
  relatedNpcId: number;
  relationType: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** A relationship from the perspective of one NPC, with the *other* side resolved to a name. */
export interface NpcRelationDetail extends NpcRelation {
  otherNpcId: number;
  otherNpcName: string;
}

export interface NpcRelationInput {
  npcId: number;
  relatedNpcId: number;
  relationType?: string;
  notes?: string;
}

interface NpcRelationRow {
  id: number;
  npc_id: number;
  related_npc_id: number;
  relation_type: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function rowToRelation(row: NpcRelationRow): NpcRelation {
  return {
    id: row.id,
    npcId: row.npc_id,
    relatedNpcId: row.related_npc_id,
    relationType: row.relation_type,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Every relationship touching this NPC, from either side, for the NPC detail screen. */
export function listRelationsForNpc(npcId: number): NpcRelationDetail[] {
  const rows = getDb()
    .prepare(
      `SELECT r.*,
              CASE WHEN r.npc_id = ? THEN r.related_npc_id ELSE r.npc_id END AS otherNpcId,
              CASE WHEN r.npc_id = ? THEN other2.name ELSE other1.name END AS otherNpcName
       FROM npc_relations r
       JOIN npcs other1 ON other1.id = r.npc_id
       JOIN npcs other2 ON other2.id = r.related_npc_id
       WHERE r.npc_id = ? OR r.related_npc_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(npcId, npcId, npcId, npcId) as (NpcRelationRow & { otherNpcId: number; otherNpcName: string })[];
  return rows.map((row) => ({ ...rowToRelation(row), otherNpcId: row.otherNpcId, otherNpcName: row.otherNpcName }));
}

export function createNpcRelation(input: NpcRelationInput): NpcRelation {
  const result = getDb()
    .prepare(`INSERT INTO npc_relations (npc_id, related_npc_id, relation_type, notes) VALUES (?, ?, ?, ?)`)
    .run(input.npcId, input.relatedNpcId, input.relationType ?? "", input.notes ?? "");
  const row = getDb()
    .prepare("SELECT * FROM npc_relations WHERE id = ?")
    .get(result.lastInsertRowid) as NpcRelationRow;
  return rowToRelation(row);
}

export function deleteNpcRelation(id: number): void {
  getDb().prepare("DELETE FROM npc_relations WHERE id = ?").run(id);
}
