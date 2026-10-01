import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  level TEXT,
  goal TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0,
  wallet_address TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL DEFAULT 'en',
  level TEXT,
  goal TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  client_message_id TEXT,
  mode TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_client ON messages(conversation_id, client_message_id, role);
CREATE TABLE IF NOT EXISTS progress (
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL DEFAULT 'chat',
  practice_index INTEGER NOT NULL DEFAULT 0,
  results_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_type, owner_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  price_lamports INTEGER NOT NULL,
  mint TEXT NOT NULL,
  network TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payer TEXT,
  status TEXT NOT NULL,
  signature TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_sig ON purchases(network, signature) WHERE signature IS NOT NULL;
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  purchase_id TEXT NOT NULL UNIQUE,
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  UNIQUE(user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS wallet_challenges (
  nonce TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS quotas (
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  PRIMARY KEY (owner_type, owner_id)
);
CREATE TABLE IF NOT EXISTS email_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_codes ON email_codes(email, type, code);
`;

export type AppDatabase = DatabaseSync;

const globalDb = globalThis as unknown as { melearnDb?: DatabaseSync };

const profileSchemaReady = new WeakSet<DatabaseSync>();

function ensureProfileSchema(db: DatabaseSync) {
  if (profileSchemaReady.has(db)) return;
  const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  for (const column of ["avatar_url", "education_stage", "preferred_subject", "google_uid", "email", "email_verified"]) {
    if (!columns.some(existing => existing.name === column)) db.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_uid ON users(google_uid) WHERE google_uid IS NOT NULL");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL");
  db.exec(`CREATE TABLE IF NOT EXISTS email_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    payload_json TEXT,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  const emailCodeColumns = db.prepare("PRAGMA table_info(email_codes)").all() as Array<{ name: string }>;
  if (!emailCodeColumns.some(existing => existing.name === "attempts")) {
    db.exec("ALTER TABLE email_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_email_codes ON email_codes(email, type, code)");
  profileSchemaReady.add(db);
}

export function openDatabase(filename: string) {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON");
  if (filename !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  db.exec("PRAGMA busy_timeout = 3000");
  db.exec(SCHEMA);
  ensureProfileSchema(db);
  return db;
}

export function getDb() {
  if (!globalDb.melearnDb) {
    const filename = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "melearn.db");
    globalDb.melearnDb = openDatabase(filename);
  }
  ensureProfileSchema(globalDb.melearnDb);
  return globalDb.melearnDb;
}

let transactionSequence = 0;

export function withTransaction<T>(db: DatabaseSync, run: () => T) {
  const savepoint = `melearn_tx_${++transactionSequence}`;
  db.exec(`SAVEPOINT ${savepoint}`);
  try {
    const value = run();
    db.exec(`RELEASE SAVEPOINT ${savepoint}`);
    return value;
  } catch (error) {
    try {
      db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      db.exec(`RELEASE SAVEPOINT ${savepoint}`);
    } catch {
      /* already closed */
    }
    throw error;
  }
}
