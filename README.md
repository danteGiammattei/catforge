# Catforge

Comfy idle cat-mining game. Cloudflare Pages + Functions + D1.

Forked from MintForge — most of the dig/forge/tavern/shrine systems were stripped to make room for the cat direction. Only the field loop is wired up; vault/profile/social are placeholders ready to be rebuilt.

## Stack

- **Frontend:** React 18 + Vite + Tailwind 3
- **Backend:** Cloudflare Pages Functions (Workers)
- **DB:** Cloudflare D1 (`catforgedb`)
- **Auth:** username + 4–6 digit PIN, Bearer token in localStorage (`catforge:token`)

## File layout

```
src/
  main.jsx                 Entry — mounts <MintForge/>
  MintForge.jsx            App shell — auth gate, top bar, hamburger nav, GameContext provider
  styles.css               Tailwind base + custom animations
  components/
    AuthScreen.jsx         Login / register
    CoinCanvas.jsx         Procedural coin renderer (uses lib/coin.js drawCoin)
    MarksCounter.jsx       Animated currency readout
  screens/
    IdleField.jsx          The game loop — tap building → cat mines → coin pops out
  hooks/index.js           useDebouncedEffect
  lib/
    api.js                 Fetch wrapper for /api/*
    coin.js                RNG, mkCoin, drawCoin (procedural), rarity, value
    data.js                METALS, RARITIES, BANNERS, FRAMES, TAROTS (legacy — pruned later)
    GameContext.js         createContext + useGame hook
    theme.js               DARK / LIGHT theme tokens

functions/api/
  _utils.js                json, bad, hashPin, getAuth helpers
  auth/{login,logout,register}.js
  users/{search,[username]}.js
  vault/index.js           GET snapshot / POST transaction (matches v1 schema)
  friends/index.js

migrations/
  001_init.sql             players · sessions · player_state · coins · friends

public/
  favicon.svg
  locations/field/{sky,near,far}.webp   Parallax backdrop assets for the field
```

## Local dev

```cmd
npm install
npm run dev
```

## Deploy

Connected to GitHub via Cloudflare Pages. Build settings live in `wrangler.toml` — Cloudflare reads `[build] command` and `pages_build_output_dir`. Don't set a Deploy command in the Pages dashboard; clearing it (or setting `exit 0`) is what you want — Pages auto-publishes after the build.

## D1

```cmd
npx wrangler d1 create catforgedb
npx wrangler d1 execute catforgedb --file=migrations/001_init.sql --remote
```

Then bind it in Cloudflare dashboard → Pages → catforge → Settings → Functions → D1 bindings: variable name `DB`, database `catforgedb`.

## What's next

1. **Persist IdleField state** — currently the cat cycle is local-only. The mined coins don't save to the vault yet. Hook up `setCoins([...coins, newCoin])` + `api.tx({ add: [newCoin] })` at the "presenting → idle" handoff.
2. **Save fieldState** — buildings, cats, last-tick. `fieldState` is already wired in MintForge.jsx and the vault Worker; just write to it from IdleField.
3. **Build the Vault screen** — coin grid using `<CoinCanvas/>`. The data is already loaded.
4. **Profile + Social** — rebuild for cat aesthetic, no need to mirror MintForge's banner/title cosmetic system.
5. **Idle progress** — the buildings should tick while the tab is closed. Compute on next load from `lastTick`.
