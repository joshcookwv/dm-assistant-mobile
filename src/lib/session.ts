import * as Crypto from "expo-crypto";

import { getDb } from "./db";
import type { Combatant } from "./encounters";

export interface Session {
  id: number;
  name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SessionSummary extends Session {
  /** Distinct staged entries. */
  memberCount: number;
  /** Combatants this session would produce, counting quantities. */
  combatantCount: number;
  pcCount: number;
}

export interface SessionMember {
  id: number;
  sessionId: number;
  name: string;
  maxHp: number;
  ac: number | null;
  isPc: boolean;
  quantity: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMemberInput {
  sessionId: number;
  name: string;
  maxHp?: number;
  ac?: number | null;
  isPc?: boolean;
  quantity?: number;
  notes?: string;
}

interface SessionMemberRow {
  id: number;
  session_id: number;
  name: string;
  max_hp: number;
  ac: number | null;
  is_pc: number;
  quantity: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

// SQLite has no boolean type, so is_pc round-trips as 0/1.
function rowToMember(row: SessionMemberRow): SessionMember {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    maxHp: row.max_hp,
    ac: row.ac,
    isPc: row.is_pc === 1,
    quantity: row.quantity,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/* ---------------------------------------------------------------- sessions */

export function listSessions(): SessionSummary[] {
  return getDb()
    .prepare(
      `SELECT s.*,
              COUNT(m.id) AS memberCount,
              COALESCE(SUM(m.quantity), 0) AS combatantCount,
              COALESCE(SUM(m.is_pc), 0) AS pcCount
       FROM sessions s
       LEFT JOIN session_members m ON m.session_id = s.id
       GROUP BY s.id
       ORDER BY s.updated_at DESC`
    )
    .all() as SessionSummary[];
}

export function getSession(id: number): Session | undefined {
  return getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Session | undefined;
}

export function createSession(name: string, notes = ""): Session {
  const result = getDb()
    .prepare("INSERT INTO sessions (name, notes) VALUES (?, ?)")
    .run(name, notes);
  return getSession(result.lastInsertRowid as number)!;
}

export function updateSession(id: number, name: string, notes = ""): Session | undefined {
  getDb()
    .prepare("UPDATE sessions SET name = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name, notes, id);
  return getSession(id);
}

export function deleteSession(id: number): void {
  const db = getDb();
  // Removing members explicitly rather than relying on ON DELETE CASCADE — the
  // migrated table from the single-roster build has no foreign key constraint.
  db.prepare("DELETE FROM session_members WHERE session_id = ?").run(id);
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

/* ----------------------------------------------------------------- members */

export function listSessionMembers(sessionId: number): SessionMember[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM session_members WHERE session_id = ? ORDER BY is_pc DESC, name COLLATE NOCASE"
    )
    .all(sessionId) as SessionMemberRow[];
  return rows.map(rowToMember);
}

export function getSessionMember(id: number): SessionMember | undefined {
  const row = getDb().prepare("SELECT * FROM session_members WHERE id = ?").get(id) as
    | SessionMemberRow
    | undefined;
  return row ? rowToMember(row) : undefined;
}

// Any member change also bumps the parent session so the list stays ordered by
// what the DM actually touched most recently.
function touchSession(sessionId: number) {
  getDb()
    .prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?")
    .run(sessionId);
}

export function createSessionMember(input: SessionMemberInput): SessionMember {
  const result = getDb()
    .prepare(
      `INSERT INTO session_members (session_id, name, max_hp, ac, is_pc, quantity, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.sessionId,
      input.name,
      input.maxHp ?? 0,
      input.ac ?? null,
      input.isPc ? 1 : 0,
      Math.max(1, input.quantity ?? 1),
      input.notes ?? ""
    );
  touchSession(input.sessionId);
  return getSessionMember(result.lastInsertRowid as number)!;
}

export function updateSessionMember(
  id: number,
  input: SessionMemberInput
): SessionMember | undefined {
  getDb()
    .prepare(
      `UPDATE session_members
       SET name = ?, max_hp = ?, ac = ?, is_pc = ?, quantity = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.name,
      input.maxHp ?? 0,
      input.ac ?? null,
      input.isPc ? 1 : 0,
      Math.max(1, input.quantity ?? 1),
      input.notes ?? "",
      id
    );
  touchSession(input.sessionId);
  return getSessionMember(id);
}

export function deleteSessionMember(id: number): void {
  const member = getSessionMember(id);
  getDb().prepare("DELETE FROM session_members WHERE id = ?").run(id);
  if (member) touchSession(member.sessionId);
}

/**
 * Expands staged members into encounter combatants. A member with quantity > 1
 * becomes numbered copies ("Goblin 1", "Goblin 2", …) so they stay tellable
 * apart once HP starts diverging. Initiative is left at 0 — it gets rolled at
 * the table, not during prep.
 */
export function membersToCombatants(members: SessionMember[]): Combatant[] {
  const combatants: Combatant[] = [];
  for (const member of members) {
    for (let i = 0; i < Math.max(1, member.quantity); i++) {
      combatants.push({
        id: Crypto.randomUUID(),
        name: member.quantity > 1 ? `${member.name} ${i + 1}` : member.name,
        initiative: 0,
        maxHp: member.maxHp,
        currentHp: member.maxHp,
        ac: member.ac,
        conditions: "",
        isPc: member.isPc,
      });
    }
  }
  return combatants;
}
