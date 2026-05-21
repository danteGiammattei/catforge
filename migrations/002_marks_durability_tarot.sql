-- MintForge migration v2 -> v3
-- Adds currency (marks), pickaxe durability, and tarot card system.
-- Apply with:  npx wrangler d1 execute mintforge --file=./migrations/002_marks_durability_tarot.sql --remote

-- New scalar state columns. Defaults populate cleanly for existing players.
ALTER TABLE player_state ADD COLUMN marks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN shovel_dur INTEGER NOT NULL DEFAULT 40;
ALTER TABLE player_state ADD COLUMN equipped_tarots TEXT;  -- JSON array of card IDs

-- Cards owned by each player (one row per owned card; only one copy per card)
CREATE TABLE IF NOT EXISTS tarot_cards (
  player_id   INTEGER NOT NULL,
  card_id     TEXT    NOT NULL,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, card_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS tarot_cards_player_idx ON tarot_cards(player_id);
