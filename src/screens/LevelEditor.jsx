import { useState, useRef, useCallback, useEffect } from "react";
import { useGame } from "../lib/GameContext.js";
import {
  TILESET, DEFAULT_COLS, DEFAULT_ROWS,
  blankMap, loadMap, saveMap, tileStyle,
} from "../lib/tilemap.js";

/* ─── LEVEL EDITOR ─────────────────────────────────────────────────────────
 * In-browser tile painter. Pick a tile from the palette, then click/drag on
 * the grid to paint the ground layer. Save writes to localStorage (shared
 * with IdleField's ground renderer); Export downloads the JSON so you can
 * bake a map into the repo as the default.
 *
 * Tools:
 *   Paint  — click/drag to lay the selected tile
 *   Fill   — flood-fill contiguous same-tile region
 *   Pick   — eyedropper: click a cell to select its tile
 *
 * No Unity needed — this lives in the same React app and the map renders
 * directly in the field. Keeps the whole pipeline in one place.
 * ────────────────────────────────────────────────────────────────────── */

const PALETTE_TILE = 30;   // palette swatch display size
const TOOLS = ["paint", "fill", "pick"];

export default function LevelEditor() {
  const { t, F, FR } = useGame();

  const [map, setMap]       = useState(() => loadMap() || blankMap());
  const [selected, setSelected] = useState(0);   // selected tile index
  const [tool, setTool]     = useState("paint");
  const [cell, setCell]     = useState(28);       // grid cell display size
  const [painting, setPainting] = useState(false);
  const [saved, setSaved]   = useState(false);
  const gridRef = useRef(null);

  const totalTiles = TILESET.cols * TILESET.rows;

  // ── paint helpers ───────────────────────────────────────────────
  const setTileAt = useCallback((i, value) => {
    setMap(prev => {
      if (prev.tiles[i] === value) return prev;
      const tiles = prev.tiles.slice();
      tiles[i] = value;
      return { ...prev, tiles };
    });
    setSaved(false);
  }, []);

  const floodFill = useCallback((startIdx, target) => {
    setMap(prev => {
      const { cols, rows } = prev;
      const from = prev.tiles[startIdx];
      if (from === target) return prev;
      const tiles = prev.tiles.slice();
      const stack = [startIdx];
      while (stack.length) {
        const i = stack.pop();
        if (tiles[i] !== from) continue;
        tiles[i] = target;
        const x = i % cols, y = Math.floor(i / cols);
        if (x > 0)        stack.push(i - 1);
        if (x < cols - 1) stack.push(i + 1);
        if (y > 0)        stack.push(i - cols);
        if (y < rows - 1) stack.push(i + cols);
      }
      return { ...prev, tiles };
    });
    setSaved(false);
  }, []);

  const applyTool = useCallback((i) => {
    if (tool === "paint")     setTileAt(i, selected);
    else if (tool === "fill") floodFill(i, selected);
    else if (tool === "pick") setSelected(map.tiles[i]);
  }, [tool, selected, map.tiles, setTileAt, floodFill]);

  // ── persistence ─────────────────────────────────────────────────
  const doSave = () => { if (saveMap(map)) { setSaved(true); setTimeout(() => setSaved(false), 1800); } };
  const doClear = () => { if (confirm("Clear the whole map to plain grass?")) { setMap(blankMap(map.cols, map.rows)); setSaved(false); } };
  const doExport = () => {
    const blob = new Blob([JSON.stringify(map)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "catforge-level.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const m = JSON.parse(reader.result);
        if (m?.tiles && m.cols && m.rows) { setMap(m); setSaved(false); }
        else alert("That doesn't look like a valid level file.");
      } catch { alert("Could not read that file."); }
    };
    reader.readAsText(file);
  };

  // Stop painting if mouse released anywhere
  useEffect(() => {
    const up = () => setPainting(false);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); };
  }, []);

  const btn = (active) => ({
    ...F, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
    border: `1px solid ${active ? t.accent : t.border}`,
    background: active ? `${t.accent}22` : t.surface,
    color: active ? t.accent : t.text,
    fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
  });

  return (
    <div style={{ ...F, height: "100%", overflowY: "auto", padding: "16px 14px 60px", color: t.text }}>
      <div style={{ ...FR, fontWeight: 800, fontSize: 22, marginBottom: 4, letterSpacing: -.3 }}>Level Editor</div>
      <div style={{ fontSize: 12, color: t.muted, marginBottom: 16, lineHeight: 1.5 }}>
        Pick a tile, then paint the ground. Save writes it into the game; the
        field picks it up immediately. Export to keep a copy.
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>
        {TOOLS.map(tl => (
          <button key={tl} onClick={() => setTool(tl)} style={btn(tool === tl)}>{tl}</button>
        ))}
        <span style={{ width: 1, height: 24, background: t.border, margin: "0 2px" }}/>
        <button onClick={doSave}   style={btn(false)}>{saved ? "✓ Saved" : "Save"}</button>
        <button onClick={doExport} style={btn(false)}>Export</button>
        <label style={{ ...btn(false), display: "inline-block" }}>
          Import
          <input type="file" accept="application/json" onChange={doImport} style={{ display: "none" }}/>
        </label>
        <button onClick={doClear}  style={{ ...btn(false), color: t.danger, borderColor: `${t.danger}55` }}>Clear</button>
        <span style={{ width: 1, height: 24, background: t.border, margin: "0 2px" }}/>
        <label style={{ ...F, fontSize: 11, color: t.muted, display: "flex", alignItems: "center", gap: 6 }}>
          Zoom
          <input type="range" min="16" max="44" value={cell} onChange={e => setCell(+e.target.value)}/>
        </label>
      </div>

      {/* ── Tile palette ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...F, fontSize: 10, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
          Tiles — grass 0-31 · stone 32-63
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 8 * (PALETTE_TILE + 3) + 16,
                      padding: 8, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
          {Array.from({ length: totalTiles }, (_, i) => (
            <button key={i} onClick={() => setSelected(i)} title={`Tile ${i}`}
              style={{
                ...tileStyle(i, PALETTE_TILE),
                border: selected === i ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                borderRadius: 4, cursor: "pointer", padding: 0,
                outline: selected === i ? `2px solid ${t.accent}66` : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Paint grid ── */}
      <div style={{ ...F, fontSize: 10, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
        Canvas — {map.cols} × {map.rows}
      </div>
      <div style={{ overflowX: "auto", padding: 8, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${map.cols}, ${cell}px)`,
            width: map.cols * cell,
            userSelect: "none", touchAction: "none",
            boxShadow: `0 0 0 1px ${t.border}`,
          }}
        >
          {map.tiles.map((tileIdx, i) => (
            <div
              key={i}
              onMouseDown={() => { setPainting(true); applyTool(i); }}
              onMouseEnter={() => { if (painting && tool === "paint") setTileAt(i, selected); }}
              onTouchStart={(e) => { e.preventDefault(); applyTool(i); }}
              style={{
                ...tileStyle(tileIdx, cell),
                cursor: "crosshair",
                touchAction: "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
