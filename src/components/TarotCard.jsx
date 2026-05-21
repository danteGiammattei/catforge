import { useState } from "react";
import { RARITY_COLOR } from "../lib/data.js";

/* ─── TAROT CARD ──────────────────────────────────────────────────────────
 * Visual card with art + title bar. Uses /public/tarot/<id>.webp and falls
 * back to a stylized roman/glyph/title placeholder on image load failure
 * (so adding new cards without art doesn't break the row layout).
 *
 * Props:
 *   card     — the TAROT_CARDS entry
 *   owned    — controls grayscale/desaturation
 *   equipped — adds rarity-colored glow + "Equipped" badge
 *   onClick  — optional click handler (cursor/hover lift only when set) */
export default function TarotCard({ card, owned = true, equipped = false, onClick, size = "md", t }) {
  const dims = size === "sm" ? { w: 88, fs: 9 }
            : size === "lg" ? { w: 170, fs: 14 }
            :                 { w: 120, fs: 11 };
  const rarColor = RARITY_COLOR[card.rarity] || "#888";
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div onClick={onClick} style={{
        width: dims.w,
        cursor: onClick ? "pointer" : "default",
        borderRadius: 9,
        overflow: "hidden",
        border: `2px solid ${equipped ? rarColor : owned ? rarColor + "88" : "rgba(255,255,255,.08)"}`,
        background: "#15100d",
        boxShadow: equipped ? `0 0 18px ${rarColor}55,0 4px 14px rgba(0,0,0,.5)` : `0 4px 12px rgba(0,0,0,.4)`,
        transition: "transform .18s, border-color .18s, box-shadow .18s",
        filter: owned ? "none" : "grayscale(.85) brightness(.55)",
        position: "relative",
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.transform = ""; }}>
      <div style={{ position: "relative", aspectRatio: "241 / 495", overflow: "hidden", background: imgFailed ? `linear-gradient(165deg,${rarColor}22,#0a0604 60%)` : "#0a0604" }}>
        {!imgFailed ? (
          <img src={`/tarot/${card.id}.webp`} alt={card.title} loading="lazy" onError={() => setImgFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
        ) : (
          // Stylised placeholder: roman numeral, glyph, title.
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "14% 8%", fontFamily: "'Fraunces',serif", color: rarColor, textAlign: "center" }}>
            <div style={{ fontSize: dims.fs + 2, fontWeight: 700, letterSpacing: 2, opacity: .85 }}>{card.roman}</div>
            <div style={{ fontSize: Math.round(dims.w * 0.5), lineHeight: 1, filter: `drop-shadow(0 0 14px ${rarColor}88)`, opacity: .9 }}>{card.glyph || "✦"}</div>
            <div style={{ fontSize: Math.round(dims.fs * 0.78), fontStyle: "italic", letterSpacing: .5, opacity: .65, padding: "0 4%" }}>{card.title}</div>
          </div>
        )}
        {equipped && <div style={{ position: "absolute", top: 5, right: 5, background: rarColor, color: "#000", fontFamily: "Outfit,sans-serif", fontSize: 8, fontWeight: 900, padding: "2px 6px", borderRadius: 3, letterSpacing: 1, textTransform: "uppercase", boxShadow: `0 0 8px ${rarColor}` }}>Equipped</div>}
      </div>
      <div style={{ padding: "6px 7px 7px", borderTop: `1px solid ${rarColor}33`, background: "linear-gradient(to bottom,#1a1310,#0e0a08)" }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontStyle: "italic", fontSize: dims.fs, color: rarColor, textAlign: "center", letterSpacing: .3, lineHeight: 1.1 }}>{card.title}</div>
        <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 8, color: "rgba(255,255,255,.45)", textAlign: "center", marginTop: 2, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>{card.rarity}</div>
      </div>
    </div>
  );
}
