import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/* ─── ROULETTE WHEEL ──────────────────────────────────────────────────────
 * Six-sector wheel for the optional gambling tab. Currently disabled in the
 * main flow but kept available for future tavern features. The component is
 * pure canvas — no DOM elements per sector — so it's cheap to animate. */
/* Sector colour palette — eldritch / cosmic-void register so the wheel
   matches the rest of the gamble UI. Outcomes from worst → best:
     LOSE → dread crimson
     SAME → muted void violet
     TIER UP → eldritch cyan
     ×2 → lavender ether
     TIER +2 → royal cosmic violet
     JACKPOT → prismatic pink-violet
*/
const WSECTORS = [
  { label:"LOSE",    color:"#2a0814", text:"#ff4d6c", weight:38, outcome:"lose"    },
  { label:"SAME",    color:"#14102a", text:"#8e7ec0", weight:24, outcome:"same"    },
  { label:"TIER UP", color:"#06243a", text:"#00e5ff", weight:20, outcome:"up1"     },
  { label:"×2 BACK", color:"#1a0a38", text:"#b48eff", weight:10, outcome:"x2"      },
  { label:"TIER +2", color:"#2a1448", text:"#c89aff", weight:6,  outcome:"up2"     },
  { label:"JACKPOT", color:"#380c44", text:"#ff70d0", weight:2,  outcome:"jackpot" },
];
const WTOT = WSECTORS.reduce((s, v) => s + v.weight, 0);

export default function RouletteWheel({ betCoin, onResult, disabled, t }) {
  const cvRef  = useRef();
  const rafRef = useRef();
  const angRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone]         = useState(false);
  const WS = 280;

  const secs = useMemo(() => {
    let cum = 0;
    return WSECTORS.map(s => {
      const start = (cum / WTOT) * Math.PI * 2;
      const span  = (s.weight / WTOT) * Math.PI * 2;
      cum += s.weight;
      return { ...s, start, span };
    });
  }, []);

  const drawW = useCallback((angle) => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const cx = WS / 2, cy = WS / 2, R = WS / 2 - 16;
    ctx.clearRect(0, 0, WS, WS);

    // Outer eldritch rim — deep violet base with cyan/violet tinted gradient
    // (matches the rest of the gamble UI). Cyan outline for the glow read.
    ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
    const br = ctx.createLinearGradient(0, 0, WS, WS);
    br.addColorStop(0,  "#1a0a38");
    br.addColorStop(.4, "#2e1a5a");
    br.addColorStop(.6, "#0e0820");
    br.addColorStop(1,  "#1a0a38");
    ctx.fillStyle = br; ctx.fill();
    ctx.strokeStyle = "#7a4cff"; ctx.lineWidth = 2; ctx.stroke();

    // Tick marks — major ticks cyan, minor ticks dim violet
    for (let i = 0; i < 48; i++) {
      const a = angle + (i / 48) * Math.PI * 2;
      const maj = i % 8 === 0;
      ctx.beginPath();
      ctx.moveTo(cx + (R + 2) * Math.cos(a), cy + (R + 2) * Math.sin(a));
      ctx.lineTo(cx + (R + (maj ? 12 : 6)) * Math.cos(a), cy + (R + (maj ? 12 : 6)) * Math.sin(a));
      ctx.strokeStyle = maj ? "#00e5ff" : "#5a3aa0";
      ctx.lineWidth   = maj ? 2 : 1;
      ctx.stroke();
    }

    // Sectors
    for (const sec of secs) {
      const a0 = angle + sec.start, a1 = a0 + sec.span;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = sec.color; ctx.fill();
      ctx.strokeStyle = "#08051c"; ctx.lineWidth = 1.5; ctx.stroke();
      // Subtle highlight gradient — cooler tint for the eldritch look
      const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      hg.addColorStop(0, "rgba(122,76,255,.08)");
      hg.addColorStop(1, "rgba(0,0,0,.18)");
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = hg; ctx.fill();
      // Sector label, rotated to follow the wheel
      const mid = a0 + sec.span / 2;
      const lx = cx + R * .65 * Math.cos(mid), ly = cy + R * .65 * Math.sin(mid);
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = sec.text; ctx.font = "700 9px Outfit,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(sec.label, 0, 0); ctx.restore();
    }

    // Hub — cosmic gradient (cyan core fading to deep void)
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    const hg2 = ctx.createRadialGradient(cx - 6, cy - 6, 0, cx, cy, 22);
    hg2.addColorStop(0, "#3a1e8a");
    hg2.addColorStop(1, "#08051c");
    ctx.fillStyle = hg2; ctx.fill();
    ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#00e5ff"; ctx.font = "14px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("✶", cx, cy + 1);

    // Pointer arrow — cyan with violet halo
    ctx.beginPath(); ctx.moveTo(cx - 10, 2); ctx.lineTo(cx + 10, 2); ctx.lineTo(cx, 22); ctx.closePath();
    ctx.fillStyle = "#00e5ff"; ctx.fill();
    ctx.strokeStyle = "#08051c"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#7a4cff"; ctx.fill();
  }, [secs]);

  useEffect(() => { drawW(0); }, [drawW]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const doSpin = () => {
    if (spinning || !betCoin || disabled) return;
    setSpinning(true); setDone(false);
    // Pick the outcome by weight, then animate to land on its mid-angle
    const roll = Math.random() * WTOT;
    let cum = 0, chosen = secs[0];
    for (const sc of secs) { cum += sc.weight; if (roll <= cum) { chosen = sc; break; } }
    const jitter      = (Math.random() - .5) * chosen.span * .65;
    const sectorMid   = chosen.start + chosen.span / 2 + jitter;
    const finalAng    = -Math.PI / 2 - sectorMid;
    let delta = finalAng - angRef.current;
    delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    delta += (8 + Math.floor(Math.random() * 4)) * Math.PI * 2;  // 8–11 full rotations
    const startA = angRef.current;
    const dur    = 4600;
    const t0     = performance.now();
    const tick = (now) => {
      const tt = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - tt, 4);  // quartic ease-out
      angRef.current = startA + delta * ease;
      drawW(angRef.current);
      if (tt < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setSpinning(false); setDone(true); onResult(chosen);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const ready = !spinning && betCoin && !disabled;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <canvas ref={cvRef} width={WS} height={WS} style={{ maxWidth:"100%", filter:"drop-shadow(0 12px 32px rgba(0,0,0,.5))" }}/>
      <button onClick={doSpin} disabled={!ready} style={{
          padding:"14px 40px", borderRadius:14,
          border:`1px solid ${ready ? "#a06820" : t.border}`,
          cursor:ready ? "pointer" : "not-allowed",
          background:ready ? "linear-gradient(135deg,#3a1c08,#7a4a18)" : t.surfaceHi,
          fontFamily:"Outfit,sans-serif", fontWeight:800, fontSize:15,
          color:ready ? "#f0c850" : t.muted,
          letterSpacing:2, textTransform:"uppercase",
          transition:"all .18s",
          boxShadow:ready ? "0 6px 18px rgba(212,160,23,.18)" : "none",
        }}>
        {spinning ? "⟳ Spinning…" : done ? "🎰 Spin Again" : "🎰 Spin the Wheel"}
      </button>
    </div>
  );
}
