import { useState, useMemo } from "react";
import { useGame } from "../lib/GameContext.js";
import { coinRarity, coinValue } from "../lib/coin.js";
import CoinCanvas from "../components/CoinCanvas.jsx";

/* ─── VAULT ───────────────────────────────────────────────────────────────
 * Grid of all owned coins, with metal-tier filter pills. Tapping a coin
 * opens an inline detail panel showing its metal, rarity, value, and a
 * larger render. Bulk operations not exposed yet — those come later. */
export default function Vault() {
  const { coins, METALS, RARITIES, RARITY_COLOR, t, isDark, F, FR } = useGame();

  const [filter, setFilter] = useState(-1);     // metal index, or -1 = all
  const [selected, setSelected] = useState(null); // selected coin object

  // Filtered + sorted: best-first by rarity, then metal tier, then shiny.
  const visible = useMemo(() => {
    const arr = filter === -1 ? coins : coins.filter(c => c.metalIdx === filter);
    return [...arr].sort((a, b) =>
      coinRarity(b) - coinRarity(a)
      || b.metalIdx - a.metalIdx
      || (b.shiny ? 1 : 0) - (a.shiny ? 1 : 0)
    );
  }, [coins, filter]);

  // Counts per metal — used to show "(0)" suppressed pills and let the
  // player see at-a-glance what tiers they own.
  const metalCounts = useMemo(() => {
    const counts = new Array(9).fill(0);
    coins.forEach(c => { if (c.metalIdx >= 0 && c.metalIdx < 9) counts[c.metalIdx]++; });
    return counts;
  }, [coins]);

  return (
    <div style={{
      ...F, padding: "16px 12px 80px", maxWidth: 520, margin: "0 auto",
      height: "100%", overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 14, padding: "0 4px",
      }}>
        <div style={{ ...FR, fontWeight: 800, fontSize: 22, color: t.text, letterSpacing: -.3 }}>The Vault</div>
        <div style={{ fontSize: 11, color: t.muted, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
          {coins.length} {coins.length === 1 ? "coin" : "coins"}
        </div>
      </div>

      {/* Filter pills — horizontal scroll on narrow screens */}
      {coins.length > 0 && (
        <div style={{
          display: "flex", gap: 6, marginBottom: 14, padding: "0 2px",
          overflowX: "auto", WebkitOverflowScrolling: "touch",
        }}>
          <FilterPill active={filter === -1} onClick={() => setFilter(-1)} label="All" count={coins.length} t={t} F={F}/>
          {METALS.map((m, i) => metalCounts[i] > 0 && (
            <FilterPill
              key={i}
              active={filter === i}
              onClick={() => setFilter(i)}
              label={m.name}
              count={metalCounts[i]}
              color={m.hl}
              t={t} F={F}
            />
          ))}
        </div>
      )}

      {/* Grid (or empty state) */}
      {coins.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
        }}>
          <div style={{ fontSize: 54, opacity: 0.5, marginBottom: 14 }}>🪙</div>
          <div style={{ ...FR, fontWeight: 800, fontSize: 19, marginBottom: 6, color: t.text }}>The Vault is empty</div>
          <div style={{ fontSize: 13, color: t.muted, maxWidth: 260, margin: "0 auto", lineHeight: 1.55 }}>
            Head back to the Field and tap a ready station to mine your first coin.
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 8,
        }}>
          {visible.map(c => (
            <CoinTile key={c.id} coin={c} onClick={() => setSelected(c)} t={t} isDark={isDark} F={F} METALS={METALS} RARITIES={RARITIES} RARITY_COLOR={RARITY_COLOR}/>
          ))}
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {selected && (
        <CoinDetail coin={selected} onClose={() => setSelected(null)} t={t} isDark={isDark} F={F} FR={FR} METALS={METALS} RARITIES={RARITIES} RARITY_COLOR={RARITY_COLOR}/>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label, count, color, t, F }) {
  return (
    <button onClick={onClick} style={{
      ...F, padding: "6px 12px", borderRadius: 20,
      border: `1px solid ${active ? t.accent : t.border}`,
      background: active ? `${t.accent}22` : t.surface,
      color: active ? t.accent : (color || t.muted),
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {label}
      <span style={{ opacity: 0.55, fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </button>
  );
}

function CoinTile({ coin, onClick, t, isDark, F, METALS, RARITIES, RARITY_COLOR }) {
  const m = METALS[coin.metalIdx] || METALS[0];
  const r = RARITIES[coinRarity(coin)] || RARITIES[0];
  return (
    <button onClick={onClick} style={{
      position: "relative", padding: "9px 5px 6px",
      borderRadius: 10, border: `1px solid ${r.color}55`,
      background: isDark ? `linear-gradient(160deg, ${m.dark}30, ${t.surface})` : t.surface,
      cursor: "pointer", transition: "transform .12s, border-color .12s",
      overflow: "visible",
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
        <CoinCanvas coin={coin} size={50}/>
      </div>
      <div style={{
        ...F, fontSize: 7.5, color: r.color, fontWeight: 800,
        letterSpacing: 1, textTransform: "uppercase", textAlign: "center",
      }}>{r.name}</div>
      {coin.shiny && (
        <div style={{
          position: "absolute", top: 3, right: 3,
          fontSize: 10, color: "#ffd75f", textShadow: "0 0 4px #fff", lineHeight: 1,
        }}>✦</div>
      )}
    </button>
  );
}

function CoinDetail({ coin, onClose, t, isDark, F, FR, METALS, RARITIES, RARITY_COLOR }) {
  const m = METALS[coin.metalIdx] || METALS[0];
  const r = RARITIES[coinRarity(coin)] || RARITIES[0];
  const val = coinValue(coin);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, animation: "fadein .15s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: t.surface, border: `1.5px solid ${r.color}aa`,
        borderRadius: 16, padding: "26px 22px", maxWidth: 320, width: "100%",
        textAlign: "center", boxShadow: `0 12px 30px ${r.color}33`,
      }}>
        <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
          <CoinCanvas coin={coin} size={140}/>
        </div>
        <div style={{ ...FR, fontWeight: 800, fontSize: 20, color: t.text, letterSpacing: -.3 }}>
          {m.name} {coin.shiny ? "✦" : ""}
        </div>
        <div style={{
          ...F, fontSize: 11, color: r.color, fontWeight: 800, marginTop: 6,
          letterSpacing: 2.5, textTransform: "uppercase",
        }}>{r.name}</div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20,
        }}>
          <DetailRow t={t} F={F} FR={FR} label="Value" value={`◈ ${val.toLocaleString()}`}/>
          <DetailRow t={t} F={F} FR={FR} label="Tier" value={`#${coin.metalIdx + 1} / 9`}/>
        </div>

        <button onClick={onClose} style={{
          ...F, marginTop: 22, padding: "10px 26px",
          background: t.surfaceHi, border: `1px solid ${t.borderHi}`,
          borderRadius: 9, color: t.text,
          fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
          cursor: "pointer",
        }}>Close</button>
      </div>
    </div>
  );
}

function DetailRow({ t, F, FR, label, value }) {
  return (
    <div style={{
      background: t.surfaceHi, border: `1px solid ${t.border}`,
      borderRadius: 9, padding: "10px 8px",
    }}>
      <div style={{
        ...F, fontSize: 9, color: t.muted, fontWeight: 700,
        letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3,
      }}>{label}</div>
      <div style={{
        ...FR, fontSize: 14, fontWeight: 800, color: t.text,
        letterSpacing: -.2, fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
    </div>
  );
}
