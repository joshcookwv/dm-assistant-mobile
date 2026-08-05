import * as SQLite from "expo-sqlite";

function initSchema(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS npcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      race TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title, content, tags, content='notes', content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, content, tags) VALUES (new.id, new.title, new.content, new.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, content, tags) VALUES ('delete', old.id, old.title, old.content, old.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, content, tags) VALUES ('delete', old.id, old.title, old.content, old.tags);
      INSERT INTO notes_fts(rowid, title, content, tags) VALUES (new.id, new.title, new.content, new.tags);
    END;

    CREATE TABLE IF NOT EXISTS encounters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      active_index INTEGER NOT NULL DEFAULT 0,
      combatants TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('image', 'link')),
      file_path TEXT,
      url TEXT,
      notes TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bestiary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      alignment TEXT NOT NULL DEFAULT '',
      armor_class INTEGER,
      hit_points INTEGER,
      hit_dice TEXT NOT NULL DEFAULT '',
      speed TEXT NOT NULL DEFAULT '',
      challenge_rating TEXT NOT NULL DEFAULT '',
      stat_block TEXT NOT NULL DEFAULT '',
      source_note TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function createConnection(): SQLite.SQLiteDatabase {
  const db = SQLite.openDatabaseSync("app.db");
  db.execSync("PRAGMA journal_mode = WAL;");
  db.execSync("PRAGMA foreign_keys = ON;");
  initSchema(db);
  return db;
}

// A plain module-scoped singleton is enough here — unlike the Next.js server
// (where `global.__dmDb` worked around dev-server module reinitialization),
// RN modules only load once per app process.
const database = createConnection();

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export interface Statement {
  all<T = unknown>(...params: unknown[]): T[];
  get<T = unknown>(...params: unknown[]): T | undefined;
  run(...params: unknown[]): RunResult;
}

/**
 * Thin shim over expo-sqlite's sync API shaped like better-sqlite3's
 * `db.prepare(sql).all/get/run(...)`, so the rest of the data layer ports
 * from the Next.js app's lib/*.ts files with no changes beyond this file.
 */
function prepare(sql: string): Statement {
  return {
    all: <T>(...params: unknown[]) =>
      database.getAllSync<T>(sql, ...(params as SQLite.SQLiteVariadicBindParams)),
    get: <T>(...params: unknown[]) =>
      database.getFirstSync<T>(sql, ...(params as SQLite.SQLiteVariadicBindParams)) ?? undefined,
    run: (...params: unknown[]) => {
      const result = database.runSync(sql, ...(params as SQLite.SQLiteVariadicBindParams));
      return { lastInsertRowid: result.lastInsertRowId, changes: result.changes };
    },
  };
}

export function getDb() {
  return { prepare, exec: (sql: string) => database.execSync(sql) };
}
