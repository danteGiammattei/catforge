-- ============================================================================
-- CATFORGE — initial schema (v2)
-- ============================================================================
-- Schema aligned with what the existing auth + friends + users Workers query.
-- player_state is catforge-shape (xp + field_state JSON + cosmetics JSON),
-- not MintForge's wide row of dig-system columns.
--
-- Apply with:
--   npx wrangler d1 execute catforgedb --file=migrations/001_init.sql --remote
-- ============================================================================

CREATE TABLE IF NOT EXISTS players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_state (
  player_id    INTEGER PRIMARY KEY,
  xp           INTEGER DEFAULT 0,
  -- All field/building/cat state as JSON. Flexible — no migration needed
  -- when adding building types or cat variants. Example shape:
  --   { "buildings":[{"id":"mine_1","type":"copper","level":1,"cat":"calico"}],
  --     "lastTick": 1716180000000 }
  field_state  TEXT DEFAULT '{}',
  -- Cosmetic + currency overlay (marks lives here for now).
  cosmetics    TEXT DEFAULT '{}',
  updated_at   INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coins (
  id          TEXT PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  seed        INTEGER NOT NULL,
  metal_idx   INTEGER NOT NULL,
  rarity      INTEGER NOT NULL DEFAULT 0,
  shiny       INTEGER DEFAULT 0,
  locked      INTEGER DEFAULT 0,
  pinned      INTEGER DEFAULT 0,
  found_at    INTEGER NOT NULL,
  source      TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Friendships — directed edges to match the existing Workers' query shape.
-- Add a row in each direction for mutual friendship; or treat as follow-style.
CREATE TABLE IF NOT EXISTS friends (
  player_id   INTEGER NOT NULL,
  friend_id   INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (player_id, friend_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coins_player    ON coins(player_id);
CREATE INDEX IF NOT EXISTS idx_coins_found_at  ON coins(found_at);
CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend  ON friends(friend_id);
