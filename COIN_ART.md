# Coin Art Pipeline

Coins are now hand-illustrated rather than procedurally drawn. This document
covers how the asset pipeline works.

## Where the art lives

`/public/coins/<metal>_<emblem>.png` — one file per coin variant. 256×256.

Examples:
- `copper_compass.png`
- `gold_chalice.png`
- `astral_tower.png`
- `void_eye.png`

Total: ~176 files (Copper and Bronze get 32 emblems each, others get 16).

## The source sheet

A single 4096×2048 PNG/WEBP master sheet contains all coin art in a grid.
Place this at the project root as `source-coins.webp` (or pass a path
explicitly when running the slicer).

The sheet should follow this layout:

| Row index | y-center (px) | Metal     | Emblem set       |
|-----------|---------------|-----------|------------------|
| 0         | 98            | Copper    | top 16 emblems   |
| 1         | 285           | Copper    | bottom 16        |
| 2         | 467           | Bronze    | top 16           |
| 3         | 658           | Bronze    | bottom 16        |
| 4         | 834           | Silver    | top 16           |
| 5         | 1016          | Gold      | top 16           |
| 6         | 1208          | Platinum  | top 16           |
| 7         | 1392          | Obsidian  | top 16           |
| 8         | 1576          | Void      | top 16           |
| 9         | 1764          | Eldritch  | top 16           |
| 10        | 1931          | Astral    | top 16           |

16 columns × 256px each. Each emblem cell is approximately 220×180px;
slicer crops 256×256 around the y-center to capture the full coin with
breathing room.

The 16 base emblems (left-to-right per row):
```
compass, crescent, sun, northstar, eye, sword,
chalice, scales, laurel, lyre, tree, flame,
lotus, wing, key, tower
```

The 16 extra emblems for Copper/Bronze bottom rows:
```
chalice2, tower2, hourglass, serpent, triskele, shield,
feather, wolf, bear, anchor, pendant, shootingstar,
planet, book, crystal, comet
```

(See `tools/slice-coins.mjs` for full mapping including a couple of TODO
verifications on emblem name accuracy.)

## Running the slicer

```bash
# Default: reads ./source-coins.webp
node tools/slice-coins.mjs

# Or specify a path
node tools/slice-coins.mjs path/to/your-sheet.webp
```

This produces 176 PNG files in `public/coins/` plus a `manifest.json`.

## How runtime selects which coin to show

Every coin has a stable `seed`. The mapping is deterministic:

```js
// In src/lib/data.js:
function emblemForCoin(seed, metalIdx) {
  const roster = EMBLEMS_BY_METAL[metalIdx];
  return roster[((seed >>> 0) ^ 0xc01ee) % roster.length];
}
```

So coin `seed=12345 metal=copper` always shows `copper_compass.png`. A coin
in your vault never changes its art across reloads or refreshes.

## Re-rendering the source sheet

If you re-export the source with a clean 256×256 grid (no packing, uniform
spacing), update `Y_CENTERS` in `tools/slice-coins.mjs` to:

```js
const Y_CENTERS = [128, 384, 640, 896, 1152, 1408, 1664, 1920];
```

That replaces 11 hardcoded values with a clean 8-row grid (which matches
the file's named intent of "256px per coin"). The slicer then becomes a
trivial loop.

## Fallback rendering

If a coin image fails to load (404, missing slice, slicer not run yet),
`CoinCanvas` falls back to the legacy procedural canvas drawer. So the app
always shows *something* even if asset deployment is incomplete. See
`drawCoinFallback` in `src/lib/coin.js`.

## Shape field

Coins still have a `shape` property in their data (`round`, `octagonal`,
`hexagonal`, etc.) but visually all current images are round. The shape is
shown in `CoinModal` as descriptive metadata only. Future art could include
shaped coin variants if desired.
