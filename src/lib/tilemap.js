/* ─── TILEMAP ──────────────────────────────────────────────────────────────
 * Shared helpers for the tile-based ground layer. A level is a flat array of
 * tile indices into a tileset image. The tileset is an 8x8 grid of 32px
 * tiles (TX Tileset Grass: indices 0-31 are grass variants, 32-63 are stone
 * paths).
 *
 * The map is persisted in localStorage so the in-browser Level Editor and the
 * IdleField ground renderer share it without a server round-trip. Players can
 * also export the JSON and bake it into the repo as the default map.
 * ────────────────────────────────────────────────────────────────────────── */

export const TILESET = {
  src: "/tiles/grass_set.png",
  cols: 8,        // tiles across the tileset image
  rows: 8,        // tiles down
  tile: 32,       // native tile size in px
};

export const MAP_KEY = "catforge:levelmap:v1";

// Default map size (tiles). Wide + short suits the landscape field view.
export const DEFAULT_COLS = 28;
export const DEFAULT_ROWS = 16;

// A fresh blank map filled with plain grass (tile 0).
export function blankMap(cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  return { cols, rows, tiles: new Array(cols * rows).fill(0) };
}

export function loadMap() {
  try {
    const raw = localStorage.getItem(MAP_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw);
    if (!m?.tiles || !m.cols || !m.rows) return null;
    return m;
  } catch {
    return null;
  }
}

export function saveMap(map) {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

// Background-position style for a single tile index, at a given display size.
// Lets us render any tile as a div with the tileset as background.
export function tileStyle(idx, displaySize) {
  const col = idx % TILESET.cols;
  const row = Math.floor(idx / TILESET.cols);
  const sheetW = TILESET.cols * displaySize;
  const sheetH = TILESET.rows * displaySize;
  return {
    width: displaySize,
    height: displaySize,
    backgroundImage: `url("${TILESET.src}")`,
    backgroundSize: `${sheetW}px ${sheetH}px`,
    backgroundPosition: `-${col * displaySize}px -${row * displaySize}px`,
    imageRendering: "pixelated",
  };
}
