ALTER TABLE users ADD COLUMN google_uid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_uid ON users(google_uid) WHERE google_uid IS NOT NULL;
