import { useEffect, useState } from "react";

/* ─── CAT SPRITE ──────────────────────────────────────────────────────────
 * Renders a single 16x16 frame from /sprites/cat.png at a user-controlled
 * display size, with pixel-perfect scaling. Optional `frames` array cycles
 * the displayed frame on a timer for breathing/idle animations.
 *
 * The sheet is laid out in 22-cell rows of 16x16 frames. Each frame is
 * addressed by its (col, row) index — see cat 16x16 with text.png in the
 * upstream asset pack for the full layout.
 *
 * Props:
 *  - frames:  Array<[col, row]>  one or more frame indexes; required.
 *             If multiple frames are passed, the component cycles through
 *             them at `fps` rate. Single-frame arrays render statically.
 *  - size:    display size in CSS pixels (will scale 16x16 → size×size).
 *  - flip:    boolean — mirror horizontally (cheaper than having a
 *             dedicated "facing left" frame set).
 *  - fps:     animation rate when frames.length > 1.
 * ────────────────────────────────────────────────────────────────────── */
const SHEET_COLS = 22;
const FRAME = 16;

export default function CatSprite({ frames, size = 48, flip = false, fps = 4 }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!frames || frames.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps]);

  if (!frames || !frames.length) return null;
  const [col, row] = frames[idx] || frames[0];

  // Background-position needs to scale with size. We render the WHOLE sheet
  // at (sheetCols * size, totalRows * size) and offset to expose one frame.
  const scale = size / FRAME;
  const sheetW = SHEET_COLS * FRAME * scale;
  const offsetX = col * FRAME * scale;
  const offsetY = row * FRAME * scale;

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: 'url("/sprites/cat.png")',
        backgroundSize: `${sheetW}px auto`,
        backgroundPosition: `-${offsetX}px -${offsetY}px`,
        imageRendering: "pixelated",
        transform: flip ? "scaleX(-1)" : "none",
        transformOrigin: "center",
      }}
    />
  );
}

/* Frame catalog — picked from inspecting the asset pack. The cat 1.png
 * sheet has a complex layout (REST / WALK / SLEEP / EAT / MEOW / YAWN /
 * WASH / ITCH / HISS / PAW ATTACK sections). For now we stick to the
 * top idle row which is fully verified visually; expand as we map more
 * of the sheet. */
export const CAT_FRAMES = {
  // Top row: 8 sitting-and-bobbing frames. Used for both idle and "working"
  // states for now — the visual difference between states is conveyed by
  // the parent (animation speed, hover scale, station pulse ring).
  idle:    [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]],
  working: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]],
  // A quieter single frame for cats that should hold still.
  sit:     [[0,0]],
};
