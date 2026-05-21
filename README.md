# MintForge

Hunt, forge, and gamble ancient coins from lost civilisations.
Runs on Cloudflare Pages + D1.

## Architecture

- **Frontend** — Vite + React, built into `dist/`
- **API** — Cloudflare Pages Functions (`functions/api/...`)
- **Storage** — D1 (SQLite), bound as `DB`
- **Auth** — username + 4-6 digit PIN, PBKDF2-hashed, session tokens in `localStorage`

All API routes are same-origin; no separate Worker.

## Local dev

```bash
npm install
npm run dev           # Vite only — API returns 404 locally
```

For full-stack local after D1 is set up:
```bash
npx wrangler pages dev -- npm run dev
```

## Deploy walkthrough

### 1. Create the D1 database

```bash
npx wrangler d1 create mintforge
```

Copy the printed `database_id` into `wrangler.toml` under `[[d1_databases]]`.

### 2. Apply the schema

```bash
npx wrangler d1 execute mintforge --file=./schema.sql --remote
```

Verify:
```bash
npx wrangler d1 execute mintforge --command="SELECT name FROM sqlite_master WHERE type='table'" --remote
```
Expect: `players`, `player_state`, `coins`, `sessions`.

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial MintForge deploy"
git remote add origin <your-repo-url>
git push -u origin main
```

### 4. Connect to Cloudflare Pages

Dashboard → Workers & Pages → Create → Pages → Connect to Git → pick repo.

Build settings:
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- Env var: `NODE_VERSION` = `20`

### 5. Bind D1 to the Pages project

After first deploy: Pages project → **Settings** → **Functions** → **D1 database bindings** → Add:
- Variable name: `DB`
- D1 database: `mintforge`

Then **Retry deployment**. API endpoints only work after binding is attached.

### 6. Smoke test

```bash
curl -X POST https://<your-pages-url>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","pin":"1234"}'
```

Expect: `{ "token": "...", "player": { ... } }`.

### 7. Custom domain (optional)

Pages project → Custom domains → `mintforge.projectthoth.com` (auto-DNS if zone is already on your CF account).

## Schema reference

See `schema.sql`. Four tables:
- **players** — account credentials (PBKDF2 + salt, 10k iterations)
- **player_state** — xp, shovel_level, brush_level, frame, bio, selected_title, pinned_ids (JSON)
- **coins** — id, seed, metal_idx, shiny, acquired_at (rest derives from seed via `mkCoin(seed)`)
- **sessions** — token → player_id

## API surface

| Method | Path                 | Auth | Purpose                                  |
|--------|----------------------|------|------------------------------------------|
| POST   | `/api/auth/register` | —    | Create account + session                 |
| POST   | `/api/auth/login`    | —    | Authenticate + session                   |
| POST   | `/api/auth/logout`   | ✓    | Revoke session                           |
| GET    | `/api/vault`         | ✓    | Full player state + coin list            |
| POST   | `/api/vault`         | ✓    | Transactional `{remove?, add?, state?}`  |

All coin mutations flow through the single transactional endpoint — forges and gambles stay atomic.

## Migrations (existing deployments)

Run these in order. Each is idempotent — `CREATE TABLE IF NOT EXISTS` skips if applied; `ALTER TABLE ADD COLUMN` errors with "duplicate column name" if already applied (safe to ignore).

```bash
# v1 -> v2: Locked coins + friends
npx wrangler d1 execute mintforge --file=./migrations/001_locked_friends.sql --remote

# v2 -> v3: Marks currency, pickaxe durability, tarot cards
npx wrangler d1 execute mintforge --file=./migrations/002_marks_durability_tarot.sql --remote

# v3 -> v4: Premium frame + title ownership
npx wrangler d1 execute mintforge --file=./migrations/003_owned_cosmetics.sql --remote

# v4 -> v5: Coin rarity column
npx wrangler d1 execute mintforge --file=./migrations/004_coin_rarity.sql --remote

# v5 -> v6: Artefacts table (Shrine system)
npx wrangler d1 execute mintforge --file=./migrations/005_artefacts.sql --remote
```

If you can't run wrangler (e.g. on mobile), the equivalent SQL to paste into the Cloudflare D1 web console is in each migration file.

## API surface (current)

| Method | Path                       | Auth | Purpose                                         |
|--------|----------------------------|------|-------------------------------------------------|
| POST   | `/api/auth/register`       | —    | Create account + session                        |
| POST   | `/api/auth/login`          | —    | Authenticate + session                          |
| POST   | `/api/auth/logout`         | ✓    | Revoke session                                  |
| GET    | `/api/vault`               | ✓    | Full player state + coins + tarots + artefacts  |
| POST   | `/api/vault`               | ✓    | Transactional `{remove?, add?, lock?, tarotBuy?, tarotSell?, artefactAdd?, state?}` |
| GET    | `/api/users/search?q=`     | ✓    | Username prefix search (max 10)                 |
| GET    | `/api/users/:username`     | ✓    | Public profile + showcase coins                 |
| GET    | `/api/friends`             | ✓    | List your friends                               |
| POST   | `/api/friends`             | ✓    | `{username}` — add friend                       |
| DELETE | `/api/friends`             | ✓    | `{username}` — remove friend                    |

## Game systems

- **Coins** — the collectables. Found via Hunt, identity derived from a 32-bit seed (so DB rows stay tiny — `{id, seed, metalIdx, shiny, locked}`). All visual properties are reconstructed client-side via `mkCoin(seed)`.
- **Marks (◈)** — the spendable currency. Earned at ~30% of a coin's value on discovery, or by selling coins from the inspect modal. Spent on tarot cards and pickaxe repairs.
- **Pickaxe durability** — each dig costs 1 durability (Hierophant tarot halves it). Broken pickaxes refuse to dig until repaired in the Tavern. Repair cost scales with shovel level.
- **Tarot cards** — purchased once each from the Tavern shop, equip up to 5 simultaneously for stacking buffs (shiny chance, XP multiplier, marks multiplier, tier-up rolls, durability reduction, pin slots, lucky-dig chance, forge refund).
- **Brush** — capped at 15% shiny chance at max level (was 35%) to leave room for tarot stacking. Tarot bonuses apply on top of the brush rate.


