-- Initial D1 schema. Apply to a new database before importing existing records.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  level TEXT,
  goal TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0,
  wallet_address TEXT,
  avatar_url TEXT,
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
