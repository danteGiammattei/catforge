/* ─── PICKAXE ICON ────────────────────────────────────────────────────────
 * Renders the level-appropriate pickaxe image from /public/pickaxes/. The
 * drop-shadow glow color matches the metal tier's tone so high-level picks
 * feel visually charged. */
export default function PickaxeIcon({ level = 1, size = 44 }) {
  // Levels above 9 cap at the top art file.
  const lv = Math.max(1, Math.min(9, level | 0));
  const glow = [null,
    "rgba(150,80,30,.45)",   // 1 copper
    "rgba(160,110,40,.45)",  // 2 bronze
    "rgba(160,170,180,.4)",  // 3 silver
    "rgba(220,170,40,.55)",  // 4 gold
    "rgba(160,170,180,.4)",  // 5 platinum
    "rgba(120,80,160,.5)",   // 6 obsidian
    "rgba(160,80,255,.55)",  // 7 void
    "rgba(80,140,255,.55)",  // 8 celestial
    "rgba(180,80,200,.6)",   // 9 eldritch
  ][lv];
  return (
    <img
      src={`/pickaxes/lv${lv}.webp`}
      alt={`Pickaxe Lv${lv}`}
      loading="lazy"
      width={size} height={size}
      style={{
        width: size, height: size,
        objectFit: "contain",
        filter: `drop-shadow(0 2px 4px rgba(0,0,0,.6)) drop-shadow(0 0 8px ${glow})`,
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  );
}
