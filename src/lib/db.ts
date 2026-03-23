import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "comedy.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comedians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      credits TEXT,
      headshot_url TEXT,
      website_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      venue_room TEXT NOT NULL,
      lineup_id TEXT,
      reservation_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date, time, venue_room)
    );

    CREATE TABLE IF NOT EXISTS show_comedians (
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      comedian_id INTEGER NOT NULL REFERENCES comedians(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (show_id, comedian_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      google_id TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comedian_id INTEGER NOT NULL REFERENCES comedians(id) ON DELETE CASCADE,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, comedian_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comedian_id INTEGER NOT NULL REFERENCES comedians(id) ON DELETE CASCADE,
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      sent_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations
  const cols = db.prepare("PRAGMA table_info(comedians)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "bio")) {
    db.exec("ALTER TABLE comedians ADD COLUMN bio TEXT");
  }
}
