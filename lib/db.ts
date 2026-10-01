import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

type SqlValue = string | number | null | Uint8Array;

export type AppStatement = {
  get<T = Record<string, unknown>>(...params: SqlValue[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(...params: SqlValue[]): Promise<T[]>;
  run(...params: SqlValue[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
};

export type AppDatabase = {
  prepare(sql: string): AppStatement;
  transaction<T>(run: () => Promise<T>): Promise<T>;
};

type D1PreparedStatementLike = {
  bind(...params: SqlValue[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
};
type CloudflareEnv = { DB?: { prepare(sql: string): D1PreparedStatementLike } };

class D1Statement implements AppStatement {
  constructor(private readonly statement: D1PreparedStatementLike) {}

  async get<T = Record<string, unknown>>(...params: SqlValue[]) {
    return (await this.statement.bind(...params).first<T>()) ?? undefined;
  }

  async all<T = Record<string, unknown>>(...params: SqlValue[]) {
    const result = await this.statement.bind(...params).all<T>();
    return result.results;
  }

  async run(...params: SqlValue[]) {
    const result = await this.statement.bind(...params).run();
    return { changes: result.meta.changes, lastInsertRowid: result.meta.last_row_id };
  }
}

class D1Database implements AppDatabase {
  constructor(private readonly database: NonNullable<CloudflareEnv["DB"]>) {}

  prepare(sql: string) {
    return new D1Statement(this.database.prepare(sql));
  }

  async transaction<T>(run: () => Promise<T>) {
    // D1 statements are awaited in order. Multi-statement atomic work should
    // use D1 batch explicitly when the application path is hardened further.
    return run();
  }
}

class SqliteStatement implements AppStatement {
  constructor(private readonly statement: ReturnType<DatabaseSync["prepare"]>) {}

  async get<T = Record<string, unknown>>(...params: SqlValue[]) {
    return this.statement.get(...params) as T | undefined;
  }

  async all<T = Record<string, unknown>>(...params: SqlValue[]) {
    return this.statement.all(...params) as T[];
  }

  async run(...params: SqlValue[]) {
    const result = this.statement.run(...params);
    return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
  }
}

class SqliteDatabase implements AppDatabase {
  constructor(private readonly database: DatabaseSync) {}

  prepare(sql: string) {
    return new SqliteStatement(this.database.prepare(sql));
  }

  exec(sql: string) {
    this.database.exec(sql);
  }

  close() {
    this.database.close();
  }

  async transaction<T>(run: () => Promise<T>) {
    const savepoint = `melearn_tx_${++transactionSequence}`;
    this.database.exec(`SAVEPOINT ${savepoint}`);
    try {
      const value = await run();
      this.database.exec(`RELEASE SAVEPOINT ${savepoint}`);
      return value;
    } catch (error) {
      try {
        this.database.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        this.database.exec(`RELEASE SAVEPOINT ${savepoint}`);
      } catch {
        // The database may already be closed.
      }
      throw error;
    }
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en', level TEXT, goal TEXT, onboarded INTEGER NOT NULL DEFAULT 0, wallet_address TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS guests (id TEXT PRIMARY KEY, locale TEXT NOT NULL DEFAULT 'en', level TEXT, goal TEXT, onboarded INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, owner_type TEXT NOT NULL, owner_id TEXT NOT NULL, teacher_id TEXT NOT NULL, lesson_id TEXT NOT NULL, title TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL, client_message_id TEXT, mode TEXT, created_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_client ON messages(conversation_id, client_message_id, role);
CREATE TABLE IF NOT EXISTS progress (owner_type TEXT NOT NULL, owner_id TEXT NOT NULL, lesson_id TEXT NOT NULL, lesson_version INTEGER NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, hints_used INTEGER NOT NULL DEFAULT 0, phase TEXT NOT NULL DEFAULT 'chat', practice_index INTEGER NOT NULL DEFAULT 0, results_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL, PRIMARY KEY (owner_type, owner_id, lesson_id));
CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, price_lamports INTEGER NOT NULL, mint TEXT NOT NULL, network TEXT NOT NULL, recipient TEXT NOT NULL, payer TEXT, status TEXT NOT NULL, signature TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_sig ON purchases(network, signature) WHERE signature IS NOT NULL;
CREATE TABLE IF NOT EXISTS entitlements (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, purchase_id TEXT NOT NULL UNIQUE, starts_at TEXT NOT NULL, expires_at TEXT, UNIQUE(user_id, lesson_id));
CREATE TABLE IF NOT EXISTS wallet_challenges (nonce TEXT PRIMARY KEY, user_id TEXT NOT NULL, message TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS quotas (owner_type TEXT NOT NULL, owner_id TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL, bonus INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (owner_type, owner_id));
CREATE TABLE IF NOT EXISTS email_codes (id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, code TEXT NOT NULL, type TEXT NOT NULL, payload_json TEXT, expires_at INTEGER NOT NULL, used_at INTEGER, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_email_codes ON email_codes(email, type, code);
`;

const globalState = globalThis as unknown as { melearnDb?: AppDatabase; cloudflareDb?: Promise<AppDatabase | null> };
const profileSchemaReady = new WeakSet<object>();
let transactionSequence = 0;

async function cloudflareDatabase() {
  if (!globalState.cloudflareDb) {
    globalState.cloudflareDb = import("@opennextjs/cloudflare")
      .then(async ({ getCloudflareContext }) => {
        try {
          const context = (await getCloudflareContext({ async: true })) as unknown as { env?: CloudflareEnv };
          return context.env?.DB ? new D1Database(context.env.DB) : null;
        } catch {
          return null;
        }
      })
      .catch(() => null);
  }
  return globalState.cloudflareDb;
}

function ensureProfileSchema(db: DatabaseSync) {
  if (profileSchemaReady.has(db)) return;
  const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  for (const column of ["avatar_url", "education_stage", "preferred_subject", "google_uid", "email", "email_verified"]) {
    if (!columns.some(existing => existing.name === column)) db.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_uid ON users(google_uid) WHERE google_uid IS NOT NULL");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL");
  const quotaColumns = db.prepare("PRAGMA table_info(quotas)").all() as Array<{ name: string }>;
  if (!quotaColumns.some(existing => existing.name === "bonus")) db.exec("ALTER TABLE quotas ADD COLUMN bonus INTEGER NOT NULL DEFAULT 0");
  db.exec(SCHEMA);
  const emailCodeColumns = db.prepare("PRAGMA table_info(email_codes)").all() as Array<{ name: string }>;
  if (!emailCodeColumns.some(existing => existing.name === "attempts")) db.exec("ALTER TABLE email_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0");
  db.exec("CREATE INDEX IF NOT EXISTS idx_email_codes ON email_codes(email, type, code)");
  const conversationColumns = db.prepare("PRAGMA table_info(conversations)").all() as Array<{ name: string }>;
  if (!conversationColumns.some(column => column.name === "title")) db.exec("ALTER TABLE conversations ADD COLUMN title TEXT");
  profileSchemaReady.add(db);
}

export function openDatabase(filename: string) {
  if (filename !== ":memory:") fs.mkdirSync(path.dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON");
  if (filename !== ":memory:") database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA busy_timeout = 3000");
  database.exec(SCHEMA);
  ensureProfileSchema(database);
  return new SqliteDatabase(database);
}

const conversationSchemaChecks = new WeakMap<AppDatabase, Promise<void>>();

export async function getDb() {
  const remote = await cloudflareDatabase();
  if (remote) return remote;
  if (!globalState.melearnDb) {
    const filename = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "melearn.db");
    globalState.melearnDb = openDatabase(filename);
  }
  const db = globalState.melearnDb;
  let schemaCheck = conversationSchemaChecks.get(db);
  if (!schemaCheck) {
    schemaCheck = (async () => {
      const columns = await db.prepare("PRAGMA table_info(conversations)").all<{ name: string }>();
      if (!columns.some(column => column.name === "title")) await db.prepare("ALTER TABLE conversations ADD COLUMN title TEXT").run();
    })();
    conversationSchemaChecks.set(db, schemaCheck);
  }
  await schemaCheck;
  return db;
}

export function withTransaction<T>(db: AppDatabase, run: () => Promise<T>) {
  return db.transaction(run);
}
