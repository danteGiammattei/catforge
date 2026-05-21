import { useEffect, useState } from "react";

/* ─── CAT SPRITE ──────────────────────────────────────────────────────────
 * Renders an animated cat by cycling through individual frame PNGs. We
 * dropped the spritesheet-via-background-image approach because the cells
 * in the source sheet have per-frame offsets (the cat sits in a different
 * corner of each 16x16 cell), so a fixed cell-display would show "only
 * the head". The pre-aligned PNGs in /sprites/cat_idle_*.png have each
 * cat centered horizontally and anchored to the bottom of a 16x16 canvas,
 * so the display is stable across frames.
 *
 * Props:
 *  - mood: "idle" | "working"  picks the frame set.
 *  - size: display size in CSS pixels (16x16 → size×size, pixel-perfect).
 *  - flip: mirror horizontally.
 *  - fps:  animation rate. Default 1.5 — a slow breath, not a jitter.
 * ────────────────────────────────────────────────────────────────────── */

const FRAME_SETS = {
  // 4 subtly-different sitting poses. Cycled slowly this reads as breathing
  // + occasional head-look.
  idle:    ["/sprites/cat_idle_0.png", "/sprites/cat_idle_1.png",
            "/sprites/cat_idle_2.png", "/sprites/cat_idle_3.png"],
  // No dedicated "working" pose available yet from the asset pack. Use the
  // idle frames but at a slightly faster rate, conveying "actively going
  // about its business" without changing pose.
  working: ["/sprites/cat_idle_0.png", "/sprites/cat_idle_2.png",
            "/sprites/cat_idle_1.png", "/sprites/cat_idle_3.png"],
};

export default function CatSprite({ mood = "idle", size = 48, flip = false, fps }) {
  const frames = FRAME_SETS[mood] || FRAME_SETS.idle;
  const defaultFps = mood === "working" ? 3 : 1.5;
  const rate = fps ?? defaultFps;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (frames.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % frames.length), 1000 / rate);
    return () => clearInterval(id);
  }, [frames, rate]);

  return (
    <img
      src={frames[idx]}
      width={size}
      height={size}
      alt=""
      aria-hidden
      style={{
        imageRendering: "pixelated",
        display: "block",
        transform: flip ? "scaleX(-1)" : "none",
        pointerEvents: "none",
      }}
    />
  );
}
