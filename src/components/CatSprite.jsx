import { useEffect, useState } from "react";

/* ─── CAT SPRITE ──────────────────────────────────────────────────────────
 * Renders an animated cat by cycling individual frame PNGs. The source
 * sprite sheet (cat_1.png from the Free Pack) lays out 32x32 cells, NOT
 * 16x16 as we first assumed — each cell contains a small cat positioned
 * variably for animation offset purposes. Frames have been pre-aligned
 * to a consistent center-bottom anchor in 32x32 canvases under
 * /sprites/cat_*.png so display is stable across the cycle.
 *
 * Animation frame mapping (from cat_1.png + Frame_indexes.png):
 *   Row 0 (frames 0-5)  →  REST: cat sitting facing camera
 *   Row 5 (frames 55-58) →  WALK UP: cat walking away from camera
 *   Row 4 (frames 44-47) →  WALK DOWN: cat walking toward camera
 *   Row 6 (frames 66-73) →  WALK RIGHT: cat profile, walking right
 *   (Walk LEFT is just WALK RIGHT with flip=true — saves duplicating frames)
 *
 * Props:
 *   mood: "idle" | "walk_up" | "walk_down" | "walk_right" | "walk_left"
 *   size: display size in CSS pixels (sprite is 32x32, scaled pixel-perfect)
 *   fps:  override animation rate
 * ────────────────────────────────────────────────────────────────────── */

const FRAME_SETS = {
  // Sitting idle — frames 429-450 from the sheet (22 frames). The cat sits
  // facing camera, tail swishing/curling. This is the primary outdoor pose
  // Dante specified. 22 frames at ~9fps ≈ 2.4s loop, nice and smooth.
  idle: Array.from({ length: 22 }, (_, i) => `/sprites/cat_idle_${i}.png`),
  // Loaf pose (frames 33-34) — used while a station is "working".
  sleep: [
    "/sprites/cat_sleep_0.png",
    "/sprites/cat_sleep_1.png",
  ],
  walk_up: [
    "/sprites/cat_walk_up_0.png", "/sprites/cat_walk_up_1.png",
    "/sprites/cat_walk_up_2.png", "/sprites/cat_walk_up_3.png",
  ],
  walk_right: [
    "/sprites/cat_walk_right_0.png", "/sprites/cat_walk_right_1.png",
    "/sprites/cat_walk_right_2.png", "/sprites/cat_walk_right_3.png",
    "/sprites/cat_walk_right_4.png", "/sprites/cat_walk_right_5.png",
    "/sprites/cat_walk_right_6.png", "/sprites/cat_walk_right_7.png",
  ],
};
// walk_left reuses walk_right frames with horizontal flip.
FRAME_SETS.walk_left = FRAME_SETS.walk_right;

const DEFAULT_FPS = {
  idle: 9,         // smooth tail-swish sitting loop (22 frames)
  sleep: 0.8,      // very slow — peaceful breathing
  walk_up: 6,
  walk_right: 8,
  walk_left: 8,
};

export default function CatSprite({ mood = "idle", size = 64, flip, fps }) {
  const frames = FRAME_SETS[mood] || FRAME_SETS.idle;
  const rate = fps ?? (DEFAULT_FPS[mood] || 2);
  // walk_left is walk_right mirrored — auto-flip unless caller overrides.
  const shouldFlip = flip ?? (mood === "walk_left");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
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
        transform: shouldFlip ? "scaleX(-1)" : "none",
        pointerEvents: "none",
      }}
    />
  );
}
