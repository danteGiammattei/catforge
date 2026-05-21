import { useEffect } from "react";
import Particles from "./Particles.jsx";

/* Full-screen "Lucky!" beat — fires when a tarot or shiny rolls a rarity upgrade.
 * Three layered effects: a warm flash overlay, three concentric expanding rings,
 * and the Particles confetti burst. The big serif title slams in with a spring,
 * the subtitle eases in slightly delayed. */
export default function LuckyFanfare({ show, onDone }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);

  if (!show) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:170, pointerEvents:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {/* Screen-wide warm flash on entry */}
      <div style={{ position:"absolute", inset:0, background:"rgba(255,232,120,.18)", animation:"luckyFlash .5s ease-out forwards", pointerEvents:"none" }}/>
      {/* Three concentric expanding rings, staggered */}
      {[0, 150, 300].map(delay => (
        <div key={delay} style={{
          position:"absolute", left:"50%", top:"50%",
          width:120, height:120, borderRadius:"50%",
          border:"2px solid rgba(255,232,120,.7)",
          animation:`luckyRing 1.2s ease-out ${delay}ms forwards`,
          pointerEvents:"none",
        }}/>
      ))}
      <Particles active={show} type="lucky" origin={{ x:50, y:52 }}/>
      <div style={{ textAlign:"center", position:"relative", zIndex:2 }}>
        <div style={{
          fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:82, fontStyle:"italic",
          color:"#ffe878", letterSpacing:-2, lineHeight:1,
          textShadow:"0 0 40px rgba(212,160,23,.8),0 0 80px rgba(212,160,23,.4),0 5px 0 #6a3800,0 8px 20px rgba(0,0,0,.5)",
          animation:"luckySlamBig .6s cubic-bezier(.2,.9,.3,1.15) forwards",
        }}>Lucky!</div>
        <div style={{
          fontFamily:"Outfit,sans-serif", fontWeight:800, fontSize:13, color:"#d4a017",
          letterSpacing:5, marginTop:10, textTransform:"uppercase",
          animation:"luckySubtitle .4s ease-out .35s both",
          textShadow:"0 0 12px rgba(212,160,23,.6)",
        }}>⚡ Rarity Upgraded</div>
      </div>
    </div>
  );
}
