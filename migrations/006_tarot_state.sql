-- MintForge migration v6 -> v7
-- Adds tarot run-state columns:
--   find_streak     — counter for Wheel of Fortune (every Nth find guaranteed Rare+)
--   hanged_man_date — ISO date string of last Hanged Man reroll use (daily limit)
-- Apply with: npx wrangler d1 execute mintforge --file=./migrations/006_tarot_state.sql --remote

ALTER TABLE player_state ADD COLUMN find_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN hanged_man_date TEXT NOT NULL DEFAULT '';
