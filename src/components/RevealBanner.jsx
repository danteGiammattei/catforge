import { useState, useEffect } from "react";
import CoinCanvas from "./CoinCanvas.jsx";
import Particles from "./Particles.jsx";
import { coinRarity } from "../lib/coin.js";
import { METALS, RARITIES, SHAPE_NAMES } from "../lib/data.js";

/* ─── REVEAL BANNER ───────────────────────────────────────────────────────
 * Full-screen modal shown after brushing a coin clean. Highlights the rarity
 * with a spring entrance, the coin emerges from a desaturated state, and
 * shiny finds get a warm gold halo + rotating sweep (no rainbow). */
export default function RevealBanner({ coin, onDone }) {
  const m            = METALS[coin.metalIdx];
  const rIdx         = coinRarity(coin);
  const r            = RARITIES[rIdx];
  const isShiny      = coin.shiny;
  const isHighRarity = rIdx >= 4; // Legendary or Mythic
  const [showParticles, setShowParticles] = useState(isShiny || isHighRarity);

  useEffect(() => {
    const t = setTimeout(onDone, (isShiny || isHighRarity) ? 4000 : 3000);
    return () => clearTimeout(t);
  }, [onDone, isShiny, isHighRarity]);

  useEffect(() => {
    if (isShiny || isHighRarity) {
      const t = setTimeout(() => setShowParticles(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isShiny, isHighRarity]);

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", background:isShiny ? "rgba(0,0,0,.95)" : "rgba(8,4,2,.92)", backdropFilter:"blur(14px)", transition:"background .5s" }}
      onClick={onDone}
    >
      {(isShiny || isHighRarity) && <Particles active={showParticles} type="shiny" origin={{ x:50, y:45 }}/>}

      {/* Shiny aura — warm gold radial halo (no arcade rainbow). The rotating
          sweep adds a subtle highlight pass, never a full rotation. */}
      {isShiny && <div style={{ position:"absolute", width:340, height:340, borderRadius:"50%", background:`radial-gradient(circle,${m.hl}55 0%,${m.hl}22 40%,transparent 70%)`, animation:"subtlePulse 2.4s ease-in-out infinite", pointerEvents:"none", filter:"blur(6px)" }}/>}
      {isShiny && <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%", background:`conic-gradient(from 0deg, transparent 0%, ${m.hl}66 12%, transparent 24%, transparent 100%)`, animation:"shinyRotate 4s linear infinite", pointerEvents:"none", opacity:.55, mixBlendMode:"screen" }}/>}
      {!isShiny && isHighRarity && <div style={{ position:"absolute", width:280, height:280, borderRadius:"50%", background:`radial-gradient(circle,${r.color}55,transparent 70%)`, animation:"subtlePulse 2s ease-in-out infinite", pointerEvents:"none", filter:"blur(8px)" }}/>}

      <div style={{ textAlign:"center", animation:"flashIn .5s cubic-bezier(.2,.8,.3,1) forwards", padding:"0 24px", position:"relative", zIndex:1, maxWidth:420 }}>
        {isShiny && <div style={{ fontFamily:"Outfit,sans-serif", fontSize:13, fontWeight:800, letterSpacing:5, marginBottom:14, color:m.hl, textShadow:`0 0 14px ${m.hl}88` }}>✦ SHINY DISCOVERED ✦</div>}

        {/* Big rarity headline — flashInBig spring entrance */}
        <div style={{
          fontFamily:"'Fraunces',serif", fontWeight:900, fontStyle:"italic",
          fontSize:isHighRarity ? 34 : 24, letterSpacing:-.5,
          color:r.color, marginBottom:6,
          textShadow:isHighRarity ? `0 0 24px ${r.glow},0 2px 8px rgba(0,0,0,.6)` : `0 0 12px ${r.glow}`,
          lineHeight:1,
          animation:"flashInBig .55s cubic-bezier(.2,.9,.3,1.15) forwards",
        }}>{r.name}</div>

        {coin.digBonus === "first"   && <div style={{ fontFamily:"Outfit,sans-serif", fontSize:10, fontWeight:800, color:"#ffd060", letterSpacing:4, marginBottom:14, textTransform:"uppercase", textShadow:"0 0 12px rgba(255,208,96,.6)" }}>★ First-try strike</div>}
        {coin.digBonus === "lucky"   && <div style={{ fontFamily:"Outfit,sans-serif", fontSize:10, fontWeight:700, color:"#7ad888", letterSpacing:4, marginBottom:14, textTransform:"uppercase" }}>⚡ Lucky find</div>}
        {coin.digBonus === "damaged" && <div style={{ fontFamily:"Outfit,sans-serif", fontSize:10, fontWeight:700, color:"#e07050", letterSpacing:4, marginBottom:14, textTransform:"uppercase" }}>✕ Over-excavated</div>}
        {!coin.digBonus              && <div style={{ height:14, marginBottom:8 }}/>}

        <div style={{ display:"flex", justifyContent:"center", marginBottom:18, position:"relative" }}>
          {/* Coin emerges from desaturated dark — like surfacing from soil */}
          <div style={{ animation:"coinEmerge .8s ease-out .15s both" }}>
            <CoinCanvas coin={coin} size={180}/>
          </div>
          {/* Six rays — metal hue when shiny, rarity color when high-rarity */}
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <div key={deg} style={{
              position:"absolute", top:"50%", left:"50%",
              width:2, height:isShiny ? 78 : 58,
              background:`linear-gradient(to top,transparent,${isShiny ? m.hl : r.color}aa)`,
              transform:`translate(-50%,-100%) rotate(${deg}deg)`,
              transformOrigin:"bottom center",
              animation:"subtlePulse 1.4s ease-in-out infinite",
              animationDelay:`${deg / 300 * .4}s`,
            }}/>
          ))}
        </div>

        {/* Metal pill — secondary descriptor (type, not rarity) */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:10,
          padding:"5px 16px", background:m.flash,
          border:`1px solid ${m.accent}66`, borderRadius:3, marginBottom:14,
          fontFamily:"Outfit,sans-serif", fontSize:11, fontWeight:800, color:m.hl,
          letterSpacing:4, textTransform:"uppercase",
          animation:`rarityFlash .9s ease-in-out ${isShiny ? 0 : 3}`,
        }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:m.hl, boxShadow:`0 0 6px ${m.hl}` }}/>
          {m.name} · {SHAPE_NAMES[coin.shape] || coin.shape}{isShiny ? " ✦" : ""}
          <span style={{ width:5, height:5, borderRadius:"50%", background:m.hl, boxShadow:`0 0 6px ${m.hl}` }}/>
        </div>

        <div style={{ fontFamily:"VT323,monospace", fontSize:isShiny ? 56 : 50, letterSpacing:6, lineHeight:1, marginBottom:6, color:m.hl, textShadow:isShiny ? `0 0 12px ${m.hl}66` : undefined }}>{coin.runes}</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontStyle:"italic", fontWeight:600, fontSize:18, color:"#b8a890", letterSpacing:3, marginBottom:6 }}>{coin.raw}</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontStyle:"italic", fontSize:12, color:"#5a4a38", letterSpacing:.5 }}>{coin.era}</div>

        {coin.scrapEarned > 0 && (
          <div style={{ marginTop:14, padding:"7px 14px", display:"inline-flex", alignItems:"center", gap:8, background:"rgba(212,160,23,.08)", border:"1px solid rgba(212,160,23,.22)", borderRadius:6, fontFamily:"Outfit,sans-serif", fontSize:11, fontWeight:700, color:"#d4a017", letterSpacing:1.5, animation:"flashIn .5s ease-out .3s backwards" }}>
            <span style={{ fontSize:13 }}>⚙</span>
            Bonus scrap · ◈ {coin.scrapEarned}
          </div>
        )}

        <div style={{ fontFamily:"Outfit,sans-serif", fontSize:10, color:"#3a3024", marginTop:18, letterSpacing:3, textTransform:"uppercase" }}>tap to continue</div>
      </div>
    </div>
  );
}
