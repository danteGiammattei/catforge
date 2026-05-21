-- ============================================================================
-- CATFORGE — initial schema
-- ============================================================================
-- Minimal tables for an idle coin-mining game. Fork-friendly: keeps coin
-- storage compatible with the procedural renderer (just needs seed +
-- metal_idx + rarity + shiny), and stashes everything else (buildings,
-- cats, idle progress) in a single `field_state` JSON blob to avoid
-- needing migrations every time you add a building or cat variant.
--
-- Apply with:
--   npx wrangler d1 execute catforge-db --file=migrations/001_init.sql --remote
-- ============================================================================

CREATE TABLE IF NOT EXISTS players (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT UNIQUE NOT NULL,
  pw_hash     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_state (
  player_id    INTEGER PRIMARY KEY,
  xp           INTEGER DEFAULT 0,
  -- All field/building/cat state as JSON. Flexible — no migration needed
  -- when adding building types or cat variants. Example shape:
  --   { "buildings": [{"id":"mine_1","type":"copper","level":1,"cat":"calico"}],
  --     "lastTick": 1716180000000 }
  field_state  TEXT DEFAULT '{}',
  -- Cosmetic overlay — banner, frame, title, bio. Optional features.
  cosmetics    TEXT DEFAULT '{}',
  updated_at   INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coins (
  id          TEXT PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  seed        INTEGER NOT NULL,
  metal_idx   INTEGER NOT NULL,
  rarity      INTEGER NOT NULL,
  shiny       INTEGER DEFAULT 0,
  locked      INTEGER DEFAULT 0,
  pinned      INTEGER DEFAULT 0,
  found_at    INTEGER NOT NULL,
  source      TEXT,  -- which building dropped it, if you care
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Friendships — kept simple, just two-way edges. Both players must accept.
CREATE TABLE IF NOT EXISTS friends (
  player_a    INTEGER NOT NULL,
  player_b    INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'accepted',  -- 'pending' | 'accepted'
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (player_a, player_b),
  FOREIGN KEY (player_a) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (player_b) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coins_player    ON coins(player_id);
CREATE INDEX IF NOT EXISTS idx_coins_found_at  ON coins(found_at);
CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_friends_b       ON friends(player_b);
