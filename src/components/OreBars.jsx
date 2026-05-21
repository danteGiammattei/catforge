import { METALS } from "../lib/data.js";
import { ORE_PER_BAR } from "../lib/data.js";

/* ─── ORE BARS ────────────────────────────────────────────────────────────
 * The strip below the hunt viewport. Shows nine horizontal progress bars,
 * one per metal. Each fills as the player kills skeletons and collects ore.
 *
 * Props:
 *   counts    — array of 9 ints (current ore for each metalIdx)
 *   onClaim   — fn(metalIdx) invoked when a full bar is tapped
 *
 * The full-bar's tap target shows "Claim" instead of "10/10" and is
 * highlighted with the metal's base color. Bars that aren't full are
 * read-only (no tap handler attached).
 */
export default function OreBars({ counts, onClaim, theme }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 6,
      padding: "8px 10px 10px",
      // Subtle dark backdrop so bars stand out against any near-layer rocks
      background: "rgba(0,0,0,.35)",
      borderTop: `1px solid ${theme?.border || "#3a2a18"}`,
    }}>
      {METALS.map((m, i) => {
        const c = counts[i] || 0;
        const pct = Math.min(1, c / ORE_PER_BAR);
        const full = c >= ORE_PER_BAR;
        return (
          <button
            key={m.name}
            type="button"
            disabled={!full}
            onClick={() => full && onClaim?.(i)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              borderRadius: 6,
              border: `1px solid ${full ? m.hl : "rgba(255,255,255,.08)"}`,
              background: "rgba(0,0,0,.35)",
              color: full ? "#fff" : "rgba(255,255,255,.7)",
              cursor: full ? "pointer" : "default",
              fontSize: 11,
              fontWeight: 600,
              overflow: "hidden",
              minHeight: 26,
              // Glow on full
              boxShadow: full ? `0 0 8px ${m.hl}55, inset 0 0 6px ${m.hl}33` : "none",
              transition: "border-color .2s, box-shadow .2s",
            }}>
            {/* Fill bar — sits behind the label */}
            <div style={{
              position: "absolute",
              inset: 0,
              width: `${pct * 100}%`,
              background: `linear-gradient(90deg, ${m.dark}, ${m.base})`,
              opacity: full ? 0.85 : 0.55,
              zIndex: 0,
            }}/>
            {/* Metal name + count, sit on top of the bar */}
            <span style={{ position: "relative", zIndex: 1, flex: 1, textAlign: "left" }}>
              {m.name}
            </span>
            <span style={{
              position: "relative", zIndex: 1,
              fontSize: 10,
              color: full ? "#fff" : "rgba(255,255,255,.85)",
            }}>
              {full ? "CLAIM" : `${c}/${ORE_PER_BAR}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
