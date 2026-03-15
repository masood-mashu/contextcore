import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR  = path.join(os.homedir(), '.contextcore');
const DB_PATH = path.join(DB_DIR, 'contextcore.db');

let instance: Database | null = null;

export async function getDB(): Promise<Database> {
  if (instance) return instance;

  // Ensure ~/.contextcore/ exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing DB from disk, or create a new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    instance = new SQL.Database(fileBuffer);
  } else {
    instance = new SQL.Database();
  }

  runMigrations(instance);
  console.log(`[DB] Connected: ${DB_PATH}`);
  return instance;
}

// Call this after every write to persist to disk
export function saveDB(): void {
  if (!instance) return;
  const data = instance.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export function closeDB(): void {
  if (instance) {
    saveDB();
    instance.close();
    instance = null;
  }
}

function runMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      type      TEXT    NOT NULL,
      source    TEXT    NOT NULL,
      payload   TEXT    NOT NULL DEFAULT '{}',
      processed INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);

    CREATE TABLE IF NOT EXISTS app_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name     TEXT    NOT NULL,
      window_title TEXT,
      started_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      ended_at     INTEGER
    );

    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      keywords    TEXT    NOT NULL DEFAULT '[]',
      color       TEXT    NOT NULL DEFAULT '#00f5c4',
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      last_active INTEGER
    );
    INSERT OR IGNORE INTO projects (name, keywords, color)
    VALUES ('General', '[]', '#888888');

    CREATE TABLE IF NOT EXISTS context_states (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      ts                      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      focus_state             TEXT    NOT NULL DEFAULT 'unknown',
      energy_level            TEXT    NOT NULL DEFAULT 'unknown',
      stress_level            TEXT    NOT NULL DEFAULT 'low',
      focus_score             REAL    NOT NULL DEFAULT 5.0,
      energy_score            REAL    NOT NULL DEFAULT 5.0,
      stress_score            REAL    NOT NULL DEFAULT 3.0,
      momentum_score          REAL    NOT NULL DEFAULT 5.0,
      active_project_id       INTEGER,
      active_app              TEXT,
      deep_work_minutes_today INTEGER NOT NULL DEFAULT 0,
      meetings_today          INTEGER NOT NULL DEFAULT 0,
      next_meeting_ts         INTEGER,
      inference_reason        TEXT    NOT NULL DEFAULT '',
      confidence              REAL    NOT NULL DEFAULT 0.5
    );
    CREATE INDEX IF NOT EXISTS idx_ctx_ts ON context_states(ts);

    CREATE TABLE IF NOT EXISTS mood_checkins (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      ts      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      mood    INTEGER NOT NULL,
      energy  INTEGER NOT NULL,
      note    TEXT,
      tags    TEXT    NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS mirrors (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      date         TEXT    NOT NULL UNIQUE,
      summary      TEXT    NOT NULL,
      generated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      model_used   TEXT    NOT NULL DEFAULT 'rule-based'
    );
  `);
  saveDB();
}