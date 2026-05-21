-- MintForge migration v1 -> v2
-- Apply with:  npx wrangler d1 execute mintforge --file=./migrations/001_locked_friends.sql --remote

-- Add locked flag to coins (defaults to 0 for existing rows)
ALTER TABLE coins ADD COLUMN locked INTEGER NOT NULL DEFAULT 0;

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
  player_id  INTEGER NOT NULL,
  friend_id  INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, friend_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS friends_player_idx ON friends(player_id);
CREATE INDEX IF NOT EXISTS friends_friend_idx ON friends(friend_id);
