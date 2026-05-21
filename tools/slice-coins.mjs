#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════
 *  COIN SLICER
 *  ────────────────────────────────────────────────────────────────────────
 *  One-shot script. Slices the 4096×2048 source sheet into individual coin
 *  PNG files at 256×256 in public/coins/. Run this whenever the source
 *  sheet changes:
 *
 *    node tools/slice-coins.mjs path/to/sheet.webp
 *
 *  Defaults to ./source-coins.webp if no path given.
 *
 *  ────────────────────────────────────────────────────────────────────────
 *  SHEET LAYOUT (analysed from source)
 *  ────────────────────────────────────────────────────────────────────────
 *  4096 × 2048 px. NOT a clean grid — coins are packed at uneven y-centers
 *  and each coin is roughly 220 × 180 px. We hardcode the y-centers and
 *  crop a 256 × 256 window around each.
 *
 *  Copper and Bronze each get 32 emblems (top + bottom rows). All other
 *  metals get 16 emblems (top row only).
 *
 *  Output naming: <metal>_<emblem>.png
 *    e.g. copper_compass.png, gold_chalice.png, astral_tower.png
 *
 *  Total output:
 *    Copper:   32 files
 *    Bronze:   32 files
 *    Silver, Gold, Platinum, Obsidian, Void, Eldritch, Astral: 16 each
 *    Total: 64 + 7×16 = 176 files
 *
 *  ────────────────────────────────────────────────────────────────────────
 *  WHY NOT A CLEAN 256-PIXEL GRID?
 *  ────────────────────────────────────────────────────────────────────────
 *  The source sheet's coins were rendered with non-uniform spacing — likely
 *  an export quirk from the AI generator. Re-rendering with a clean grid
 *  would let us replace this hardcoded math with a simple loop. If you
 *  re-export the sheet, update Y_CENTERS below.
 *
 *  Run with: node tools/slice-coins.mjs
 *  ──────────────────────────────────────────────────────────────────────── */

import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const SOURCE_PATH = resolve(PROJECT_ROOT, process.argv[2] || 'source-coins.webp');
const OUTPUT_DIR  = resolve(PROJECT_ROOT, 'public/coins');

// ── Layout constants ──────────────────────────────────────────────────────

// Hardcoded y-centers for each visual row in the sheet (from analysis).
// If you re-export the sheet with a clean 256-pixel grid, replace this
// with a simple loop: rows.map((_, i) => 128 + i * 256).
const Y_CENTERS = [98, 285, 467, 658, 834, 1016, 1208, 1392, 1576, 1764, 1931];

// 16 columns at 256px each. Column N centered at x = N*256 + 128.
const NUM_COLS = 16;
const COL_WIDTH = 256;

// Output crop size. Sheet coins are ~220×180; we add padding to 256×256
// so the output matches the design intent ("256px per coin").
const OUTPUT_SIZE = 256;

// ── Emblem name lists ────────────────────────────────────────────────────
//
// Order matches left-to-right reading of each row in the source sheet.
// These names become the suffix in <metal>_<emblem>.png filenames.

const TOP_EMBLEMS = [
  'compass', 'crescent', 'sun', 'northstar', 'eye', 'sword',
  'chalice', 'scales', 'laurel', 'lyre', 'tree', 'flame',
  'lotus', 'wing', 'key', 'tower',
];

// Bottom-half emblems (only present for Copper and Bronze).
// NOTE: Some entries marked TODO need verification against the actual sheet —
// I derived this list from earlier visual analysis but couldn't confirm
// every cell while the source was unavailable. Re-check the first few when
// running the slicer for the first time.
const BOTTOM_EMBLEMS = [
  'chalice2',     // TODO verify: row 1 col 0 looked like another chalice variant
  'tower2',       // TODO verify: row 1 col 1 looked like another tower variant
  'hourglass',
  'serpent',
  'triskele',
  'shield',
  'feather',
  'wolf',         // TODO verify: this and 'bear' looked similar
  'bear',
  'anchor',
  'pendant',      // crescent-with-dangles
  'shootingstar',
  'planet',       // saturn-like
  'book',
  'crystal',
  'comet',
];

// ── Row → metal/half mapping ─────────────────────────────────────────────

const ROW_DEFS = [
  { row: 0,  metal: 'copper',   emblems: TOP_EMBLEMS },
  { row: 1,  metal: 'copper',   emblems: BOTTOM_EMBLEMS },
  { row: 2,  metal: 'bronze',   emblems: TOP_EMBLEMS },
  { row: 3,  metal: 'bronze',   emblems: BOTTOM_EMBLEMS },
  { row: 4,  metal: 'silver',   emblems: TOP_EMBLEMS },
  { row: 5,  metal: 'gold',     emblems: TOP_EMBLEMS },
  { row: 6,  metal: 'platinum', emblems: TOP_EMBLEMS },
  { row: 7,  metal: 'obsidian', emblems: TOP_EMBLEMS },
  { row: 8,  metal: 'void',     emblems: TOP_EMBLEMS },
  { row: 9,  metal: 'eldritch', emblems: TOP_EMBLEMS },
  { row: 10, metal: 'astral',   emblems: TOP_EMBLEMS },
];

// ── Slicer ────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`✗ Source sheet not found at: ${SOURCE_PATH}`);
    console.error(`  Pass a path: node tools/slice-coins.mjs path/to/sheet.webp`);
    console.error(`  Or place it at: ${SOURCE_PATH}`);
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const sheet = sharp(SOURCE_PATH);
  const { width, height } = await sheet.metadata();
  console.log(`Source: ${width}×${height} px`);

  if (width !== 4096 || height !== 2048) {
    console.warn(`⚠ Expected 4096×2048, got ${width}×${height}. Y-centers may be off.`);
  }

  let total = 0;
  const manifest = [];

  for (const { row, metal, emblems } of ROW_DEFS) {
    const cy = Y_CENTERS[row];
    const y0 = Math.max(0, cy - OUTPUT_SIZE / 2);

    for (let col = 0; col < NUM_COLS; col++) {
      const emblem = emblems[col];
      const x0 = col * COL_WIDTH;
      const filename = `${metal}_${emblem}.png`;
      const outPath  = resolve(OUTPUT_DIR, filename);

      await sharp(SOURCE_PATH)
        .extract({ left: x0, top: y0, width: OUTPUT_SIZE, height: OUTPUT_SIZE })
        .png({ compressionLevel: 9 })
        .toFile(outPath);

      manifest.push({ metal, emblem, file: filename });
      total++;
    }
  }

  await writeFile(
    resolve(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: total, coins: manifest }, null, 2)
  );

  console.log(`✓ Sliced ${total} coins → ${OUTPUT_DIR}`);
  console.log(`  Copper:   32 (top + bottom emblems)`);
  console.log(`  Bronze:   32`);
  console.log(`  Silver, Gold, Platinum, Obsidian, Void, Eldritch, Astral: 16 each`);
  console.log(`  Manifest: public/coins/manifest.json`);
}

main().catch(err => {
  console.error('Slicer failed:', err);
  process.exit(1);
});
