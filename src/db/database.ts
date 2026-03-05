import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

const DEFAULT_DB_DIR = join(homedir(), '.secure-notes');
const DB_DIR = process.env.SECURE_NOTES_HOME || DEFAULT_DB_DIR;
const DB_PATH = join(DB_DIR, 'notes.db');

export function getDatabasePath(): string {
  return DB_PATH;
}

export function ensureDatabaseDir(): void {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
  }
}

export function createDatabase(): Database {
  ensureDatabaseDir();
  const db = new Database(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

export function initializeSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      encrypted INTEGER DEFAULT 0,
      encrypted_content TEXT,
      encryption_salt TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      unlocked_at INTEGER,
      last_activity INTEGER
    );

    INSERT OR IGNORE INTO session (id, unlocked_at, last_activity) VALUES (1, NULL, NULL);
  `);
}

export function getDatabase(): Database {
  const db = createDatabase();
  initializeSchema(db);
  return db;
}
