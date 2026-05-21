-- MintForge migration v5 -> v6
-- Adds the artefacts table for the Shrine system. Players forge artefacts by
-- combining 5 same-metal coins. Currently decorative — future updates will
-- give artefacts active effects (avatars, companions, passive buffs).
-- Apply with: npx wrangler d1 execute mintforge --file=./migrations/005_artefacts.sql --remote

CREATE TABLE IF NOT EXISTS artefacts (
  id          TEXT    NOT NULL,
  player_id   INTEGER NOT NULL,
  metal       INTEGER NOT NULL,        -- 0=Copper .. 8=Astral
  grade       INTEGER NOT NULL DEFAULT 0,  -- 0=Worn .. 4=Ascendant
  forged_at   INTEGER NOT NULL,
  PRIMARY KEY (player_id, id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS artefacts_player_idx ON artefacts(player_id);
