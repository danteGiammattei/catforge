import { useState, useRef, useEffect, useMemo } from "react";
import { RNG } from "../lib/coin.js";
import { GRID } from "../lib/data.js";

/* ─── DIG PIT ─────────────────────────────────────────────────────────────
 * 4×4 grid of soil cells. Player taps to dig. One cell hides the coin; the
 * rest are scrap. Cells have depths 1..shovelLevel+1. If the coin's cell
 * exceeds shovel level, "TOO DEEP" — needs an upgrade.
 *
 * Key features:
 *  - Coin cell is seed-deterministic (useMemo)
 *  - 18% of coins are exactly one level too deep (gating progression)
 *  - The Chariot tarot can override coin position to the first tap (firstStrikeBonus)
 *  - Dirt puff particles spawn on every tap for tactile feedback
 *  - Touch follower shows a pickaxe icon at finger position on mobile
 * ──────────────────────────────────────────────────────────────────────── */
export default function DigPit({ coin, shovelLevel, onFound, onTooDeep, onCellScrap, firstStrikeBonus = 0, t, isDark }) {
  // BUG FIX (historical): coin-cell depth was previously always reachable, so
  // the TOO DEEP gate could never fire. Now 18% of coins land exactly one
  // level too deep, which is what the shovel-upgrade economy was designed for.
  const { coinCell, depths } = useMemo(() => {
    const pRng = new RNG(coin.seed ^ 0xd16);
    const cc = pRng.int(0, GRID * GRID - 1);
    const ds = Array.from({ length: GRID * GRID }, (_, i) => {
      const d = new RNG(coin.seed ^ i ^ 0xd16);
      if (i === cc) {
        if (shovelLevel >= 8) return d.int(1, shovelLevel);                    // max shovel: never too-deep
        return d.bool(0.82) ? d.int(1, shovelLevel) : shovelLevel + 1;         // 18% are one level too deep
      }
      return d.int(1, Math.min(9, shovelLevel + 1));                           // non-coin cells: visual flavour only
    });
    return { coinCell: cc, depths: ds };
  }, [coin.seed, shovelLevel]);

  const [dug, setDug]                       = useState({});
  const [shake, setShake]                   = useState(null);
  const [found, setFound]                   = useState(null);
  const [touchPick, setTouchPick]           = useState(null);
  const [swingCell, setSwingCell]           = useState(null);
  const [dirtPuffs, setDirtPuffs]           = useState([]);
  const [coinCellOverride, setCoinCellOverride] = useState(null);
  const cntRef    = useRef(0);
  const puffIdRef = useRef(0);

  const effectiveCoinCell = coinCellOverride != null ? coinCellOverride : coinCell;

  // Reset all per-coin state when coin changes
  useEffect(() => {
    setDug({}); setShake(null); setFound(null);
    cntRef.current = 0;
    setTouchPick(null); setSwingCell(null);
    setCoinCellOverride(null); setDirtPuffs([]);
  }, [coin.seed]);

  const dig = (idx, e) => {
    if (dug[idx] || found !== null) return;

    // Per-cell swing animation feedback
    setSwingCell(idx);
    setTimeout(() => setSwingCell(c => c === idx ? null : c), 380);

    // Spawn dirt puff particles at the cell's screen position
    if (e?.currentTarget?.getBoundingClientRect) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const puffId = ++puffIdRef.current;
      const puffs = Array.from({ length: 8 }, (_, i) => ({
        id:   i,
        dx:   `${(Math.cos((i/8) * Math.PI * 2) * 28 + ((Math.random() - .5) * 18)).toFixed(1)}px`,
        dy:   `${(Math.sin((i/8) * Math.PI * 2) * 28 - 10 + ((Math.random() - .5) * 14)).toFixed(1)}px`,
        dr:   `${(Math.random() - .5) * 180}deg`,
        size: 4 + Math.random() * 5,
        dur:  `${(0.35 + Math.random() * 0.25).toFixed(2)}s`,
      }));
      setDirtPuffs(p => [...p, { id: puffId, x: cx, y: cy, puffs }]);
      setTimeout(() => setDirtPuffs(p => p.filter(x => x.id !== puffId)), 700);
    }

    // The Chariot tarot: on FIRST tap, with probability firstStrikeBonus, the
    // coin teleports to the tapped cell (instant find). Deterministic per coin
    // so refreshing doesn't change outcomes.
    let activeCoinCell = effectiveCoinCell;
    if (cntRef.current === 0 && firstStrikeBonus > 0 && coinCellOverride == null) {
      const sRng = new RNG(coin.seed ^ 0xc4a4);
      if (sRng.next() < firstStrikeBonus) {
        if (depths[idx] <= shovelLevel) {
          setCoinCellOverride(idx);
          activeCoinCell = idx;
        }
      }
    }

    if (idx === activeCoinCell && depths[idx] > shovelLevel) {
      setShake(idx);
      setTimeout(() => setShake(null), 500);
      onTooDeep(depths[idx]);
      return;
    }

    cntRef.current++; const cnt = cntRef.current;
    setDug(p => ({ ...p, [idx]: true }));
    if (idx === activeCoinCell) {
      setFound(idx);
      setTimeout(() => onFound(cnt, GRID * GRID), 600);
    } else if (onCellScrap) {
      const target = e?.currentTarget;
      requestAnimationFrame(() => {
        if (target?.getBoundingClientRect) onCellScrap(idx, target.getBoundingClientRect());
      });
    }
  };

  // Touch follower — show a pickaxe icon at the finger position so the player
  // can see where they're about to tap. Mouse uses the OS cursor instead.
  const trackPointer = (e) => {
    if (e.pointerType === "mouse") { setTouchPick(null); return; }
    setTouchPick({ x: e.clientX, y: e.clientY });
  };

  const cellSize = 64;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, position:"relative" }}>
      {touchPick && <div style={{ position:"fixed", left:touchPick.x, top:touchPick.y, pointerEvents:"none", zIndex:60, fontSize:34, transform:"translate(-50%,-90%) rotate(-25deg)", filter:"drop-shadow(0 2px 4px rgba(0,0,0,.7))" }}>⛏</div>}

      {/* Dirt puffs — fixed-positioned at cell center, fly outward via CSS vars */}
      {dirtPuffs.map(puff => (
        <div key={puff.id} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:65 }}>
          {puff.puffs.map(p => (
            <div key={p.id} style={{
              position:    "fixed",
              left:        puff.x, top: puff.y,
              width:       p.size, height: p.size,
              borderRadius:"50%",
              background:  `hsl(${20 + (p.id*4) % 20},${40 + (p.id*7) % 20}%,${30 + (p.id*5) % 20}%)`,
              animation:   `dirtPuff ${p.dur} ease-out forwards`,
              "--dx":      p.dx, "--dy": p.dy, "--dr": p.dr,
              pointerEvents:"none",
            }}/>
          ))}
        </div>
      ))}

      <div style={{ padding:12, paddingTop:18, background:isDark ? "linear-gradient(to bottom,#231408,#170c04)" : "linear-gradient(to bottom,#6a4218,#3a240c)", border:`3px solid ${isDark ? "#5a3c18" : "#8a5828"}`, borderRadius:16, boxShadow:`inset 0 6px 24px rgba(0,0,0,.7),0 8px 24px rgba(0,0,0,.4)`, position:"relative" }}
           onPointerMove={trackPointer} onPointerDown={trackPointer} onPointerLeave={() => setTouchPick(null)}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:14, background:"linear-gradient(to bottom,#8a5a28,#4a2c10)", borderRadius:"13px 13px 0 0", borderBottom:"1px solid #2a1808" }}/>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${GRID},1fr)`, gap:7 }}>
          {Array.from({ length: GRID * GRID }, (_, idx) => {
            const isDug      = !!dug[idx];
            const isFound    = found === idx;
            const isShaking  = shake === idx;
            const tooDeep    = isDug && idx === effectiveCoinCell && depths[idx] > shovelLevel;
            const isSwinging = swingCell === idx;
            const cr = new RNG(coin.seed ^ idx ^ 0xba5e);
            const sc = ["#c8a460","#c09858","#bfa066","#c8aa70","#d0b070"][cr.int(0, 4)];
            return (
              <div key={idx} onPointerDown={(e) => dig(idx, e)} style={{
                  width:cellSize, height:cellSize, borderRadius:9, position:"relative", overflow:"hidden",
                  border:`1.5px solid ${isDug ? "#3a2410" : isSwinging ? "#d4a01788" : "#6a4220"}`,
                  cursor:isDug ? "default" : "pointer",
                  animation: isShaking ? "shakeHard .4s ease-out"
                           : isFound   ? "scaleInSpring .45s cubic-bezier(.34,1.56,.64,1)"
                           : isDug     ? "cellImpact .3s ease-out"
                           : "none",
                  background: isDug ? (isFound ? "#1a2810" : tooDeep ? "#2a1408" : "#3a2210") : "transparent",
                  transition:"background .15s,border-color .15s",
                  touchAction:"manipulation",
                }}
                onMouseEnter={(e) => { if (!isDug) { e.currentTarget.style.borderColor = "#d4a017"; const h = e.currentTarget.querySelector(".hl"); if (h) h.style.opacity = "1"; } }}
                onMouseLeave={(e) => { if (!isDug) { e.currentTarget.style.borderColor = "#6a4220"; const h = e.currentTarget.querySelector(".hl"); if (h) h.style.opacity = "0"; } }}>
                {!isDug && <>
                  <div style={{ position:"absolute", inset:0, background:sc }}>
                    {cr.bool(.35) && <div style={{ position:"absolute", width:7, height:5, borderRadius:"50%", background:"#8a6030aa", top:`${cr.int(15, 70)}%`, left:`${cr.int(15, 70)}%` }}/>}
                    {cr.bool(.2)  && <div style={{ position:"absolute", width:3, height:3, borderRadius:"50%", background:"#604018cc", top:`${cr.int(20, 75)}%`, left:`${cr.int(20, 75)}%` }}/>}
                  </div>
                  <div className="hl" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.25)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity .12s" }}><span style={{ fontSize:30, filter:"drop-shadow(0 1px 2px rgba(0,0,0,.6))" }}>⛏</span></div>
                </>}
                {isDug && !isFound && !tooDeep && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ width:"78%", height:"78%", borderRadius:5, background:"#1e1008", boxShadow:"inset 0 2px 8px rgba(0,0,0,.85)" }}/></div>}
                {tooDeep && <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"VT323,monospace", fontSize:14, color:"#e04020", lineHeight:1, letterSpacing:1, textShadow:"0 0 8px #c0301088" }}><span>TOO</span><span>DEEP</span></div>}
                {isFound && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, animation:"digPop .35s ease-out" }}>✦</div>}
                {/* Per-cell swing animation — works on PC and mobile */}
                {isSwinging && <div key={`swing-${idx}-${cntRef.current}`} style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, pointerEvents:"none", animation:"pickSwingCell .38s ease-out forwards", filter:"drop-shadow(0 2px 4px rgba(0,0,0,.8))", zIndex:5 }}>⛏</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontFamily:"Outfit,sans-serif", fontSize:11, color:t.muted, letterSpacing:1, textTransform:"uppercase", fontWeight:600 }}>⛏ Shovel Lv.{shovelLevel} · Max depth {shovelLevel}</div>
    </div>
  );
}
