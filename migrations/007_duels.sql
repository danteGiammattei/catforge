-- MintForge migration v7 -> v8
-- Adds the duels table — friend-vs-friend coin battles. Each duel stakes one
-- coin per player; winner takes both via a deterministic best-of-3 flip.
--
-- Lifecycle:
--   pending   — challenger created it, waiting for challenged to set their stake
--   ready     — both stakes locked in, waiting for either side to tap "Flip"
--   resolved  — flips have run, winner has taken both coins (recorded for history)
--   declined  — one side declined or it expired
--
-- The `flip_seed` column stores the deterministic randomness source generated
-- server-side at flip time. This makes the result auditable — given the seed,
-- anyone can verify the three flips that occurred.
--
-- Apply with: npx wrangler d1 execute mintforge --file=./migrations/007_duels.sql --remote

CREATE TABLE IF NOT EXISTS duels (
  id              TEXT    PRIMARY KEY,           -- short hex string
  challenger_id   INTEGER NOT NULL,              -- player who initiated
  challenged_id   INTEGER NOT NULL,              -- player who was challenged
  challenger_coin TEXT,                          -- coin id staked by challenger (NULL until set)
  challenged_coin TEXT,                          -- coin id staked by challenged (NULL until set)
  status          TEXT    NOT NULL DEFAULT 'pending',  -- pending | ready | resolved | declined
  flip_seed       TEXT,                          -- hex seed generated at resolve time
  flip_results    TEXT,                          -- JSON array of three booleans (true=challenger won that flip)
  winner_id       INTEGER,                       -- final winner — either challenger_id or challenged_id
  created_at      INTEGER NOT NULL,
  resolved_at     INTEGER,                       -- timestamp when flipped or declined
  expires_at      INTEGER NOT NULL,              -- 48h after creation by default

  FOREIGN KEY (challenger_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (challenged_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Look up duels involving a player quickly (their inbox + outbox)
CREATE INDEX IF NOT EXISTS duels_challenger_idx ON duels(challenger_id);
CREATE INDEX IF NOT EXISTS duels_challenged_idx ON duels(challenged_id);
CREATE INDEX IF NOT EXISTS duels_status_idx ON duels(status);
