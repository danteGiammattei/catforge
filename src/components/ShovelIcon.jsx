/* ─── SHOVEL ICON ─────────────────────────────────────────────────────────
 * Tier-aware SVG. The head shape changes with progression: shovel (Lv1),
 * pick (Lv2–3), broad pick (Lv4), refined crystal pick (Lv5–6), cleaver/
 * drill (Lv7+). A soft glow appears at top tiers. Pure SVG — no images,
 * no external deps. */
export default function ShovelIcon({ level = 1, size = 32 }) {
  const lv = Math.max(1, Math.min(8, level));
  // Per-tier palettes: handle / metal / accent
  const palettes = [
    null, // index 0 unused
    { h:"#5a3a1c", m:"#7a7a7a", a:"#a0a0a0" }, // Lv1 Iron Shovel
    { h:"#5a3a1c", m:"#a87238", a:"#d4a060" }, // Lv2 Bronze Pick
    { h:"#3a2818", m:"#9aa8b8", a:"#d8e4f0" }, // Lv3 Steel Pick
    { h:"#3a2818", m:"#d4a017", a:"#ffe878" }, // Lv4 Gilded
    { h:"#2a1810", m:"#c0d8e8", a:"#e8f4ff" }, // Lv5 Platinum
    { h:"#1a0a14", m:"#3030c0", a:"#9090ff" }, // Lv6 Void
    { h:"#0e1a0a", m:"#1aa050", a:"#80ffb0" }, // Lv7 Eldritch
    { h:"#3a2810", m:"#f0c840", a:"#fff8a0" }, // Lv8 Astral
  ];
  const p = palettes[lv];

  let head;
  if (lv === 1) {
    head = <>
      <polygon points="13,18 27,18 30,28 10,28" fill={p.m} stroke={p.a} strokeWidth="0.5"/>
      <polygon points="13,18 27,18 24,21 16,21" fill={p.a} opacity=".4"/>
    </>;
  } else if (lv <= 3) {
    head = <>
      <polygon points="6,20 18,16 30,16 34,20 30,24 18,24 6,20" fill={p.m} stroke={p.a} strokeWidth="0.5"/>
      <line x1="18" y1="16" x2="18" y2="24" stroke={p.a} strokeWidth=".4" opacity=".5"/>
    </>;
  } else if (lv === 4) {
    head = <>
      <polygon points="4,20 10,15 22,15 30,17 36,20 30,23 22,25 10,25 4,20" fill={p.m} stroke={p.a} strokeWidth="0.6"/>
      <circle cx="20" cy="20" r="1.5" fill={p.a} opacity=".7"/>
    </>;
  } else if (lv <= 6) {
    head = <>
      <polygon points="3,20 9,12 22,14 32,17 37,20 32,23 22,26 9,28 3,20" fill={p.m} stroke={p.a} strokeWidth="0.7"/>
      <polygon points="9,12 22,14 16,18" fill={p.a} opacity=".55"/>
      <circle cx="20" cy="20" r="2" fill={p.a}/>
    </>;
  } else {
    head = <>
      <polygon points="2,20 7,10 18,12 28,14 38,17 38,23 28,26 18,28 7,30 2,20" fill={p.m} stroke={p.a} strokeWidth="0.8"/>
      <polygon points="7,10 18,12 12,18" fill={p.a} opacity=".7"/>
      <polygon points="38,17 38,23 32,20" fill={p.a} opacity=".7"/>
      <circle cx="20" cy="20" r="2.5" fill={p.a}/>
      <circle cx="20" cy="20" r="1"   fill="#fff" opacity=".7"/>
    </>;
  }
  const glow = lv >= 7
    ? <circle cx="20" cy="32" r="14" fill={p.a} opacity=".15" filter="blur(2px)"/>
    : null;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      {glow}
      <line x1="20" y1="20" x2="20" y2="38" stroke={p.h} strokeWidth="3"   strokeLinecap="round"/>
      <line x1="20" y1="22" x2="20" y2="36" stroke={p.a} strokeWidth=".5"  opacity=".3"/>
      {head}
    </svg>
  );
}
