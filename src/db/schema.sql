PRAGMA foreign_keys = ON;

BEGIN;

-- Users imported from assets/users.json
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT,
  username TEXT UNIQUE,
  avatar TEXT,
  relationship TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_relationship ON users(relationship);

COMMIT;
