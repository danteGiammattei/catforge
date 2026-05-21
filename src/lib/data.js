/* ════════════════════════════════════════════════════════════════════════
 *  DATA TABLES
 *  ────────────────────────────────────────────────────────────────────────
 *  Pure data — no functions, no React. Imported by coin.js (for METALS,
 *  RARITIES, SHAPES, CONDS, etc.) and by components throughout the app.
 *
 *  GAMBLES lives in coin.js because it references mkCoin / newSeed and
 *  putting it here would create a circular import.
 * ════════════════════════════════════════════════════════════════════════ */

/* ─── METALS ──────────────────────────────────────────────────────────── */
export const METALS = [
  { name:"Copper",  base:"#c47a30", mid:"#9a5218", dark:"#3e1e06", hl:"#eeaa70", eng:"#5a2e0a", accent:"#c47a30", flash:"rgba(196,122,48,.18)", rarity:"Common" },
  { name:"Bronze",  base:"#9a7240", mid:"#7a5428", dark:"#3a2010", hl:"#d4a060", eng:"#6a4218", accent:"#9a7240", flash:"rgba(154,114,64,.18)", rarity:"Uncommon" },
  { name:"Silver",  base:"#aabccc", mid:"#7890a2", dark:"#38506a", hl:"#d8eaf8", eng:"#304858", accent:"#aabccc", flash:"rgba(150,185,215,.18)",rarity:"Rare" },
  { name:"Gold",    base:"#d4a017", mid:"#a87800", dark:"#503800", hl:"#ffe878", eng:"#6a5000", accent:"#d4a017", flash:"rgba(212,160,23,.22)", rarity:"Epic" },
  { name:"Platinum",base:"#c0d8e8", mid:"#8ab0c8", dark:"#304860", hl:"#e8f4ff", eng:"#283848", accent:"#90c0e0", flash:"rgba(160,200,230,.22)",rarity:"Legendary" },
  { name:"Obsidian",base:"#5a1890", mid:"#380a60", dark:"#0e0020", hl:"#c060ff", eng:"#e090ff", accent:"#7a28b0", flash:"rgba(120,20,220,.2)",  rarity:"Mythic" },
  { name:"Void",    base:"#0e1040", mid:"#090920", dark:"#020208", hl:"#7070f8", eng:"#a0a0ff", accent:"#3030c0", flash:"rgba(50,50,220,.22)", rarity:"Transcendent" },
  { name:"Eldritch",base:"#2a5a3a", mid:"#0e3a1a", dark:"#021a08", hl:"#80ffb0", eng:"#5af090", accent:"#1aa050", flash:"rgba(80,255,160,.24)",rarity:"Eldritch" },
  { name:"Astral",  base:"#f0e8d0", mid:"#a89060", dark:"#605030", hl:"#fff8a0", eng:"#806010", accent:"#f0c840", flash:"rgba(255,240,160,.28)",rarity:"Celestial" },
];
export const MAX_TIER = 8;
// SHOVEL_TIER_CAP[shovelLevel-1] = highest metal index reachable at that level.
// Lv9 doesn't unlock a new metal — caps at 8 (Astral). The top tier provides
// non-metal benefits (durability, depth bonus). See SHOVEL_UPS for details.
export const SHOVEL_TIER_CAP = [1, 2, 3, 4, 5, 6, 7, 8, 8];

/* ─── SHAPES ──────────────────────────────────────────────────────────── */
export const SHAPES      = ["round","round","round","round","octagonal","octagonal","hexagonal","hexagonal","holed","shield","diamond","oval"];
export const SHAPE_NAMES = { round:"Round", octagonal:"Octagonal", hexagonal:"Hexagonal", holed:"Pierced", shield:"Shield", diamond:"Diamond", oval:"Oval" };

/* ─── LORE / NAMING ───────────────────────────────────────────────────── */
export const CONS   = ["BR","DR","GR","KR","TH","SK","VR","BL","ST","MN","TR","ZR","KH","SV"];
export const VOWS   = ["AN","OR","EI","AE","UR","OA","UN","IA","YR","ETH","EOR"];
export const ERAS   = ["First","Second","Third","Ancient","Lost","Fallen","Risen","Sunken","Eternal","Cursed"];
export const EPOCH  = ["Epoch","Age","Cycle","Era","Reign","Dawn","Tide","Turning"];
export const HOUSES = ["the Ashen Crown","the Collapsing Sun","the Iron Serpent","the Void Moon","the Forgotten Flame","the Eternal Storm","the Black Tide","the Golden Silence","the Hollow King","the Ember Throne","the Shattered Mirror","the Sleeping God","the Crimson Veil"];
export const CONDS  = ["Pristine","Mint","Fine","Good","Fair","Worn","Corroded"];

/* ─── PROGRESSION ─────────────────────────────────────────────────────── */
// XP-gated titles. The TITLE_LEVELS array MUST stay the same length as
// TITLES — entries pair by index. selectTitle UI fades anything you haven't
// yet hit the level for.
export const TITLES       = ["Novice Digger","Copper Hand","Bronzesmith","Silver Seeker","Coin Warden","Vault Keeper","Master Minter","Grand Archivist","Mythic Collector","Void Walker","Starbinder","Coin Sage","Eternal Forge"];
export const TITLE_LEVELS = [1, 5, 10, 15, 22, 30, 40, 52, 65, 80, 95, 110, 130];

/* ─── RARITY (independent of metal) ──────────────────────────────────────
   Six tiers. A coin's rarity is independent of its metal — a Common Bronze
   and a Legendary Bronze are both possible. Rarity is rolled at find time
   based on dig quality, shiny status, and player level. */
export const RARITIES = [
  { id:0, name:"Common",    color:"#9a8868", glow:"rgba(154,136,104,.35)", weight:55,   valueMul:1.0  },
  { id:1, name:"Uncommon",  color:"#7ad888", glow:"rgba(122,216,136,.40)", weight:28,   valueMul:1.6  },
  { id:2, name:"Rare",      color:"#80c0ff", glow:"rgba(128,192,255,.45)", weight:11,   valueMul:2.5  },
  { id:3, name:"Epic",      color:"#c080ff", glow:"rgba(192,128,255,.50)", weight:4.5,  valueMul:4.0  },
  { id:4, name:"Legendary", color:"#f0c850", glow:"rgba(240,200,80,.55)",  weight:1.3,  valueMul:7.0  },
  { id:5, name:"Mythic",    color:"#ff7060", glow:"rgba(255,112,96,.65)",  weight:0.2,  valueMul:14.0 },
];
export const MAX_RARITY = 5;
export const RARITY_COLOR = { common:"#8a7560", uncommon:"#7ad888", rare:"#80c0ff", epic:"#c080ff", legendary:"#f0c850", mythic:"#ff7060" };

/* ─── BANNERS / FRAMES ────────────────────────────────────────────────── */
export const BANNERS = {
  stone:    "linear-gradient(135deg,#241a14 0%,#3a2820 50%,#1a120c 100%)",
  wood:     "linear-gradient(135deg,#3a1e08 0%,#5a3018 50%,#241408 100%)",
  iron:     "linear-gradient(135deg,#1a2630 0%,#2a3848 50%,#0e1820 100%)",
  gilded:   "linear-gradient(135deg,#3a2400 0%,#604000 50%,#241400 100%)",
  obsidian: "linear-gradient(135deg,#1a0040 0%,#400870 50%,#0a0020 100%)",
  void:     "linear-gradient(135deg,#04041a 0%,#101030 50%,#020210 100%)",
  // Image-backed banners — bannerStyle() turns these into proper image properties
  stargazer:"image:/banners/stargazer.webp",
  archive:  "image:/banners/archive.webp",
  wanderer: "image:/banners/wanderer.webp",
  astrarium:"image:/banners/astrarium.webp",
};
export const FRAMES = {
  stone:    { lbl:"Stone",        minLvl:1,  accent:"#8a7560" },
  wood:     { lbl:"Wood",         minLvl:5,  accent:"#a87238" },
  iron:     { lbl:"Iron",         minLvl:10, accent:"#7090b0" },
  gilded:   { lbl:"Gilded",       minLvl:20, accent:"#d4a017" },
  obsidian: { lbl:"Obsidian",     minLvl:30, accent:"#a050e8" },
  void:     { lbl:"Void",         minLvl:50, accent:"#5050e8" },
  // Premium frames — gated by both XP and a marks purchase. Keys must match BANNERS.
  stargazer:{ lbl:"Stargazer",    minLvl:15, accent:"#c8b878", premium:true, price:1800, desc:"A lone scholar at the edge of the world" },
  archive:  { lbl:"The Archive",  minLvl:20, accent:"#d4a850", premium:true, price:2100, desc:"Where every collected lore is bound in light" },
  wanderer: { lbl:"The Wanderer", minLvl:25, accent:"#a89060", premium:true, price:2400, desc:"Crowned spires beyond the wandering staff" },
  astrarium:{ lbl:"The Astrarium",minLvl:30, accent:"#b8a060", premium:true, price:3000, desc:"Where the heavens are charted on stone" },
};

// Returns the style object to spread for a banner background — handles both
// gradient strings and image URLs. Mixing CSS shorthand (`background:`) with
// React longhand (`backgroundSize:`) can cancel out, so we always split.
export function bannerStyle(frameId) {
  const v = BANNERS[frameId] || BANNERS.stone;
  if (v.startsWith("image:")) {
    const url = v.slice(6);
    return { backgroundImage:`url('${url}')`, backgroundSize:"cover", backgroundPosition:"center" };
  }
  return { backgroundImage:v };
}

/* ─── ARTEFACTS ───────────────────────────────────────────────────────────
   Forged at the Shrine by combining 5 coins of the same metal + a marks fee.
   Each metal yields a different artefact. The artefact's "grade" reflects
   the average rarity of input coins. Currently decorative; future hooks
   include effects, avatars, and companions. */
export const ARTEFACTS = [
  { metal:0, name:"Sunforged Pendant", icon:"☉", art:"copper",   desc:"A pendant blessed by solar fire. It radiates warmth and courage, burning darkness at bay." },
  { metal:1, name:"Bronze Astrolabe",  icon:"⊙", art:"bronze",   desc:"An ancient instrument used to chart the stars and measure fate's endless cycles." },
  { metal:2, name:"Silver Crescent",   icon:"☽", art:"silver",   desc:"A crescent of cold silver. It whispers of the night and guides travelers in darkness." },
  { metal:3, name:"Gilded Time",       icon:"⧗", art:"gold",     desc:"Time is suspended within. It grants moments to those who dare command it." },
  { metal:4, name:"Platinum Compass",  icon:"✥", art:"platinum", desc:"A flawless compass that points not north, but to destiny's truest path." },
  { metal:5, name:"Obsidian Mirror",   icon:"◈", art:"obsidian", desc:"It reflects not your face, but your hidden self. Beware what gazes back." },
  { metal:6, name:"Voidstone Anchor",  icon:"✶", art:null,       desc:"Heavier than any object should be — its weight pulls at more than gravity." },
  { metal:7, name:"Eldritch Codex",    icon:"⌬", art:"eldritch", desc:"Written in a language that unminds. It holds knowledge meant to remain unseen." },
  { metal:8, name:"Celestial Orb",     icon:"❋", art:"astral",   desc:"A remnant from the heavens. It hums with starlight and cosmic harmony." },
];

export const ARTEFACT_GRADES = [
  { id:0, name:"Worn",      color:"#9a8870", threshold:0   },
  { id:1, name:"Polished",  color:"#7ad888", threshold:1.5 },
  { id:2, name:"Pristine",  color:"#80c0ff", threshold:2.5 },
  { id:3, name:"Radiant",   color:"#c080ff", threshold:3.5 },
  { id:4, name:"Ascendant", color:"#f0c850", threshold:4.5 },
];

// Marks cost to forge an artefact. Aggressive curve so abundant low-tier coins
// still cost meaningful marks to convert, while top tiers serve as a long-term sink.
export const ARTEFACT_FORGE_COST = [250, 600, 1500, 3500, 7500, 14000, 22000, 32000, 50000];

/* ─── PREMIUM TITLES ──────────────────────────────────────────────────── */
// Premium titles — purchased with marks, level-gated. The `effect` string
// maps to a CSS class in styles.css for the visual flair on the title text.
// IMPORTANT: keep VALID_TITLE_IDS in functions/api/vault/index.js in sync
// with any additions here, otherwise the server will silently drop new IDs
// from saves.
export const PREMIUM_TITLES = [
  { id:"goldspun",    label:"Goldspun",            minLvl:10, price:600,  effect:"shimmer" },
  { id:"voidtouched", label:"Void-Touched",        minLvl:20, price:1500, effect:"void" },
  { id:"astral",      label:"Of the Astral Hour",  minLvl:35, price:3500, effect:"astral" },
  // Skeleton-gameplay-era additions
  { id:"bone_reaper", label:"Bone Reaper",         minLvl:18, price:1200, effect:"shimmer" },
  { id:"fortunes_hand",label:"Fortune's Hand",     minLvl:25, price:2000, effect:"shimmer" },
];
export const PREMIUM_TITLE_BY_ID  = Object.fromEntries(PREMIUM_TITLES.map(t => [t.id, t]));
export const PREMIUM_TITLE_LABELS = new Set(PREMIUM_TITLES.map(t => t.label));

/* ─── EQUIPMENT UPGRADES ──────────────────────────────────────────────── */
// Index 0 is null (no upgrade); array index = shovel level.
export const SHOVEL_UPS = [
  null,
  { label:"Iron Shovel",    depth:2, cost:[{m:0,n:3}],          desc:"Reaches depth 2" },
  { label:"Bronze Pick",    depth:3, cost:[{m:0,n:2},{m:1,n:2}],desc:"Reaches depth 3" },
  { label:"Steel Pick",     depth:4, cost:[{m:2,n:2},{m:1,n:1}],desc:"Reaches depth 4" },
  { label:"Gilded Pick",    depth:5, cost:[{m:3,n:1},{m:2,n:2}],desc:"Reaches depth 5" },
  { label:"Platinum Pick",  depth:6, cost:[{m:4,n:1},{m:3,n:1}],desc:"Reaches depth 6" },
  { label:"Void Excavator", depth:7, cost:[{m:5,n:1},{m:4,n:1}],desc:"Reaches depth 7" },
  { label:"Eldritch Drill", depth:8, cost:[{m:6,n:1},{m:5,n:1}],desc:"Reaches depth 8" },
  { label:"Astral Cleaver", depth:9, cost:[{m:7,n:1},{m:6,n:1}],desc:"Reaches depth 9 — all metals" },
  { label:"Eldritch Maul",  depth:9, cost:[{m:8,n:2},{m:7,n:2}],desc:"+ Heavy build · 50% more durability" },
];

// BRUSH constants — BA is the base brush alpha used by both the BrushReveal
// component and the brush-upgrade table. Importing it directly keeps the data
// layer self-contained without forcing components to provide it.
export const BA = 0.32;
export const BRUSH_UPS = [
  { label:"Rough Brush",  alpha:BA,  shinyChance:.005, cost:null,                     desc:"0.5% shiny chance" },
  { label:"Boar Bristle", alpha:.55, shinyChance:.015, cost:[{m:0,n:2}],              desc:"1.5% shiny chance" },
  { label:"Silver Brush", alpha:.9,  shinyChance:.03,  cost:[{m:0,n:1},{m:2,n:2}],    desc:"3% shiny chance" },
  { label:"Gold Brush",   alpha:1.0, shinyChance:.05,  cost:[{m:3,n:1},{m:2,n:1}],    desc:"5% shiny chance" },
  { label:"Void Brush",   alpha:1.0, shinyChance:.08,  cost:[{m:5,n:1}],              desc:"8% shiny chance — tarot buffs stack on top" },
];
export const MAX_SH = SHOVEL_UPS.length - 1;
export const MAX_BR = BRUSH_UPS.length - 1;

// Pickaxe durability — index by shovelLevel.
export const SHOVEL_MAX_DUR = [null, 40, 60, 90, 130, 180, 250, 350, 500, 700];

/* ─── TAROT ───────────────────────────────────────────────────────────────
   Twelve cards in Major Arcana order (I-XII). Power scales 1 → 12 with the
   numerals — early cards give a single small passive, mid cards give
   targeted boosts or QoL, late cards give run-shaping effects, and the
   final two stack multiple effects.

   Effects use existing buff fields consumed by tarotBuffs() in coin.js:
     xpMul, marksMul, pinSlots, shinyBonus, revealRarity, allowSkip,
     rerollRarity, guaranteedEvery+guaranteedFloor, rarityFloor. */
export const TAROT_CARDS = [
  // ── I-IV — Common (passive bonuses) ─────────────────────────────────
  { id:"magician",       title:"The Magician",       roman:"I",   rarity:"common", price:800,  minLvl:5,
    xpMul:0.05,
    desc:"Channel the will of the find. +5% XP from every coin." },
  { id:"high_priestess", title:"The High Priestess", roman:"II",  rarity:"common", price:1100, minLvl:7,
    xpMul:0.10,
    desc:"Hidden knowledge of value. +10% XP from every coin." },
  { id:"empress",        title:"The Empress",        roman:"III", rarity:"common", price:1400, minLvl:9,
    marksMul:0.15,
    desc:"The abundance of the earth. +15% marks from selling." },
  { id:"emperor",        title:"The Emperor",        roman:"IV",  rarity:"common", price:1800, minLvl:11,
    marksMul:0.25,
    desc:"The dominion of trade. +25% marks from selling." },

  // ── V-VIII — Rare (combos and QoL) ──────────────────────────────────
  { id:"hierophant",     title:"The Hierophant",     roman:"V",   rarity:"rare",   price:2200, minLvl:13,
    xpMul:0.15, marksMul:0.10,
    desc:"The teacher's reward. +15% XP · +10% marks." },
  { id:"lovers",         title:"The Lovers",         roman:"VI",  rarity:"rare",   price:2700, minLvl:15,
    pinSlots:1,
    desc:"Bond two coins in your cabinet. +1 display slot." },
  { id:"chariot",        title:"The Chariot",        roman:"VII", rarity:"rare",   price:3200, minLvl:17,
    shinyBonus:0.03, xpMul:0.05,
    desc:"Charge the brush. +3% shiny chance · +5% XP." },
  { id:"strength",       title:"Strength",           roman:"VIII",rarity:"rare",   price:3800, minLvl:19,
    shinyBonus:0.05,
    desc:"Brush with the strength of beasts. +5% shiny chance." },

  // ── IX-XII — Legendary (run-shaping) ────────────────────────────────
  // Hermit re-themed around revelation / hidden value rather than the
  // dig-grid "reveal rarity + skip" effects (which were tied to the
  // old gameplay loop). 2 daily rerolls is the strongest single-card
  // reroll effect; the +2% shiny tilts gambling-adjacent luck.
  { id:"hermit",         title:"The Hermit",         roman:"IX",  rarity:"legendary", price:4500, minLvl:22,
    rerollRarity:2, xpMul:0.10, shinyBonus:0.02,
    desc:"The lantern reveals what is hidden. 2 daily rarity rerolls · +2% shiny · +10% XP." },
  { id:"wheel_of_fortune",title:"Wheel of Fortune",  roman:"X",   rarity:"legendary", price:5200, minLvl:25,
    guaranteedEvery:5, guaranteedFloor:2,
    desc:"Fortune turns. Every 5th find guaranteed Rare or higher." },
  { id:"justice",        title:"Justice",            roman:"XI",  rarity:"legendary", price:5800, minLvl:28,
    guaranteedEvery:3, guaranteedFloor:2, marksMul:0.15,
    desc:"The scales tilt your way. Every 3rd find ≥ Rare · +15% marks." },
  // Hanged Man — apex tier. Rarity floor of 2 forces every find to Rare
  // or higher (massive). Stacks with daily reroll + meaningful XP/marks.
  { id:"hanged_man",     title:"The Hanged Man",     roman:"XII", rarity:"legendary", price:7000, minLvl:32,
    rarityFloor:2, rerollRarity:1, xpMul:0.30, marksMul:0.20,
    desc:"Sacrifice reshapes the world. All finds ≥ Rare · daily rarity reroll · +30% XP · +20% marks." },
];
export const TAROT_BY_ID = Object.fromEntries(TAROT_CARDS.map(c => [c.id, c]));

/* ─── TAROT PAIRS ─────────────────────────────────────────────────────────
   Equipping BOTH cards in a pair activates a bonus buff on top of the base
   effects. Since only 2 tarots can be equipped at a time, a pair fills both
   slots — the player chooses to commit to a synergy or run two solo cards.

   Buff fields here are layered on top of the individual cards' fields in
   tarotBuffs() — same field names, same buff format. */
export const TAROT_PAIRS = [
  { id:"arcane_mastery",       a:"magician",       b:"high_priestess",
    label:"Arcane Mastery",    desc:"+15% additional XP",
    xpMul:0.15 },
  { id:"imperial_mandate",     a:"empress",        b:"emperor",
    label:"Imperial Mandate",  desc:"+15% additional marks",
    marksMul:0.15 },
  { id:"sacred_union",         a:"hierophant",     b:"lovers",
    label:"Sacred Union",      desc:"+1 additional display slot",
    pinSlots:1 },
  { id:"victorious_resolve",   a:"chariot",        b:"strength",
    label:"Victorious Resolve",desc:"+4% additional shiny",
    shinyBonus:0.04 },
  { id:"convergence_of_fate",  a:"wheel_of_fortune",b:"justice",
    label:"Convergence of Fate",desc:"Every 2nd find ≥ Rare",
    guaranteedEvery:2, guaranteedFloor:2 },
  { id:"path_of_transcendence",a:"hermit",         b:"hanged_man",
    label:"Path of Transcendence",desc:"+2 additional daily rerolls",
    rerollRarity:2 },
];
export const TAROT_PAIR_BY_ID = Object.fromEntries(TAROT_PAIRS.map(p => [p.id, p]));

// Helper: returns the active pair (if any) for a given equipped-card list.
// Order of the two ids in `equippedIds` doesn't matter.
export function activeTarotPair(equippedIds = []) {
  if (!equippedIds || equippedIds.length < 2) return null;
  for (const p of TAROT_PAIRS) {
    if (equippedIds.includes(p.a) && equippedIds.includes(p.b)) return p;
  }
  return null;
}
// Two equipped at a time — combinations matter, but no card is "always-on".
export const MAX_EQUIPPED_TAROTS = 2;

/* ─── ORE / SKELETON GAMEPLAY ─────────────────────────────────────────────
   The hunt screen is now a side-scroller where skeletons spawn from the
   right, walk toward the player, get tapped to die, and drop one ore. Each
   ore is for a specific metal (matched to the existing METALS array).
   When a metal's ore bar fills, the player claims a coin of that metal —
   the existing brush-reveal flow takes over and rolls rarity + shiny as
   usual. */

// 9 ore drop weights — one per metal index. Sum to 1.0 ± rounding.
// Heavier weighting on copper/bronze so the loop feels active early, with
// astral as a vanishingly rare drop. Tweak in-game by editing this array.
export const ORE_DROP_WEIGHTS = [
  0.35,  // 0 Copper
  0.25,  // 1 Bronze
  0.15,  // 2 Silver
  0.10,  // 3 Gold
  0.07,  // 4 Platinum
  0.04,  // 5 Obsidian
  0.025, // 6 Void
  0.01,  // 7 Eldritch
  0.005, // 8 Astral
];

// How many ore drops fill a single bar (same for every metal — drop
// weights do the heavy lifting on coin-acquisition pacing).
export const ORE_PER_BAR = 10;

// Default zero state. Used when player_state.ore_counts is missing or
// when starting a fresh account.
export const DEFAULT_ORE_COUNTS = METALS.map(() => 0);

// Roll a single ore drop. Pure function — caller passes RNG range.
// Returns a metalIdx (0..8) according to ORE_DROP_WEIGHTS.
export function rollOreMetal(rand01) {
  let acc = 0;
  for (let i = 0; i < ORE_DROP_WEIGHTS.length; i++) {
    acc += ORE_DROP_WEIGHTS[i];
    if (rand01 < acc) return i;
  }
  return ORE_DROP_WEIGHTS.length - 1; // safety — should never hit
}

/* ─── DIG PIT ─────────────────────────────────────────────────────────── */
// 4×4 grid of soil cells. Used by both DigPit (rendering) and the main
// MintForge state machine (predicting non-coin cells for scrap budget).
export const GRID = 4;

/* ─── HUNT SENSE TEXT ─────────────────────────────────────────────────────
   Italicised line that drifts in based on signal strength on the hunt screen. */
export const SENSE_PHRASES = {
  faint:  ["something stirs the soil","the ground answers, faintly","a breath in the loam"],
  rising: ["the soil grows warmer","metal sings beneath","ancient echoes rise"],
  close:  ["something is here","the field grows tense","the air thickens"],
  locked: ["here. dig.","the coin waits","this place. now."],
};

/* ════════════════════════════════════════════════════════════════════════
 *  LOCATIONS — biomes the player travels to in the side-scrolling Hunt
 *  ────────────────────────────────────────────────────────────────────────
 *  Each location is a side-scrolling biome with its own coin profile.
 *  v1 ships ONE location ("the field") so the structure is set up for
 *  later expansion without code restructuring. To add a biome later:
 *    1. Add an entry here with art paths + dig modifiers
 *    2. Drop the parallax layer images into public/locations/<id>/
 *    3. Set its `unlockShovelLevel` to gate it behind a pickaxe tier
 *
 *  Fields:
 *    id                — stable string identifier (used in URLs/state)
 *    name              — display name on the map
 *    desc              — one-line atmospheric description
 *    unlockShovelLevel — minimum shovel level to enter (1 = always available)
 *    bgLayers          — list of parallax layer paths, deepest first.
 *                        Each layer has its own scrollMul (0 = static, 1 = world)
 *    scrollSpeed       — world scroll speed in px/sec at the foreground
 *    glintFrequency    — fraction of coin windows that surface a glint cue (0–1)
 *                        0.6 = 60% of windows are glinted, 40% are silent (per design)
 *    windowSpacingMs   — average ms between coin windows (range ±25%)
 *    windowDurationMs  — how long each window stays in tap-eligible range
 *    metalBias         — multiplier per metal idx applied during pickMetal
 *                        e.g. [1.5, 1.2, 1, 1, 1, 1, 1, 1, 1] biases toward copper
 *    rarityFloor       — minimum rarity index for finds (0 = common allowed)
 * ════════════════════════════════════════════════════════════════════════ */

export const LOCATIONS = [
  {
    id: "field",
    name: "The Field",
    desc: "Tall grass, distant mountains. The default stretch of earth.",
    unlockShovelLevel: 1,
    // Three-layer parallax: sky static, near foreground scrolls at world
    // speed. Far layer dropped per the skeleton-gameplay redesign — its
    // role is taken by procedurally-spawned trees/bushes/vending machines
    // in HuntSideScroller.
    bgLayers: [
      { path: "/locations/field/sky.webp",  scrollMul: 0    },
      { path: "/locations/field/near.webp", scrollMul: 1.0  },
    ],
    scrollSpeed: 0.3,            // viewport-widths per second
    glintFrequency: 0.6,
    windowSpacingMs: 6000,     // average ~6s between windows
    windowDurationMs: 1800,    // ~1.8s tap-eligible window
    metalBias: [1.5, 1.3, 1, 1, 1, 1, 1, 1, 1],  // copper/bronze biased
    rarityFloor: 0,
  },
  // Future locations slot in here. Examples (NOT YET BUILT):
  //
  // {
  //   id: "ruins", name: "The Eldritch Ruins",
  //   desc: "Stone and silence. Things sleep here that should not.",
  //   unlockShovelLevel: 5,
  //   bgLayers: [{path:"/locations/ruins/sky.webp", scrollMul:0.05}, ...],
  //   scrollSpeed: 55, glintFrequency: 0.5, windowSpacingMs: 5000,
  //   metalBias: [0.5, 0.7, 1, 1.2, 1.4, 1.6, 1.5, 1.3, 1.1],
  //   rarityFloor: 1,
  // },
];

// Fast lookup by id; v1 only has one entry but consumers should still go
// through this so the API doesn't change when biomes get added.
export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));
export const DEFAULT_LOCATION_ID = "field";

/* ════════════════════════════════════════════════════════════════════════
 *  COIN EMBLEM CATALOGUE
 *  ────────────────────────────────────────────────────────────────────────
 *  Coins are now hand-illustrated rather than procedurally drawn. The art
 *  lives at /public/coins/<metal>_<emblem>.png and is sliced from a master
 *  sheet by tools/slice-coins.mjs.
 *
 *  Each metal has a roster of available emblems. A coin's seed deterministic-
 *  ally picks one from its metal's roster. Same seed → same emblem, always.
 *
 *  Copper and Bronze have 32 emblems each (more variety for the most-found
 *  coins). All other metals have 16 emblems (the "base" set).
 * ════════════════════════════════════════════════════════════════════════ */

// The 16 base emblems shared across every metal.
export const EMBLEMS_BASE = [
  "compass", "crescent", "sun", "northstar", "eye", "sword",
  "chalice", "scales", "laurel", "lyre", "tree", "flame",
  "lotus", "wing", "key", "tower",
];

// Additional 16 emblems available only for Copper and Bronze.
// Names marked TODO need verification against the source sheet — derived
// from visual analysis but a couple of cells were ambiguous.
export const EMBLEMS_EXTRA = [
  "chalice2", "tower2", "hourglass", "serpent", "triskele", "shield",
  "feather", "wolf", "bear", "anchor", "pendant", "shootingstar",
  "planet", "book", "crystal", "comet",
];

// Per-metal emblem rosters. Look up by metalIdx (0-8 from METALS array).
//   0=Copper  1=Bronze   →  base + extra (32 emblems)
//   2-8 (Silver→Astral)  →  base only (16 emblems)
export const EMBLEMS_BY_METAL = [
  [...EMBLEMS_BASE, ...EMBLEMS_EXTRA], // 0 Copper
  [...EMBLEMS_BASE, ...EMBLEMS_EXTRA], // 1 Bronze
  EMBLEMS_BASE,                        // 2 Silver
  EMBLEMS_BASE,                        // 3 Gold
  EMBLEMS_BASE,                        // 4 Platinum
  EMBLEMS_BASE,                        // 5 Obsidian
  EMBLEMS_BASE,                        // 6 Void
  EMBLEMS_BASE,                        // 7 Eldritch
  EMBLEMS_BASE,                        // 8 Astral
];

// File-system metal slugs — must match the slicer output filenames.
// Keep in step with METALS array order.
export const METAL_SLUGS = [
  "copper", "bronze", "silver", "gold", "platinum",
  "obsidian", "void", "eldritch", "astral",
];

// Pick an emblem deterministically from a coin's seed + metal.
// Same seed → same emblem, every render. Stable as long as the metal's
// roster doesn't change order.
export function emblemForCoin(seed, metalIdx) {
  const roster = EMBLEMS_BY_METAL[metalIdx] || EMBLEMS_BASE;
  // xor with a fixed constant so emblem distribution doesn't accidentally
  // correlate with other seed-derived properties (rune name, era, etc.)
  const idx = ((seed >>> 0) ^ 0xc01ee) % roster.length;
  return roster[idx];
}

// Returns the public asset path for a coin image.
// Used by CoinCanvas / CoinModal / RevealBanner.
export function coinImagePath(coin) {
  const metal = METAL_SLUGS[coin.metalIdx] || "copper";
  const emblem = emblemForCoin(coin.seed, coin.metalIdx);
  return `/coins/${metal}_${emblem}.png`;
}

