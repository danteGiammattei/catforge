/* ─── SPRITE METADATA ─────────────────────────────────────────────────────
 * Single source of truth for every animated sprite in the game.
 *
 * Cell dimensions come DIRECTLY from the source pack — each frame is
 * delivered on a consistent canvas where the artist has already aligned
 * the character to a fixed anchor point. We do NOT re-bbox-crop frames;
 * that destroys the artist's careful alignment and causes the walk cycle
 * to "stutter" (the body bounces left/right by a few pixels per frame).
 *
 * Heights still differ between anims of the same character because
 * action frames (attack, jump) get a taller canvas to fit weapon arcs
 * overhead — that's by design. Feet stay bottom-anchored, cell grows up.
 */

// Global render scale — anims declare source-pixel cell sizes, renderer
// multiplies by this. Tune here to make every character bigger or smaller.
export const SPRITE_SCALE = 2;

export const ANIM = {
  // ── WARRIOR (player character) ───────────────────────────────────
  warrior_idle: {
    src: "/sprites/warrior_idle.png",
    sheetW: 315, sheetH: 76, cellW: 35, cellH: 76,
    cols: 9, row: 0, startCol: 0, frames: 9, frameMs: 130, loop: true,
  },
  warrior_walk: {
    src: "/sprites/warrior_walk.png",
    sheetW: 488, sheetH: 79, cellW: 61, cellH: 79,
    cols: 8, row: 0, startCol: 0, frames: 8, frameMs: 95, loop: true,
  },
  warrior_run: {
    src: "/sprites/warrior_run.png",
    sheetW: 427, sheetH: 79, cellW: 61, cellH: 79,
    cols: 7, row: 0, startCol: 0, frames: 7, frameMs: 70, loop: true,
  },
  // Attack 1 — one-shot, holds on its final recovery frame.
  warrior_attack: {
    src: "/sprites/warrior_attack.png",
    sheetW: 760, sheetH: 87, cellW: 95, cellH: 87,
    cols: 8, row: 0, startCol: 0, frames: 8, frameMs: 55, loop: false,
  },
  warrior_jump: {
    src: "/sprites/warrior_jump.png",
    sheetW: 630, sheetH: 80, cellW: 70, cellH: 80,
    cols: 9, row: 0, startCol: 0, frames: 9, frameMs: 70, loop: false,
  },

  // ── SKELETON (enemy) — mirrored at slice time to face LEFT ───────
  skeleton_walk: {
    src: "/sprites/skeleton_walk.png",
    sheetW: 960, sheetH: 64, cellW: 96, cellH: 64,
    cols: 10, row: 0, startCol: 0, frames: 10, frameMs: 95, loop: true,
  },
  skeleton_idle: {
    src: "/sprites/skeleton_idle.png",
    sheetW: 768, sheetH: 64, cellW: 96, cellH: 64,
    cols: 8, row: 0, startCol: 0, frames: 8, frameMs: 130, loop: true,
  },
  skeleton_attack: {
    src: "/sprites/skeleton_attack.png",
    sheetW: 960, sheetH: 64, cellW: 96, cellH: 64,
    cols: 10, row: 0, startCol: 0, frames: 10, frameMs: 60, loop: false,
  },
  skeleton_hurt: {
    src: "/sprites/skeleton_hurt.png",
    sheetW: 480, sheetH: 64, cellW: 96, cellH: 64,
    cols: 5, row: 0, startCol: 0, frames: 5, frameMs: 70, loop: false,
  },
  // Death anim — new sheet (Skeleton_01_White_Die, 13 frames × 96×64).
  // Wider cells than walk so the falling body has room without horizontal
  // cell-shift artifacts. Held on final frame after all 13 play.
  skeleton_die: {
    src: "/sprites/skeleton_die.png",
    sheetW: 1248, sheetH: 64, cellW: 96, cellH: 64,
    cols: 13, row: 0, startCol: 0, frames: 13, frameMs: 70, loop: false,
  },
};

// Legacy stub — older code may still import SPRITE
export const SPRITE = { scale: SPRITE_SCALE };

// Helper for SpriteFrame compatibility
export function spritePos(animKey, frameIdx) {
  const a = ANIM[animKey];
  if (!a) return { backgroundPositionX: "0px", backgroundPositionY: "0px" };
  const realCol = (a.startCol || 0) + frameIdx;
  const x = -realCol * a.cellW * SPRITE_SCALE;
  const y = -a.row   * a.cellH * SPRITE_SCALE;
  return { backgroundPositionX: `${x}px`, backgroundPositionY: `${y}px` };
}
