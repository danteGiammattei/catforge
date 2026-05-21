import { useState, useRef, useEffect } from "react";
import { drawCoin, coinRarity, coinValue } from "../lib/coin.js";
import { METALS, RARITIES, SHAPE_NAMES, coinImagePath } from "../lib/data.js";

/* ─── COIN MODAL ──────────────────────────────────────────────────────────
 * Full-screen modal with a 3D-feeling coin inspector. Drag to spin the coin
 * (perspective rotateX/Y); the canvas itself is flat 2D but with a moving
 * highlight + glint overlay it reads as dimensional.
 *
 * Esc closes. Background click closes. Inner content stops propagation so
 * dragging on the coin doesn't trigger close. */
export default function CoinModal({ coin, onClose, onToggleLock, onSell, t, isDark }) {
  const cvRef    = useRef();
  const rotRef   = useRef({ x: 12, y: 0 });
  const velRef   = useRef({ x: 0,  y: 0 });
  const dragging = useRef(false);
  const lastPos  = useRef(null);
  const rafRef   = useRef();
  const [rot, setRot] = useState({ x: 12, y: 0 });
  const m = METALS[coin.metalIdx];

  // Paint the coin onto the canvas. Prefer the illustrated coin image so
  // it matches what appears elsewhere; fall back to the procedural painter
  // if the image fails (404). The canvas stays so the existing rotation
  // transform + radial highlight + glint overlays continue to work.
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    cv.width = 220; cv.height = 220;
    const ctx = cv.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 220, 220);
      ctx.drawImage(img, 0, 0, 220, 220);
    };
    img.onerror = () => drawCoin(cv, coin, 220);
    img.src = coinImagePath(coin);
  }, [coin.seed, coin.metalIdx, coin.shiny]);

  // Inertial spin loop — when not dragging, velocity decays and rotation drifts
  useEffect(() => {
    const loop = () => {
      if (!dragging.current) {
        velRef.current.x *= 0.92; velRef.current.y *= 0.92;
        rotRef.current.y += velRef.current.x;
        rotRef.current.x = Math.max(-55, Math.min(55, rotRef.current.x + velRef.current.y));
        if (Math.abs(velRef.current.x) > .04 || Math.abs(velRef.current.y) > .04) {
          setRot({ x: rotRef.current.x, y: rotRef.current.y });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Esc-to-close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const gp = (e) => e.touches
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX, y: e.clientY };

  const onStart = (e) => { dragging.current = true; lastPos.current = gp(e); velRef.current = { x: 0, y: 0 }; e.stopPropagation(); };
  const onMove  = (e) => {
    if (!dragging.current || !lastPos.current) return;
    const p = gp(e);
    const dx = p.x - lastPos.current.x, dy = p.y - lastPos.current.y;
    velRef.current = { x: dx * .55, y: dy * .4 };
    rotRef.current.y += dx * .55;
    rotRef.current.x  = Math.max(-55, Math.min(55, rotRef.current.x + dy * .4));
    setRot({ x: rotRef.current.x, y: rotRef.current.y });
    lastPos.current = p;
  };
  const onEnd = () => { dragging.current = false; lastPos.current = null; };

  // Highlight position tracks rotation — fakes a light source on the coin face
  const nx = rot.y / 55, ny = rot.x / 55;
  const hlX = 50 + nx * 35, hlY = 50 - ny * 35;
  const tiltMag     = Math.hypot(nx, ny);
  const glintOpacity = coin.shiny ? Math.max(0, .85 - tiltMag * .6) : 0;
  const glintAngle   = Math.atan2(ny, nx) * (180 / Math.PI) + 90;

  const F  = { fontFamily: "Outfit,sans-serif" };
  const VT = { fontFamily: "VT323,monospace" };
  const FR = { fontFamily: "'Fraunces',serif" };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", animation:"fadeinSlow .25s ease" }} onClick={onClose}>
      <div style={{ position:"absolute", inset:0, backdropFilter:"blur(28px)", background:"rgba(8,4,2,.78)" }}/>
      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:18, padding:"28px 22px", maxWidth:360, width:"100%", animation:"scaleIn .3s cubic-bezier(.2,.9,.3,1.1)" }} onClick={e => e.stopPropagation()}>
        <div style={{ cursor:"grab", userSelect:"none", touchAction:"none" }}
             onMouseDown={onStart}  onMouseMove={onMove}  onMouseUp={onEnd}  onMouseLeave={onEnd}
             onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
          <div style={{ transform:`perspective(560px) rotateY(${rot.y}deg) rotateX(${-rot.x}deg)`, position:"relative", display:"inline-block", filter:`drop-shadow(0 ${14 + rot.x * .2}px ${32 + Math.abs(rot.y) * .2}px ${m.flash})` }}>
            <canvas ref={cvRef} style={{ imageRendering:"pixelated", display:"block", width:220, height:220 }}/>
            <div style={{ position:"absolute", inset:0, borderRadius:coin.shape === "round" ? "50%" : coin.shape === "oval" ? "50%" : "8px", background:`radial-gradient(circle at ${hlX}% ${hlY}%, rgba(255,255,255,${.24 + tiltMag * .12}), rgba(255,255,255,.03) 55%, transparent 80%)`, pointerEvents:"none", mixBlendMode:"screen" }}/>
            {coin.shiny && <div style={{ position:"absolute", inset:0, borderRadius:coin.shape === "round" ? "50%" : coin.shape === "oval" ? "50%" : "8px", background:`linear-gradient(${glintAngle}deg, transparent 25%, ${m.hl}cc 50%, transparent 75%)`, opacity:glintOpacity, pointerEvents:"none", mixBlendMode:"screen", transition:"opacity .15s" }}/>}
          </div>
        </div>
        <div style={{ ...F, fontSize:10, color:"rgba(245,230,200,.32)", letterSpacing:3, textTransform:"uppercase" }}>drag · spin · esc to close</div>

        <div style={{ width:"100%", background:"rgba(245,230,200,.04)", borderRadius:14, border:`1px solid ${m.eng}55`, overflow:"hidden", boxShadow:`0 12px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05)` }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(245,230,200,.06)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ ...VT, fontSize:28, color:m.hl, letterSpacing:5, lineHeight:1 }}>{coin.runes}</div>
              <div style={{ ...FR, fontStyle:"italic", fontSize:14, fontWeight:600, color:"rgba(245,230,200,.72)", marginTop:3, letterSpacing:1.5 }}>{coin.raw}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ ...F, fontSize:11, fontWeight:800, color:RARITIES[coinRarity(coin)].color, letterSpacing:3, textTransform:"uppercase", textShadow:`0 0 8px ${RARITIES[coinRarity(coin)].glow}` }}>{RARITIES[coinRarity(coin)].name}</div>
              {coin.shiny && <div style={{ fontSize:10, fontWeight:800, marginTop:2, animation:"shinyText 1s linear infinite", fontFamily:"Outfit,sans-serif", letterSpacing:2 }}>✦ SHINY</div>}
            </div>
          </div>
          <div style={{ padding:"12px 18px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["Rarity", RARITIES[coinRarity(coin)].name], ["Metal", m.name], ["Shape", SHAPE_NAMES[coin.shape] || coin.shape], ["Condition", coin.cond], ["Weight", `${coin.wt}g`], ["Value", `◈ ${coinValue(coin).toLocaleString()}`]].map(([k, v]) => (
              <div key={k}>
                <div style={{ ...F, fontSize:9, color:"rgba(245,230,200,.32)", fontWeight:700, textTransform:"uppercase", letterSpacing:2 }}>{k}</div>
                <div style={{ ...F, fontSize:13, color:k === "Value" ? "#f0c850" : k === "Rarity" ? RARITIES[coinRarity(coin)].color : "rgba(245,230,200,.86)", marginTop:2, fontWeight:(k === "Value" || k === "Rarity") ? 700 : 500 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"10px 18px 14px", borderTop:"1px solid rgba(245,230,200,.05)", ...FR, fontStyle:"italic", fontSize:11, color:"rgba(245,230,200,.4)", lineHeight:1.5 }}>{coin.era}</div>
        </div>

        <div style={{ display:"flex", gap:8, width:"100%", flexWrap:"wrap" }}>
          {onToggleLock && <button onClick={() => onToggleLock(coin.id)} style={{ flex:"1 1 130px", padding:"11px 0", borderRadius:11, border:`1px solid ${coin.locked ? "rgba(212,160,23,.55)" : "rgba(245,230,200,.16)"}`, background:coin.locked ? "rgba(212,160,23,.16)" : "rgba(245,230,200,.06)", cursor:"pointer", ...F, fontWeight:700, fontSize:13, color:coin.locked ? "#f0c850" : "rgba(245,230,200,.7)", letterSpacing:1.5, textTransform:"uppercase", transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <span style={{ fontSize:14 }}>{coin.locked ? "🔒" : "🔓"}</span>
            {coin.locked ? "Locked" : "Lock"}
          </button>}
          {onSell && !coin.locked && <button onClick={() => { if (confirm(`Sell this coin for ◈${coinValue(coin).toLocaleString()}?`)) onSell(coin.id); }} style={{ flex:"1 1 130px", padding:"11px 0", borderRadius:11, border:"1px solid rgba(212,160,23,.35)", background:"linear-gradient(135deg,rgba(212,160,23,.12),rgba(212,160,23,.04))", cursor:"pointer", ...F, fontWeight:700, fontSize:13, color:"#f0c850", letterSpacing:1.5, textTransform:"uppercase", transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <span>◈</span> Sell · {coinValue(coin).toLocaleString()}
          </button>}
          <button onClick={onClose} style={{ flex:"1 1 80px", padding:"11px 16px", borderRadius:11, border:"1px solid rgba(245,230,200,.16)", background:"rgba(245,230,200,.06)", cursor:"pointer", ...F, fontWeight:700, fontSize:13, color:"rgba(245,230,200,.7)", letterSpacing:2, textTransform:"uppercase" }}>Close</button>
        </div>
        {onToggleLock && <div style={{ ...FR, fontStyle:"italic", fontSize:11, color:"rgba(245,230,200,.4)", textAlign:"center", lineHeight:1.5, marginTop:-4, maxWidth:300 }}>
          {coin.locked ? "This coin is protected — locked coins can't be forged, wagered, or sold." : "Lock to protect from forge sacrifices, bets, and accidental sales."}
        </div>}
      </div>
    </div>
  );
}
