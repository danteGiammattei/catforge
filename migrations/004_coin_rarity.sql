-- MintForge migration v4 -> v5
-- Adds rarity column to coins table for the coherent rarity system.
-- Existing coins without a rarity will have one derived from their seed by the client
-- (deterministic, so the same coin always gets the same rarity).
-- Apply with: npx wrangler d1 execute mintforge --file=./migrations/004_coin_rarity.sql --remote

ALTER TABLE coins ADD COLUMN rarity INTEGER;
