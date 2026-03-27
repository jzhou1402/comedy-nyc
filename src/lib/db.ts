import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "comedy.db")
  : path.join(process.cwd(), "comedy.db");

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

  const comedianCols2 = db.prepare("PRAGMA table_info(comedians)").all() as { name: string }[];
  if (!comedianCols2.some((c) => c.name === "instagram_url")) {
    db.exec("ALTER TABLE comedians ADD COLUMN instagram_url TEXT");
  }
  if (!comedianCols2.some((c) => c.name === "twitter_url")) {
    db.exec("ALTER TABLE comedians ADD COLUMN twitter_url TEXT");
  }
  if (!comedianCols2.some((c) => c.name === "tiktok_url")) {
    db.exec("ALTER TABLE comedians ADD COLUMN tiktok_url TEXT");
  }
  if (!comedianCols2.some((c) => c.name === "youtube_url")) {
    db.exec("ALTER TABLE comedians ADD COLUMN youtube_url TEXT");
  }

  const showCols = db.prepare("PRAGMA table_info(shows)").all() as { name: string }[];
  if (!showCols.some((c) => c.name === "venue")) {
    db.exec("ALTER TABLE shows ADD COLUMN venue TEXT DEFAULT 'Comedy Cellar'");
  }

  // Locations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      venue TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL
    )
  `);

  // Seed known locations
  const locCount = (db.prepare("SELECT COUNT(*) as c FROM locations").get() as { c: number }).c;
  if (locCount === 0) {
    const insertLoc = db.prepare("INSERT OR IGNORE INTO locations (name, venue, address, lat, lng) VALUES (?, ?, ?, ?, ?)");
    insertLoc.run("MacDougal Street", "Comedy Cellar", "117 MacDougal St, New York, NY 10012", 40.73019, -74.00041);
    insertLoc.run("Village Underground", "Comedy Cellar", "130 W 3rd St, New York, NY 10012", 40.73095, -74.00098);
    insertLoc.run("Fat Black Pussycat", "Comedy Cellar", "117 MacDougal St, New York, NY 10012", 40.73025, -74.00035);
    insertLoc.run("The Stand - Upstairs", "The Stand", "116 E 16th St, New York, NY 10003", 40.73607, -73.98876);
    insertLoc.run("The Stand - Main room", "The Stand", "116 E 16th St, New York, NY 10003", 40.73613, -73.98870);
    insertLoc.run("NYCC - Midtown", "New York Comedy Club", "241 E 24th St, New York, NY 10010", 40.73942, -73.98130);
    insertLoc.run("NYCC - East Village", "New York Comedy Club", "85 E 4th St, New York, NY 10003", 40.72640, -73.98950);
    insertLoc.run("NYCC - Upper West Side", "New York Comedy Club", "236 W 78th St, New York, NY 10024", 40.78110, -73.97880);
  }

  // User shows (I'm going / I went)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_shows (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'going',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, show_id)
    )
  `);

  // Venue requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS venue_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_input TEXT NOT NULL,
      normalized_name TEXT,
      normalized_address TEXT,
      normalized_website TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
