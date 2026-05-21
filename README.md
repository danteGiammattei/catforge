# Catforge

Comfy idle coin-mining game. Tap the mine, send the cat in, get a coin back. Forked from MintForge to start clean on the schema and UI.

## What you get out of this fork

- **Procedural coin renderer** — fully preserved from MintForge (`src/lib/coin.js` + `src/components/CoinCanvas.jsx`). 9 metals × 5 rarities, deterministic from seed.
- **IdleField main screen** — pastel green field with mine + cat, click-to-mine loop, recent coins tray, hamburger menu (Cats-and-Soup vibe).
- **Auth + session + vault + profile + social** — kept from MintForge so login/friends/coin storage just works.
- **Clean schema** — single new `001_init.sql` migration with just the tables this game needs. No skeleton-hunt / forge / tarot baggage.

## Setup (do these in order)

### 1. Run SETUP.cmd

Double-click `SETUP.cmd` from anywhere. It will:

1. Copy `C:\dev\codebase\cloudflare\coin_game\mintforge-deploy` → `C:\dev\codebase\cloudflare\new\catforge`
2. Disconnect old git history
3. Delete the baggage (old screens, sprites, decor, old migrations)
4. Pause for you to copy the replacement files (next step)

If your source path is different, edit `SOURCE=` at the top of `SETUP.cmd` first.

### 2. Copy the replacement files

Once the script pauses, copy the contents of the `replace/` folder over your new `catforge` directory — preserve the folder structure. You can do this in Explorer or run:

```cmd
xcopy /E /Y replace\* C:\dev\codebase\cloudflare\new\catforge\
```

Files being replaced:
- `package.json` — renamed to "catforge"
- `index.html` — title and meta updated
- `src/MintForge.jsx` — stripped of imports/routes for deleted screens (Tavern, Forge, etc.)
- `src/screens/IdleField.jsx` — the new main screen
- `src/lib/data.js` — unchanged (METALS palette etc. still needed)
- `src/lib/coin.js` — unchanged (procedural renderer)
- `migrations/001_init.sql` — fresh clean schema
- `README.md` — this file

### 3. Resume SETUP.cmd (press any key)

The script will then run `npm install`, init git, and make the initial commit.

### 4. Push to a new GitHub repo

Create an empty repo at https://github.com/new (suggested name: `catforge`).

```cmd
cd C:\dev\codebase\cloudflare\new\catforge
git remote add origin https://github.com/YOUR_USERNAME/catforge.git
git push -u origin main
```

### 5. Cloudflare Pages — new project

In the Cloudflare dashboard:
1. Pages → Create a project → Connect to Git → pick `catforge`
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Save and deploy — you'll get a `*.pages.dev` URL

### 6. Create a new D1 database

```cmd
npx wrangler d1 create catforge-db
```

Note the `database_id` it prints — you'll need it.

### 7. Bind D1 to your Pages project

Cloudflare dashboard → Pages → catforge → Settings → Functions → D1 database bindings → Add binding:
- Variable name: `DB`
- Database: `catforge-db`

### 8. Apply the schema

```cmd
cd C:\dev\codebase\cloudflare\new\catforge
npx wrangler d1 execute catforge-db --file=migrations/001_init.sql --remote
```

### 9. Redeploy

In the Pages dashboard, trigger a new deployment (or push any commit). The site at your `*.pages.dev` URL should now serve a working catforge build with:
- Login/register screen
- After login: the comfy idle field
- Hamburger menu top-left → Vault/Profile/Social

## What's still rough (things to fix in the new chat)

- **The hamburger menu doesn't navigate yet** — clicking Vault/Profile/Social just closes the drawer. Needs to call `setTab()` from context.
- **No persistence for field state** — `field_state` column exists in D1 but the IdleField component doesn't save buildings/cats yet (it's a demo of the loop, not a saved game).
- **No idle/offline progress** — building doesn't tick by itself; you have to tap each cycle.
- **Single building, single cat** — the "Expand your village" hint is purely visual. Building catalog + slot system come next.
- **Bottom tab nav still exists** — you may want to hide it entirely once the hamburger is wired up.
- **Unused components are still in the codebase** — e.g. some lib files reference things from the old game. Safe to delete iteratively as you find them via build errors.

## Tunables in IdleField

At the top of `src/screens/IdleField.jsx`:

```js
const T_WALK_IN_MS  = 1200;   // cat → mine
const T_MINING_MS   = 1600;   // shake-shake-shake
const T_WALK_OUT_MS = 1200;   // mine → cat
const T_PRESENT_MS  = 1400;   // coin floats
```

Total cycle ~5.4s. Faster = more arcade-y, slower = more idle-y.

## Coin drop weighting

Currently rolls a random metal via `rollOreMetal(Math.random())` from data.js. To make different buildings drop different metals (copper mine, silver mine, etc.), you'd add a per-building metal weight table when you build the building catalog.

## Have fun

This is a clean canvas. The procedural coin renderer is the strongest piece of inherited code — every visual reward in the game flows through it. Build outward from "what makes earning a coin feel good" and the rest follows.
