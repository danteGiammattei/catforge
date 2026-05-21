import { useState, useRef, useEffect } from "react";
import { useGame } from "../lib/GameContext.js";
import { mkCoin, newSeed, lvl } from "../lib/coin.js";
import { rollOreMetal } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";

/* ─── IDLE FIELD ───────────────────────────────────────────────────────────
 * Demo of a new game direction: comfy idle game in a Cats-and-Soup style.
 * Always-on full-screen pastel field with a cat that mines coins from a
 * small building. Tap the mine, the cat goes in, comes out holding a coin.
 *
 * SCOPE (DEMO): single building, single cat, one coin per cycle. The
 * full project would add: multiple building slots, more cat variants,
 * resource counters, auto-collect timers, building upgrade tracks, etc.
 *
 * REUSED FROM EXISTING APP: procedural coin renderer (CoinCanvas/mkCoin)
 * and the player's level/xp for coin tier rolls. Nothing else is needed
 * to feel the loop.
 * ────────────────────────────────────────────────────────────────────── */

// Demo timing — total cycle is ~5s for satisfying-but-not-slow rhythm.
const T_WALK_IN_MS  = 1200;
const T_MINING_MS   = 1600;
const T_WALK_OUT_MS = 1200;
const T_PRESENT_MS  = 1400;

// Pastel palette — soft, warm, low saturation. Anchored on mint + cream.
const P = {
  skyTop:     "#bee7d7",
  skyBottom:  "#e8f5e9",
  grassTop:   "#8dca91",
  grassMid:   "#7ab97e",
  grassDark:  "#5fa063",
  groundShade:"rgba(0,0,0,0.10)",
  cream:      "#fff7e1",
  peach:      "#ffd1bd",
  panel:      "rgba(255,255,255,0.92)",
  text:       "#3a3a3a",
  textMuted:  "#7a7a7a",
  accent:     "#ff9a76",
};

export default function IdleField() {
  const { xp, oreCounts, addOre, coins } = useGame();
  const playerLevel = lvl(xp);

  // Cat state machine: idle → walking_in → mining → walking_out → presenting → idle
  const [catState, setCatState] = useState("idle");
  const [currentCoin, setCurrentCoin] = useState(null);
  const [recentCoins, setRecentCoins] = useState([]); // last 4 collected
  const [menuOpen, setMenuOpen] = useState(false);
  const timeoutsRef = useRef([]);

  // Cleanup timeouts on unmount so a quick tab-switch mid-cycle doesn't
  // leave dangling state changes after the component is gone.
  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const handleMineClick = () => {
    if (catState !== "idle") return;

    setCatState("walking_in");
    const t1 = setTimeout(() => setCatState("mining"), T_WALK_IN_MS);
    const t2 = setTimeout(() => {
      // Roll a coin — uses player level for tier weighting, random metal.
      // Real game would have building-specific drop tables here.
      const metalIdx = rollOreMetal(Math.random());
      const coin = mkCoin(newSeed(), playerLevel, metalIdx);
      setCurrentCoin(coin);
      setCatState("walking_out");
    }, T_WALK_IN_MS + T_MINING_MS);
    const t3 = setTimeout(() => setCatState("presenting"),
      T_WALK_IN_MS + T_MINING_MS + T_WALK_OUT_MS);
    const t4 = setTimeout(() => {
      // Commit: prepend to recent tray (cap 4), clear current.
      setRecentCoins(prev => {
        const next = currentCoinRef.current
          ? [currentCoinRef.current, ...prev].slice(0, 4) : prev;
        return next;
      });
      setCurrentCoin(null);
      setCatState("idle");
    }, T_WALK_IN_MS + T_MINING_MS + T_WALK_OUT_MS + T_PRESENT_MS);

    timeoutsRef.current.push(t1, t2, t3, t4);
  };

  // Keep a ref of currentCoin so the final timeout sees the latest value
  // (setState during a timeout chain can be stale).
  const currentCoinRef = useRef(currentCoin);
  useEffect(() => { currentCoinRef.current = currentCoin; }, [currentCoin]);

  return (
    <div style={{
      position:"absolute", inset:0,
      overflow:"hidden",
      // Sky → grass-line: split horizontally at 55% so the field reads
      // as "horizon up top, grass underfoot".
      background: `linear-gradient(180deg, ${P.skyTop} 0%, ${P.skyBottom} 45%, ${P.grassTop} 55%, ${P.grassMid} 100%)`,
      fontFamily:"'Quicksand','Nunito',system-ui,sans-serif",
    }}>
      {/* Scoped keyframes — local to this component so they don't leak. */}
      <style>{`
        @keyframes idleCatBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes idleParticle {
          0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
          15%  { opacity: 0.6; }
          85%  { opacity: 0.6; }
          100% { transform: translate(var(--dx), 100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes minePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes mineThinking {
          0%,100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-1px) rotate(-0.5deg); }
          75% { transform: translateX(1px) rotate(0.5deg); }
        }
        @keyframes coinPopIn {
          0%   { transform: scale(0) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.15) translateY(-8px); opacity: 1; }
          100% { transform: scale(1) translateY(-4px); opacity: 1; }
        }
        @keyframes coinFloat { 0%,100% { transform: translateY(-4px); } 50% { transform: translateY(-10px); } }
        @keyframes catWalkIn  { from { transform: translateX(0); opacity: 1; } to { transform: translateX(70px) scale(0.85); opacity: 0; } }
        @keyframes catWalkOut { from { transform: translateX(70px) scale(0.85); opacity: 0; } 20% { opacity: 1; } to { transform: translateX(0) scale(1); opacity: 1; } }
        @keyframes mineDust {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          50% { transform: translateY(-15px) scale(1); opacity: 0.7; }
          100% { transform: translateY(-30px) scale(0.5); opacity: 0; }
        }
        @keyframes drawerSlide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {/* Ambient drifting particles — leaves/sparkles for that comfy idle
          feel. 8 particles staggered. Pure CSS, no JS. */}
      {Array.from({length:8}).map((_,i)=>(
        <div key={i} aria-hidden style={{
          position:"absolute",
          left: `${10 + i*11}%`,
          top: `-10%`,
          fontSize: 14 + (i%3)*4,
          opacity: 0,
          animation: `idleParticle ${18 + i*2}s linear infinite`,
          animationDelay: `${i*2.5}s`,
          // dx for sideways drift
          ["--dx"]: `${(i%2===0 ? 1 : -1) * (10 + i*5)}px`,
          pointerEvents:"none",
        }}>{i%3===0?"🍃":i%3===1?"✿":"·"}</div>
      ))}

      {/* HAMBURGER — top-left, opens a side drawer. Drawer items are
          placeholders that route to the existing tabs so the demo
          isn't navigation-dead. */}
      <button
        onClick={()=>setMenuOpen(true)}
        aria-label="Menu"
        style={{
          position:"absolute", top:14, left:14, zIndex:50,
          width:44, height:44, borderRadius:14,
          background:P.panel, border:"none",
          boxShadow:"0 2px 8px rgba(0,0,0,0.12)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", padding:0,
        }}>
        <div style={{display:"flex", flexDirection:"column", gap:4}}>
          <div style={{width:18, height:2.5, background:P.text, borderRadius:2}}/>
          <div style={{width:18, height:2.5, background:P.text, borderRadius:2}}/>
          <div style={{width:18, height:2.5, background:P.text, borderRadius:2}}/>
        </div>
      </button>

      {/* Level + xp pill — top right. Subtle progress nag. */}
      <div style={{
        position:"absolute", top:14, right:14, zIndex:40,
        padding:"8px 14px", borderRadius:14,
        background:P.panel,
        boxShadow:"0 2px 8px rgba(0,0,0,0.12)",
        fontSize:13, fontWeight:700, color:P.text,
      }}>
        Lv {playerLevel} · {coins.length} coins
      </div>

      {/* RECENT FINDS — bottom-center row, last 4 coins via CoinCanvas */}
      {recentCoins.length>0 && (
        <div style={{
          position:"absolute", bottom:20, left:"50%",
          transform:"translateX(-50%)", zIndex:30,
          padding:"8px 14px", borderRadius:18,
          background:P.panel, boxShadow:"0 2px 10px rgba(0,0,0,0.12)",
          display:"flex", gap:8, alignItems:"center",
        }}>
          <span style={{fontSize:11, fontWeight:700, color:P.textMuted, marginRight:4}}>RECENT</span>
          {recentCoins.map((c,i)=>(
            <CoinCanvas key={c.id || i} coin={c} size={32}/>
          ))}
        </div>
      )}

      {/* ─── THE FIELD ──────────────────────────────────────────────────
          Centered on a "spot" where the mine sits. The mine, cat, and
          coin are all anchored to a horizontal centerline at ~62% of
          viewport height (just below the sky/grass split). */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, bottom:0,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
      }}>
        {/* Subtle distant hills silhouette in the sky */}
        <svg viewBox="0 0 400 60" preserveAspectRatio="none"
          style={{
            position:"absolute", top:"42%", left:0, right:0,
            width:"100%", height:60, opacity:0.35, pointerEvents:"none",
          }}>
          <path d="M0 50 Q60 20 120 35 Q180 50 240 25 Q300 5 360 30 Q400 50 400 60 L0 60 Z" fill="#9bd4af"/>
        </svg>

        {/* MINE BUILDING + CAT — wrapper centered, click area is the mine */}
        <div style={{
          position:"relative",
          width:200, height:180,
          marginTop:"4%",
        }}>
          {/* Ground shadow disc */}
          <div style={{
            position:"absolute", bottom:8, left:"50%",
            transform:"translateX(-50%)",
            width:170, height:14, borderRadius:"50%",
            background:P.groundShade, filter:"blur(4px)",
          }}/>

          {/* Dust puffs while mining */}
          {catState==="mining" && Array.from({length:3}).map((_,i)=>(
            <div key={i} style={{
              position:"absolute",
              top:50, left: 90 + i*8,
              width:8, height:8, borderRadius:"50%",
              background:"rgba(180,150,120,0.6)",
              animation:`mineDust 1.2s ease-out infinite`,
              animationDelay:`${i*0.2}s`,
              pointerEvents:"none",
            }}/>
          ))}

          {/* MINE SVG — clickable */}
          <button
            onClick={handleMineClick}
            aria-label="Send cat to mine"
            disabled={catState !== "idle"}
            style={{
              position:"absolute", inset:0,
              border:"none", background:"transparent",
              cursor: catState==="idle" ? "pointer" : "default",
              padding:0,
              // Subtle pulse when idle to indicate clickability;
              // shake when mining; static otherwise.
              animation: catState==="idle"   ? "minePulse 2.4s ease-in-out infinite"
                       : catState==="mining" ? "mineThinking 0.4s ease-in-out infinite"
                       : "none",
            }}>
            <MineSvg/>
          </button>

          {/* CAT — left of the mine when idle, animates into/out of door */}
          <div
            aria-hidden
            style={{
              position:"absolute",
              left: 30,
              bottom: 16,
              width: 56, height: 56,
              animation:
                catState==="walking_in"  ? `catWalkIn ${T_WALK_IN_MS}ms ease-in forwards` :
                catState==="walking_out" ? `catWalkOut ${T_WALK_OUT_MS}ms ease-out forwards` :
                catState==="mining"      ? "none" :  // hidden (still inside)
                catState==="idle"        ? "idleCatBob 2s ease-in-out infinite" :
                                           "idleCatBob 2s ease-in-out infinite", // presenting
              opacity: catState==="mining" ? 0 : 1,
              pointerEvents:"none",
              transition: "opacity 0.2s",
            }}>
            <CatSvg/>
          </div>

          {/* COIN — pops above the cat when presenting */}
          {currentCoin && (catState==="walking_out" || catState==="presenting") && (
            <div style={{
              position:"absolute",
              left: 38, // above the cat
              bottom: 70,
              width: 48, height: 48,
              animation: catState==="walking_out"
                ? "coinPopIn 0.6s ease-out forwards"
                : "coinFloat 1.6s ease-in-out infinite",
              pointerEvents:"none",
              filter:"drop-shadow(0 4px 6px rgba(0,0,0,0.2))",
            }}>
              <CoinCanvas coin={currentCoin} size={48}/>
            </div>
          )}
        </div>

        {/* "Add building" hint — visual only, shows what expansion looks like */}
        <div style={{
          marginTop: 28,
          display:"flex", gap:12, alignItems:"center",
        }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{
              width:50, height:50, borderRadius:14,
              border:`2px dashed rgba(255,255,255,0.55)`,
              background:"rgba(255,255,255,0.22)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"rgba(255,255,255,0.8)", fontSize:18, fontWeight:700,
            }}>+</div>
          ))}
        </div>
        <div style={{
          marginTop:8, fontSize:11, fontWeight:700,
          color:"rgba(255,255,255,0.85)", textShadow:"0 1px 2px rgba(0,0,0,0.15)",
          letterSpacing:1.5, textTransform:"uppercase",
        }}>
          Expand your village
        </div>
      </div>

      {/* ─── HAMBURGER DRAWER ─────────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div onClick={()=>setMenuOpen(false)} style={{
            position:"absolute", inset:0, zIndex:60,
            background:"rgba(0,0,0,0.35)",
          }}/>
          <div style={{
            position:"absolute", top:0, left:0, bottom:0, zIndex:70,
            width: "min(82vw, 320px)",
            background: P.cream,
            boxShadow:"4px 0 18px rgba(0,0,0,0.18)",
            padding:"24px 18px",
            animation:"drawerSlide 0.22s ease-out",
            display:"flex", flexDirection:"column", gap:8,
          }}>
            <div style={{fontWeight:800, fontSize:20, color:P.text, marginBottom:14, paddingLeft:6}}>
              MintForge
            </div>
            {[
              ["🏛️", "Vault",   "vault"],
              ["👤", "Profile", "profile"],
              ["👥", "Social",  "social"],
              ["⚒️", "Forge",   "forge"],
              ["🍻", "Tavern",  "tavern"],
            ].map(([icon, label, tab])=>(
              <button key={tab}
                onClick={()=>{
                  setMenuOpen(false);
                  // Wire to real tab switching when integrated — for now
                  // just close the drawer. window.dispatchEvent or context
                  // setTab() would route here.
                }}
                style={{
                  display:"flex", alignItems:"center", gap:14,
                  padding:"12px 14px", borderRadius:12,
                  background:"transparent", border:"none",
                  cursor:"pointer", fontSize:15, fontWeight:600,
                  color:P.text, textAlign:"left",
                  transition:"background 0.15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background=P.peach}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:22}}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── SVG COMPONENTS ───────────────────────────────────────────────────── */

function MineSvg() {
  return (
    <svg viewBox="0 0 200 180" width={200} height={180} style={{display:"block"}}>
      {/* Base shadow */}
      <ellipse cx="100" cy="168" rx="78" ry="6" fill="rgba(0,0,0,0.18)"/>

      {/* Side rocks for cute decoration */}
      <ellipse cx="32"  cy="156" rx="14" ry="9"  fill="#a89685"/>
      <ellipse cx="32"  cy="153" rx="10" ry="6"  fill="#c9b8a6"/>
      <ellipse cx="172" cy="158" rx="11" ry="7"  fill="#a89685"/>
      <ellipse cx="172" cy="155" rx="8"  ry="5"  fill="#c9b8a6"/>

      {/* Mountain mound behind the door (the "mine" entrance is cut into a small hill) */}
      <path d="M 28 160 Q 50 60 100 50 Q 150 60 172 160 Z" fill="#a89685"/>
      <path d="M 28 160 Q 50 60 100 50 Q 150 60 172 160 Z" fill="url(#mountainShade)"/>

      {/* Grass tufts on top of the mound */}
      <circle cx="80"  cy="62" r="6" fill="#8dca91"/>
      <circle cx="100" cy="55" r="7" fill="#8dca91"/>
      <circle cx="118" cy="64" r="6" fill="#8dca91"/>

      {/* Door frame — wooden arch */}
      <path d="M 70 160 L 70 110 Q 100 80 130 110 L 130 160 Z" fill="#7a5a3a"/>
      <path d="M 76 160 L 76 113 Q 100 88 124 113 L 124 160 Z" fill="#3a2614"/>

      {/* Wooden door frame highlights */}
      <path d="M 70 160 L 70 110 Q 100 80 130 110" stroke="#8b6a45" strokeWidth="3" fill="none"/>
      <rect x="68" y="112" width="4" height="48" fill="#5a3f24"/>
      <rect x="128" y="112" width="4" height="48" fill="#5a3f24"/>

      {/* Tiny sign above */}
      <rect x="84" y="92" width="32" height="14" rx="3" fill="#fff7e1" stroke="#8b6a45" strokeWidth="1.5"/>
      <text x="100" y="102" textAnchor="middle" fontSize="9" fontWeight="700" fill="#5a3f24" fontFamily="system-ui">MINE</text>

      {/* Little hanging lantern */}
      <line x1="62" y1="100" x2="62" y2="112" stroke="#5a3f24" strokeWidth="1.5"/>
      <circle cx="62" cy="118" r="5" fill="#ffd166"/>
      <circle cx="62" cy="118" r="5" fill="none" stroke="#5a3f24" strokeWidth="1.5"/>

      <defs>
        <linearGradient id="mountainShade" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.0)"/>
          <stop offset="1" stopColor="rgba(0,0,0,0.18)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function CatSvg() {
  return (
    <svg viewBox="0 0 56 56" width={56} height={56} style={{display:"block"}}>
      {/* Tail — curved up behind */}
      <path d="M 12 34 Q 4 28 8 18" stroke="#d4a574" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <path d="M 12 34 Q 4 28 8 18" stroke="#b88556" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="2 6"/>

      {/* Body — chunky oval */}
      <ellipse cx="28" cy="38" rx="16" ry="11" fill="#d4a574"/>
      <ellipse cx="28" cy="38" rx="16" ry="11" fill="url(#catShade)"/>

      {/* Stripes on body */}
      <path d="M 18 32 Q 28 35 38 32" stroke="#b88556" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <path d="M 20 40 Q 28 43 36 40" stroke="#b88556" strokeWidth="1.5" fill="none" opacity="0.4"/>

      {/* Legs (just front two visible) */}
      <rect x="20" y="44" width="5" height="7" rx="2" fill="#d4a574"/>
      <rect x="31" y="44" width="5" height="7" rx="2" fill="#d4a574"/>

      {/* Head */}
      <circle cx="28" cy="20" r="11" fill="#d4a574"/>
      <circle cx="28" cy="20" r="11" fill="url(#catShade)"/>

      {/* Ears */}
      <path d="M 19 14 L 17 6 L 24 11 Z" fill="#d4a574"/>
      <path d="M 19 14 L 17 6 L 24 11 Z" fill="#b88556" opacity="0.4"/>
      <path d="M 37 14 L 39 6 L 32 11 Z" fill="#d4a574"/>
      <path d="M 37 14 L 39 6 L 32 11 Z" fill="#b88556" opacity="0.4"/>
      <path d="M 20 12 L 19 9 L 22 11 Z" fill="#ffb6a8"/>
      <path d="M 36 12 L 37 9 L 34 11 Z" fill="#ffb6a8"/>

      {/* Eyes — closed/content (small curves) */}
      <path d="M 23 20 Q 24.5 22 26 20" stroke="#3a2614" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M 30 20 Q 31.5 22 33 20" stroke="#3a2614" strokeWidth="1.4" fill="none" strokeLinecap="round"/>

      {/* Nose + mouth */}
      <path d="M 27 23 L 28 24 L 29 23 Z" fill="#ff9a8b"/>
      <path d="M 28 24 Q 28 26 26 26" stroke="#3a2614" strokeWidth="1" fill="none"/>
      <path d="M 28 24 Q 28 26 30 26" stroke="#3a2614" strokeWidth="1" fill="none"/>

      {/* Whiskers */}
      <line x1="17" y1="22" x2="23" y2="23" stroke="#3a2614" strokeWidth="0.6"/>
      <line x1="17" y1="24" x2="23" y2="24.5" stroke="#3a2614" strokeWidth="0.6"/>
      <line x1="33" y1="23" x2="39" y2="22" stroke="#3a2614" strokeWidth="0.6"/>
      <line x1="33" y1="24.5" x2="39" y2="24" stroke="#3a2614" strokeWidth="0.6"/>

      <defs>
        <radialGradient id="catShade" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0" stopColor="rgba(255,255,255,0.2)"/>
          <stop offset="1" stopColor="rgba(0,0,0,0.05)"/>
        </radialGradient>
      </defs>
    </svg>
  );
}
