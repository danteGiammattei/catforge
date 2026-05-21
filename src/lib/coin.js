/* ════════════════════════════════════════════════════════════════════════
 *  COIN — generation, drawing, value
 *  ────────────────────────────────────────────────────────────────────────
 *  All the pure logic for coins. Imports static data from data.js but holds
 *  the RNG, rune translator, face generator, drawCoin canvas painter, and
 *  the coinValue / rarity calculations.
 *
 *  Why GAMBLES is here: it references mkCoin/newSeed and putting it in
 *  data.js would create a circular import.
 * ════════════════════════════════════════════════════════════════════════ */

import {
  METALS, MAX_TIER, SHAPES, CONS, VOWS, ERAS, EPOCH, HOUSES, CONDS,
  RARITIES, MAX_RARITY,
  ARTEFACT_GRADES, SHOVEL_MAX_DUR, TAROT_BY_ID,
  activeTarotPair,
  TITLES, TITLE_LEVELS,
} from "./data.js";

/* ─── RUNE TRANSLATOR ─────────────────────────────────────────────────── */
const RL = { A:"ᚨ",B:"ᛒ",C:"ᚲ",D:"ᛞ",E:"ᛖ",F:"ᚠ",G:"ᚷ",H:"ᚺ",I:"ᛁ",J:"ᛃ",K:"ᚲ",L:"ᛚ",M:"ᛗ",N:"ᚾ",O:"ᛟ",P:"ᛈ",R:"ᚱ",S:"ᛊ",T:"ᛏ",U:"ᚢ",V:"ᚡ",W:"ᚹ",X:"ᛪ",Y:"ᚤ",Z:"ᛉ" };
const DG = { TH:"ᚦ", GR:"ᚷᚱ", BR:"ᛒᚱ", DR:"ᛞᚱ", KR:"ᚲᚱ", SK:"ᛊᚲ", ST:"ᛊᛏ" };
export function rune(s) {
  let o = "", i = 0;
  while (i < s.length) {
    const d = s.slice(i, i + 2);
    if (DG[d]) { o += DG[d]; i += 2; }
    else       { o += RL[s[i]] || s[i]; i++; }
  }
  return o;
}

/* ─── PRNG ────────────────────────────────────────────────────────────────
 * xorshift32 — fast, deterministic, seed-stable. Used for everything that
 * needs reproducibility from a coin seed (face generation, dig depths,
 * artefact rarity, etc.). */
export class RNG {
  constructor(seed) { this.s = (seed ^ 0xdeadbeef) >>> 0 || 1; }
  next()           { this.s ^= this.s << 13; this.s ^= this.s >>> 17; this.s ^= this.s << 5; return (this.s >>> 0) / 4294967296; }
  int(lo, hi)      { return Math.floor(this.next() * (hi - lo + 1)) + lo; }
  pick(a)          { return a[this.int(0, a.length - 1)]; }
  bool(p = 0.5)    { return this.next() < p; }
}

/* ─── METAL PICKING ───────────────────────────────────────────────────────
 * Weighted by player level: at Lv1 it's mostly Copper/Bronze, by Lv50 the
 * top tiers (Eldritch, Astral) become reachable. tierCap clamps to whatever
 * the player's shovel can mine (see SHOVEL_TIER_CAP in data.js). */
export function pickMetal(rng, pLvl = 1, tierCap = MAX_TIER) {
  const b = Math.min(pLvl - 1, 50);
  const w = [
    Math.max(14, 38 - b * .48),  // copper
    Math.max(10, 22 - b * .18),  // bronze
    18 + b * .08,                // silver
    12 + b * .12,                // gold
    6  + b * .14,                // platinum
    3  + b * .08,                // obsidian
    Math.min(15, 1 + b * .08),   // void
    Math.max(.2,  b * .02),      // eldritch — very rare even at high levels
    Math.max(.05, b * .008),     // astral — vanishingly rare
  ];
  const tot = w.reduce((a, v) => a + v, 0);
  let r = rng.next() * tot, c = 0;
  for (let i = 0; i < w.length; i++) { c += w[i]; if (r <= c) return Math.min(i, tierCap); }
  return 0;
}

/* ─── FACE GENERATOR ──────────────────────────────────────────────────────
 * 13×13 grid of cell values: 0=empty, 1=engraved, 2=highlight. Mirrored
 * vertically so coins look symmetric. Uses cellular-automaton smoothing
 * (3 passes) to produce blob-like shapes instead of noise. */
export function genFace(seed) {
  const rng    = new RNG(seed ^ 0xf4ce1a);
  const SZ     = 13;
  const half   = 7;
  const center = (SZ - 1) / 2;

  let L = Array.from({ length: SZ }, (_, y) =>
    Array.from({ length: half }, (_, x) => {
      const d = Math.hypot(x - center, y - center) / (center * 0.95);
      // Higher base density (0.42) + falloff toward edges
      return rng.next() > (0.42 + d * .3) ? 1 : 0;
    })
  );

  // Three smoothing passes to clean up the noise into shapes
  for (let it = 0; it < 3; it++) {
    L = L.map((row, y) => row.map((cell, x) => {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dy && !dx) continue;
        const ny = y + dy, nx = x + dx;
        n += (ny >= 0 && ny < SZ && nx >= 0 && nx < half) ? L[ny][nx] : 0;
      }
      return n >= 4 ? 1 : n <= 2 ? 0 : cell;
    }));
  }

  // Mirror left half across to make a symmetric face
  const g = Array.from({ length: SZ }, (_, y) => {
    const row = new Array(SZ).fill(0);
    for (let x = 0; x < half; x++) { row[x] = L[y][x]; row[SZ - 1 - x] = L[y][x]; }
    return row;
  });

  // Choose 2–4 highlight cells (engraving accent). Mirrored too.
  const pool = [];
  for (let y = 3; y < SZ - 3; y++) for (let x = 3; x < SZ - 3; x++) {
    if (g[y][x] === 1 && Math.hypot(x - center, y - center) < center * 0.7) pool.push([y, x]);
  }
  for (let h = 0; h < rng.int(2, 4); h++) {
    if (!pool.length) break;
    const idx = rng.int(0, pool.length - 1);
    const [hy, hx] = pool.splice(idx, 1)[0];
    g[hy][hx] = 2;
    if (SZ - 1 - hx !== hx) g[hy][SZ - 1 - hx] = 2;
  }
  return g;
}

/* ─── COIN CONSTRUCTION ──────────────────────────────────────────────────
 * mkCoin produces a deterministic coin object from a seed + player context.
 * The id encodes the seed for stable React keys across remounts. */
export function mkCoin(seed, pLvl = 1, tier = null, tierCap = MAX_TIER, rarityOverride = null) {
  const rng = new RNG(seed);
  const raw = (rng.pick(CONS) + rng.pick(VOWS) + rng.pick(CONS) + rng.pick(VOWS)).slice(0, 9);
  // Rarity: explicit override (used at dig time so dig quality matters),
  // otherwise derived from seed so stored coins persist their rarity stably.
  const rarity = rarityOverride != null ? rarityOverride : deriveRarity(seed);
  return {
    id:       `c_${seed >>> 0}_${(Date.now() & 0xffff).toString(36)}`,
    seed,
    raw,
    runes:    rune(raw),
    metalIdx: tier ?? pickMetal(rng, pLvl, tierCap),
    shape:    rng.pick(SHAPES),
    era:      `${rng.pick(ERAS)} ${rng.pick(EPOCH)}, House of ${rng.pick(HOUSES)}`,
    cond:     rng.pick(CONDS),
    wt:       +(rng.next() * 12 + 2).toFixed(1),
    dia:      rng.int(18, 44),
    shiny:    false,
    rarity,
  };
}
export const newSeed = () => (Date.now() ^ (Math.random() * 0xffffffff | 0)) >>> 0;

/* ─── DRAW COIN (legacy procedural painter) ──────────────────────────────
 * Renders into an offscreen 64×64 canvas, then nearest-neighbor blits to
 * the requested px size for crisp pixel-art at any scale.
 *
 * As of the coin-art overhaul, this is no longer the primary renderer —
 * coins are now displayed via hand-illustrated images (see CoinCanvas.jsx
 * and coinImagePath in data.js). drawCoin is kept as a fallback for cases
 * where the image fails to load (404, missing slice) and is still used
 * directly by CoinModal and BrushReveal where they need to paint into
 * their own canvas elements (3D rotation modal, brush-reveal pipeline).
 *
 * Exported under both names: `drawCoin` for legacy callers,
 * `drawCoinFallback` for the new CoinCanvas's defensive fallback path. */
export function drawCoin(canvas, coin, px) {
  const S = 64, off = document.createElement("canvas"); off.width = S; off.height = S;
  const c   = off.getContext("2d");
  const m   = METALS[coin.metalIdx];
  const noise = new RNG(coin.seed ^ 0xcafeba);
  const cx  = S / 2, cy = S / 2, r = S / 2 - 1;

  const clip = () => {
    c.beginPath();
    const sh = coin.shape;
    if (sh === "round" || sh === "holed") c.arc(cx, cy, r, 0, Math.PI * 2);
    else if (sh === "octagonal") { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; i ? c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : c.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } c.closePath(); }
    else if (sh === "hexagonal")  { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; i ? c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : c.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } c.closePath(); }
    else if (sh === "shield")     { const hw = r * .88; c.moveTo(cx - hw, cy - r); c.lineTo(cx + hw, cy - r); c.lineTo(cx + hw, cy - .1 * r); c.quadraticCurveTo(cx + hw, cy + r * .65, cx, cy + r); c.quadraticCurveTo(cx - hw, cy + r * .65, cx - hw, cy - .1 * r); c.closePath(); }
    else if (sh === "diamond")    { c.moveTo(cx, cy - r); c.lineTo(cx + r * .78, cy); c.lineTo(cx, cy + r); c.lineTo(cx - r * .78, cy); c.closePath(); }
    else if (sh === "oval")       c.ellipse(cx, cy, r * .7, r, 0, 0, Math.PI * 2);
    else                          c.rect(cx - r + 1, cy - r + 1, (r - 1) * 2, (r - 1) * 2);
  };

  clip(); c.save(); c.clip();
  const grd = c.createRadialGradient(cx - r * .3, cy - r * .3, 0, cx, cy, r);
  grd.addColorStop(0, m.base); grd.addColorStop(.55, m.mid); grd.addColorStop(1, m.dark);
  c.fillStyle = grd; c.fillRect(0, 0, S, S);

  // Noise specks across the coin face — adds patina texture
  for (let i = 0; i < 420; i++) {
    const a = noise.next() * Math.PI * 2;
    const d = noise.next() * r * .95;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const b = noise.next();
    c.fillStyle = `rgba(${b > .5 ? 255 : 0},${b > .5 ? 255 : 0},${b > .5 ? 255 : 0},${.04 + noise.next() * .06})`;
    c.fillRect(x | 0, y | 0, 1, 1);
  }

  // Engraved face — 13×13 grid centered on the canvas
  const face       = genFace(coin.seed);
  const cellSize   = 3.5;
  const faceOffset = (S - 13 * cellSize) / 2;
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
    const v = face[y][x]; if (!v) continue;
    const px2 = faceOffset + x * cellSize, py = faceOffset + y * cellSize;
    c.fillStyle = v === 2 ? m.eng : m.hl;
    c.fillRect(Math.floor(px2), Math.floor(py), Math.ceil(cellSize), Math.ceil(cellSize));
    if (v === 1) {
      c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(Math.floor(px2), Math.floor(py), Math.ceil(cellSize), 1);
      c.fillStyle = "rgba(0,0,0,.26)";       c.fillRect(Math.floor(px2), Math.floor(py) + Math.ceil(cellSize) - 1, Math.ceil(cellSize), 1);
    }
  }

  // Top-left highlight glow
  c.fillStyle = "rgba(255,255,255,.14)"; c.beginPath(); c.arc(cx - r * .4, cy - r * .4, r * .55, 0, Math.PI * 2); c.fill();
  // Pierced shape — punch a hole in the center
  if (coin.shape === "holed") { c.save(); c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(cx, cy, r * .18, 0, Math.PI * 2); c.fill(); c.restore(); }
  c.restore();

  // Edge stroke
  c.lineWidth = 1; c.strokeStyle = m.eng; clip(); c.stroke();

  // Shiny rotating diagonal sheen
  if (coin.shiny) {
    c.save(); clip(); c.clip();
    const ang = (Date.now() / 40) % 360;
    const lg  = c.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0,   "rgba(255,255,255,0)");
    lg.addColorStop(.4,  `hsla(${ang},100%,75%,.35)`);
    lg.addColorStop(.5,  `hsla(${(ang + 60)  % 360},100%,80%,.5)`);
    lg.addColorStop(.6,  `hsla(${(ang + 120) % 360},100%,75%,.35)`);
    lg.addColorStop(1,   "rgba(255,255,255,0)");
    c.fillStyle = lg; c.fillRect(0, 0, S, S);
    c.restore();
  }

  // Final blit to the requested size, nearest-neighbor for pixel-perfect scale
  canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, px, px);
}

/* ─── XP / LEVEL CURVE ────────────────────────────────────────────────── */
export function lvl(xp)         { return Math.floor(Math.sqrt(xp / 220)) + 1; }
export function lvlMin(l)       { return (l - 1) ** 2 * 220; }
export function lvlMax(l)       { return l ** 2 * 220; }

/* ─── RARITY ──────────────────────────────────────────────────────────── */

// Derive a deterministic baseline rarity from a coin's seed alone.
// Used as a fallback for coins stored before rarity was tracked.
export function deriveRarity(seed) {
  const r   = new RNG(seed ^ 0xab12cd);
  const tot = RARITIES.reduce((s, x) => s + x.weight, 0);
  let roll  = r.next() * tot;
  for (let i = 0; i < RARITIES.length; i++) { roll -= RARITIES[i].weight; if (roll <= 0) return i; }
  return 0;
}

// Pick a rarity at coin-find time, weighted by player level + dig conditions.
//   digBonus: "first" (+2 tiers), "lucky" (+1), "damaged" (-1), null (none)
//   shiny:    +1 rarity tier on top
export function rollRarity(rng, playerLevel, digBonus, shiny) {
  const lvFactor = Math.min(1, playerLevel / 50);
  const w = RARITIES.map((r, i) => {
    if (i === 0) return r.weight * (1 - lvFactor * 0.85);   // Common: fades with level
    if (i === 1) return r.weight * (1 - lvFactor * 0.4);    // Uncommon: also fades a bit
    if (i === 2) return r.weight * (1 + lvFactor * 0.3);    // Rare: rises slightly
    if (i === 3) return r.weight * (1 + lvFactor * 0.6);    // Epic: rises with level
    if (i === 4) return r.weight * (1 + lvFactor * 1.0);    // Legendary: doubles by Lv50
    return            r.weight * (1 + lvFactor * 1.4);      // Mythic: triples by Lv50
  });
  const tot = w.reduce((s, x) => s + x, 0);
  let roll = rng.next() * tot, r = 0;
  for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) { r = i; break; } }
  if      (digBonus === "first")   r = Math.min(MAX_RARITY, r + 2);
  else if (digBonus === "lucky")   r = Math.min(MAX_RARITY, r + 1);
  else if (digBonus === "damaged") r = Math.max(0, r - 1);
  if (shiny) r = Math.min(MAX_RARITY, r + 1);
  return r;
}

// Read a coin's rarity — uses stored value if present, derives from seed otherwise.
export function coinRarity(c) {
  if (typeof c?.rarity    === "number") return c.rarity;
  if (typeof c?.rarityIdx === "number") return c.rarityIdx; // legacy field name
  return deriveRarity(c?.seed || 0);
}

/* ─── ECONOMY ─────────────────────────────────────────────────────────── */

export function rarityScore(coins) {
  return coins.reduce(
    (s, c) => s + ([1, 3, 8, 20, 45, 120, 300, 800, 2000][c.metalIdx] || 1)
              * (coinRarity(c) + 1)
              * (c.shiny ? 3 : 1),
    0
  );
}

// Single coin → marks. Rarity is the dominant axis; metal sets a floor;
// condition adjusts ±15%; shiny ×4.
//
// NOTE: currently reads `?.multiplier` which doesn't exist on RARITIES.
// This is a known bug — the field is `valueMul`. Fixing it changes the
// economy (rarity finally affects value), so it's left as-is here for
// faithful 1:1 extraction. A separate balance pass should change the read
// to `?.valueMul` and rebalance the metal base curve accordingly.
export function coinValue(c) {
  const base    = [3, 8, 20, 55, 140, 360, 900, 2400, 6000][c.metalIdx] || 3;
  const condIdx = Math.max(0, CONDS.indexOf(c.cond));
  const condMul = 1 + (0.15 - condIdx * 0.05);
  const shinyMul = c.shiny ? 4 : 1;
  const rarMul   = RARITIES[coinRarity(c)]?.multiplier || 1;
  return Math.max(1, Math.round(base * condMul * shinyMul * rarMul));
}

export function vaultMarks(coins) {
  return coins.reduce((s, c) => s + coinValue(c), 0);
}

/* ─── ARTEFACT GRADE HELPER ─────────────────────────────────────────────
 * Pure helper — no React. Lives here next to coinRarity since artefacts are
 * scored from input coin rarities. */
export function gradeForRaritySum(avgRarity) {
  let g = 0;
  for (let i = 0; i < ARTEFACT_GRADES.length; i++) {
    if (avgRarity >= ARTEFACT_GRADES[i].threshold) g = i;
  }
  return g;
}

/* ─── REPAIR COST ─────────────────────────────────────────────────────── */
export function shovelMaxDur(lv) {
  return SHOVEL_MAX_DUR[Math.min(lv, SHOVEL_MAX_DUR.length - 1)] || 40;
}
// Flatter curve so repairs feel routine, not punishing.
export function repairCost(missing, shovelLevel) {
  return Math.max(1, Math.round(missing * (3 + shovelLevel * 1.3)));
}

/* ─── TAROT BUFFS ─────────────────────────────────────────────────────────
 * Aggregate the active buffs from a list of equipped tarot card ids. */
export function tarotBuffs(equippedIds) {
  const buff = {
    xpMul:0, durPenalty:0, pinSlots:0, marksMul:0,
    revealRarity:false, allowSkip:false, rerollRarity:0,
    guaranteedEvery:0, guaranteedFloor:0,
    firstStrikeBonus:0, rarityFloor:0,
    forgeDiscount:0,
    shinyBonus:0,
    // Legacy fields — neutral defaults so older code that reads them doesn't break
    tierUp:0, durMul:1, digSpeed:0, artefactRate:0, forgeRefund:0, rerollDig:0,
  };
  for (const id of equippedIds || []) {
    const c = TAROT_BY_ID[id]; if (!c) continue;
    if (c.xpMul)            buff.xpMul        += c.xpMul;
    if (c.durPenalty)       buff.durPenalty   += c.durPenalty;
    if (c.pinSlots)         buff.pinSlots     += c.pinSlots;
    if (c.marksMul)         buff.marksMul     += c.marksMul;
    if (c.revealRarity)     buff.revealRarity = true;
    if (c.allowSkip)        buff.allowSkip    = true;
    if (c.rerollRarity)     buff.rerollRarity += c.rerollRarity;
    if (c.guaranteedEvery && !buff.guaranteedEvery) buff.guaranteedEvery = c.guaranteedEvery; // first wins
    if (c.guaranteedFloor)  buff.guaranteedFloor = Math.max(buff.guaranteedFloor, c.guaranteedFloor);
    if (c.firstStrikeBonus) buff.firstStrikeBonus += c.firstStrikeBonus;
    if (c.rarityFloor)      buff.rarityFloor = Math.max(buff.rarityFloor, c.rarityFloor);
    if (c.forgeDiscount)    buff.forgeDiscount += c.forgeDiscount;
    if (c.shinyBonus)       buff.shinyBonus   += c.shinyBonus;
  }

  // ── PAIR BONUS ──────────────────────────────────────────────────────
  // Equipping both cards in a TAROT_PAIRS entry layers a bonus on top of
  // the per-card effects. Same field names — so a "pair adds +0.15 xpMul"
  // simply sums with the cards' base xpMul values.
  // Only one pair can be active at a time (you only have 2 slots).
  const pair = activeTarotPair(equippedIds);
  if (pair) {
    if (pair.xpMul)        buff.xpMul        += pair.xpMul;
    if (pair.marksMul)     buff.marksMul     += pair.marksMul;
    if (pair.pinSlots)     buff.pinSlots     += pair.pinSlots;
    if (pair.shinyBonus)   buff.shinyBonus   += pair.shinyBonus;
    if (pair.rerollRarity) buff.rerollRarity += pair.rerollRarity;
    if (pair.rarityFloor)  buff.rarityFloor  = Math.max(buff.rarityFloor, pair.rarityFloor);
    // For guaranteedEvery, the pair value REPLACES the individual cards'
    // value if it's lower (more frequent guarantees), since the buff
    // reducer keeps the FIRST non-zero guaranteedEvery from the cards.
    if (pair.guaranteedEvery && (!buff.guaranteedEvery || pair.guaranteedEvery < buff.guaranteedEvery)) {
      buff.guaranteedEvery = pair.guaranteedEvery;
    }
    if (pair.guaranteedFloor) buff.guaranteedFloor = Math.max(buff.guaranteedFloor, pair.guaranteedFloor);
    // Expose the active pair so UI can show a badge ("Path of Transcendence active")
    buff.activePair = pair;
  }
  return buff;
}

/* ─── UNLOCKED TITLES ─────────────────────────────────────────────────── */
export function unlockedTitles(level) {
  return TITLES.filter((_, i) => level >= TITLE_LEVELS[i]);
}

/* ─── SENSE LEVEL ─────────────────────────────────────────────────────── */
export function senseLevel(signal) {
  if (signal >= 0.92) return "locked";
  if (signal >= 0.6)  return "close";
  if (signal >= 0.3)  return "rising";
  if (signal >= 0.08) return "faint";
  return null;
}

/* ─── GAMBLES ─────────────────────────────────────────────────────────────
 * Lives here (instead of data.js) because resolve callbacks reference mkCoin. */
export const GAMBLES = [
  { id:"toss", label:"Coin Toss", icon:"🪙", desc:"1 coin · 50/50: tier up or lost", odds:"50/50", count:1, same:false,
    resolve: (bet) => {
      const c = bet[0];
      if (Math.random() < .5) {
        return { won:true,  remove:[c.id], add:[mkCoin(newSeed(), 1, Math.min(MAX_TIER, c.metalIdx + 1))], msg:"LUCKY FLIP" };
      }
      return   { won:false, remove:[c.id], add:[],                                                         msg:"TAILS — COIN LOST" };
    },
  },
  // Triple Stack: stake 3 coins of the SAME metal. Win → all 3 become coins
  // of the NEXT metal tier (capped at Astral). Lose → keep 1 random coin,
  // the other 2 are lost. ~38% win rate — more frequent than toss-up but
  // requires you to collect 3 same-metal coins to play.
  { id:"triple", label:"Triple Stack", icon:"🃏", desc:"3 same-metal coins · win → all tier up · lose → keep 1", odds:"~38%", count:3, same:true,
    resolve: (bet) => {
      const meta = bet[0].metalIdx;
      if (Math.random() < .38) {
        return {
          won:true,
          remove: bet.map(c => c.id),
          add: bet.map(() => mkCoin(newSeed(), 1, Math.min(MAX_TIER, meta + 1))),
          msg: "TRIPLE STACK!",
        };
      }
      // Lose: keep one random coin from the stake
      const keptIdx = Math.floor(Math.random() * bet.length);
      const kept = bet[keptIdx];
      return {
        won: false,
        remove: bet.filter((_, i) => i !== keptIdx).map(c => c.id),
        add: [],
        msg: `LOST — KEPT ${kept.metalIdx >= 0 ? "ONE" : ""}`,
      };
    },
  },
];

/* Alias for new CoinCanvas defensive-fallback path. Same function, clearer
 * name in the call site. */
export const drawCoinFallback = drawCoin;
