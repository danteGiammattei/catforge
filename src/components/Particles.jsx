import { useMemo } from "react";

/* Confetti-like particle burst overlay used for lucky/shiny moments and
 * other reveal beats. The CSS vars --tx/--ty/--r drive the particleFly
 * keyframe in styles.css. */
export default function Particles({ active, type, origin }) {
  const colors = useMemo(() => {
    if (type === "shiny") return Array.from({ length: 60 }, (_, i) => `hsl(${i * 6},100%,65%)`);
    if (type === "lucky") return ["#d4a017","#ffe878","#ffffff","#60e880","#d4a017","#eeaa70"];
    return ["#d4a017","#ffffff"];
  }, [type]);

  const particles = useMemo(() => Array.from({ length: type === "shiny" ? 72 : 36 }, (_, i) => ({
    id:    i,
    tx:    `${(Math.random() - .5) * 380}px`,
    ty:    `${-80 - Math.random() * 320}px`,
    r:     `${(Math.random() - .5) * 720}deg`,
    delay: `${Math.random() * .35}s`,
    size:  type === "shiny" ? 6 + Math.random() * 8 : 5 + Math.random() * 7,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: Math.random() > .5 ? "50%" : "3px",
    dur:   `${.8 + Math.random() * .7}s`,
  })), [type, colors]);

  if (!active) return null;
  const ox = origin?.x ?? 50;
  const oy = origin?.y ?? 50;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:180, overflow:"hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:    "absolute",
          left:        `${ox}%`,
          top:         `${oy}%`,
          width:       p.size,
          height:      p.size,
          borderRadius:p.shape,
          background:  p.color,
          animation:   `particleFly ${p.dur} ease-out ${p.delay} both`,
          "--tx":      p.tx,
          "--ty":      p.ty,
          "--r":       p.r,
        }}/>
      ))}
    </div>
  );
}
