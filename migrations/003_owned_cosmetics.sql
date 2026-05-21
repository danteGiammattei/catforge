-- MintForge migration v3 -> v4
-- Adds persistence for premium banner (frame) and title purchases.
-- Apply with:  npx wrangler d1 execute mintforge --file=./migrations/003_owned_cosmetics.sql --remote

ALTER TABLE player_state ADD COLUMN owned_frames TEXT;  -- JSON array of frame IDs
ALTER TABLE player_state ADD COLUMN owned_titles TEXT;  -- JSON array of premium title IDs
