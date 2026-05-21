import { json, bad, getAuth } from "../_utils.js";

/* Valid tarot card IDs — kept in lockstep with the client TAROT_CARDS catalog.
   12 cards across three tiers (post-skeleton-gameplay rewrite). Effects on
   the client side are TBD/no-op for now, but ownership is still tracked. */
const VALID_TAROT_IDS = new Set([
  // common
  "magician", "high_priestess", "empress", "emperor",
  // rare
  "lovers", "chariot", "strength", "hermit",
  // legendary
  "wheel_of_fortune", "justice", "hanged_man", "hierophant",
]);
/* Premium frame/banner IDs — only premium ones are validated since standard frames
   are XP-gated and never require ownership tracking. */
const VALID_FRAME_IDS = new Set(["stargazer","wanderer","archive","astrarium"]);
/* Premium title IDs — kept in sync with PREMIUM_TITLES in lib/data.js. */
const VALID_TITLE_IDS = new Set(["goldspun","voidtouched","astral","bone_reaper","fortunes_hand"]);

/* Helper — try a query, return null on any failure (typically schema mismatch). */
async function tryQuery(env, sql, ...binds) {
  try {
    const stmt = env.DB.prepare(sql).bind(...binds);
    return await stmt.first();
  } catch { return null; }
}
async function tryQueryAll(env, sql, ...binds) {
  try {
    const stmt = env.DB.prepare(sql).bind(...binds);
    const r = await stmt.all();
    return r.results || [];
  } catch { return []; }
}

/*  GET  /api/vault — full hydrated player state.
    Resilient to missing migrations: queries new columns separately and falls
    back to defaults if they don't exist yet. */
export async function onRequestGet({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const pid = auth.player.id;

  // Base query — must succeed. These columns exist since v1.
  const baseState = await tryQuery(env,
    `SELECT xp, shovel_level, brush_level, frame, bio, selected_title, pinned_ids
       FROM player_state WHERE player_id = ?1`, pid);

  if (!baseState) return bad("State missing — your account may need recreating", 500);

  // v2+ columns. Query independently so a missing migration doesn't 500 the whole endpoint.
  const v2Extras = await tryQuery(env,
    `SELECT marks, shovel_dur, equipped_tarots
       FROM player_state WHERE player_id = ?1`, pid);
  // v3+ cosmetic columns. Separate query so v2 still works if v3 isn't applied.
  const v3Extras = await tryQuery(env,
    `SELECT owned_frames, owned_titles
       FROM player_state WHERE player_id = ?1`, pid);
  // v4+ tarot-state columns (find streak for Wheel of Fortune, hanged-man daily-reroll date)
  const v4Extras = await tryQuery(env,
    `SELECT find_streak, hanged_man_date
       FROM player_state WHERE player_id = ?1`, pid);
  // v8+ ore counters. Resilient to missing migration via tryQuery wrapper.
  const v8Extras = await tryQuery(env,
    `SELECT ore_counts FROM player_state WHERE player_id = ?1`, pid);
  let oreCounts = [0,0,0,0,0,0,0,0,0];
  if (v8Extras?.ore_counts) {
    try {
      const parsed = JSON.parse(v8Extras.ore_counts);
      if (Array.isArray(parsed) && parsed.length === 9) {
        oreCounts = parsed.map(n => Math.max(0, Math.min(10, Number(n)||0)));
      }
    } catch {}
  }

  // Coins. Try with rarity first; fall back to v1 schema if column missing.
  let coins = await tryQueryAll(env,
    `SELECT id, seed, metal_idx, shiny, locked, rarity, acquired_at FROM coins
      WHERE player_id = ?1 ORDER BY acquired_at DESC`, pid);
  if (!coins.length) {
    // Either truly empty OR rarity column missing — try without that column to be sure
    coins = await tryQueryAll(env,
      `SELECT id, seed, metal_idx, shiny, locked, acquired_at FROM coins
        WHERE player_id = ?1 ORDER BY acquired_at DESC`, pid);
  }

  // tarot_cards table may not exist yet — empty array is the right default.
  const tarots = await tryQueryAll(env,
    `SELECT card_id FROM tarot_cards WHERE player_id = ?1 ORDER BY acquired_at`, pid);

  // artefacts table may not exist yet (v5+) — empty array fallback.
  const artefactsRows = await tryQueryAll(env,
    `SELECT id, metal, grade, forged_at FROM artefacts WHERE player_id = ?1 ORDER BY forged_at DESC`, pid);

  return json({
    username: auth.player.username,
    xp: baseState.xp,
    shovelLevel: baseState.shovel_level,
    brushLevel: baseState.brush_level,
    frame: baseState.frame,
    bio: baseState.bio || "",
    selectedTitle: baseState.selected_title,
    pinnedIds: baseState.pinned_ids ? JSON.parse(baseState.pinned_ids) : null,
    marks: v2Extras?.marks || 0,
    shovelDur: v2Extras?.shovel_dur != null ? v2Extras.shovel_dur : 40,
    ownedTarots: tarots.map(r => r.card_id),
    equippedTarots: v2Extras?.equipped_tarots ? JSON.parse(v2Extras.equipped_tarots) : [],
    ownedFrames: v3Extras?.owned_frames ? JSON.parse(v3Extras.owned_frames) : [],
    ownedTitles: v3Extras?.owned_titles ? JSON.parse(v3Extras.owned_titles) : [],
    findStreak: typeof v4Extras?.find_streak === "number" ? v4Extras.find_streak : 0,
    hangedManDate: typeof v4Extras?.hanged_man_date === "string" ? v4Extras.hanged_man_date : "",
    oreCounts,
    artefacts: artefactsRows.map(r => ({
      id: r.id,
      metal: r.metal,
      grade: r.grade,
      forgedAt: r.forged_at,
    })),
    coins: coins.map(r => ({
      id: r.id,
      seed: r.seed >>> 0,
      metalIdx: r.metal_idx,
      shiny: !!r.shiny,
      locked: !!r.locked,
      ...(r.rarity != null ? { rarity: r.rarity } : {}),
    })),
    // Flag the client can use to warn about pending migrations.
    schemaWarning: !v2Extras ? "Server is missing v3 migration — currency, durability, and tarot features will not persist."
                   : !v3Extras ? "Server is missing v4 migration — premium banner and title purchases will not persist."
                   : null,
  });
}

/*  POST /api/vault — transactional update.
    Resilient: skips updates that target missing columns/tables rather than
    failing the whole batch. */
export async function onRequestPost({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const pid = auth.player.id;

  let body;
  try { body = await request.json(); } catch { return bad("Invalid JSON"); }

  const stmts = [];          // base statements that should always work
  const optionalStmts = [];  // v2+ statements that may fail on un-migrated DBs
  const now = Date.now();

  // ── coin removals ──────────────────────────────────────────
  if (Array.isArray(body.remove) && body.remove.length) {
    const ids = body.remove.slice(0, 200).filter(x => typeof x === "string" && x.length <= 80);
    const placeholders = ids.map((_, i) => `?${i + 2}`).join(",");
    if (ids.length) {
      stmts.push(env.DB.prepare(
        `DELETE FROM coins WHERE player_id = ?1 AND id IN (${placeholders})`
      ).bind(pid, ...ids));
    }
  }

  // ── coin additions ─────────────────────────────────────────
  if (Array.isArray(body.add) && body.add.length) {
    for (const c of body.add.slice(0, 50)) {
      if (typeof c?.id !== "string" || c.id.length > 80) continue;
      if (typeof c.seed !== "number") continue;
      if (typeof c.metalIdx !== "number" || c.metalIdx < 0 || c.metalIdx > 8) continue;
      const rarity = (typeof c.rarity === "number" && c.rarity >= 0 && c.rarity <= 5) ? (c.rarity | 0) : null;
      // Always do the v1 insert (works without migration).
      stmts.push(env.DB.prepare(
        `INSERT OR REPLACE INTO coins (id, player_id, seed, metal_idx, shiny, locked, acquired_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      ).bind(c.id, pid, (c.seed >>> 0), c.metalIdx | 0, c.shiny ? 1 : 0, c.locked ? 1 : 0, now));
      // Then update rarity column separately — only succeeds if the column exists,
      // doesn't poison the batch if it doesn't.
      if (rarity != null) {
        optionalStmts.push(env.DB.prepare(
          `UPDATE coins SET rarity = ?3 WHERE player_id = ?1 AND id = ?2`
        ).bind(pid, c.id, rarity));
      }
    }
  }

  // ── lock toggle ────────────────────────────────────────────
  if (Array.isArray(body.lock) && body.lock.length) {
    for (const op of body.lock.slice(0, 50)) {
      if (typeof op?.id !== "string" || op.id.length > 80) continue;
      stmts.push(env.DB.prepare(
        `UPDATE coins SET locked = ?3 WHERE player_id = ?1 AND id = ?2`
      ).bind(pid, op.id, op.locked ? 1 : 0));
    }
  }

  // ── tarot purchases (v3+) — optional, may fail on un-migrated DBs
  if (Array.isArray(body.tarotBuy) && body.tarotBuy.length) {
    for (const cid of body.tarotBuy.slice(0, 12)) {
      if (typeof cid !== "string" || !VALID_TAROT_IDS.has(cid)) continue;
      optionalStmts.push(env.DB.prepare(
        `INSERT OR IGNORE INTO tarot_cards (player_id, card_id, acquired_at) VALUES (?1, ?2, ?3)`
      ).bind(pid, cid, now));
    }
  }
  if (Array.isArray(body.tarotSell) && body.tarotSell.length) {
    for (const cid of body.tarotSell.slice(0, 12)) {
      if (typeof cid !== "string") continue;
      optionalStmts.push(env.DB.prepare(
        `DELETE FROM tarot_cards WHERE player_id = ?1 AND card_id = ?2`
      ).bind(pid, cid));
    }
  }

  // ── artefact additions (v5+) — optional, may fail on un-migrated DBs
  if (Array.isArray(body.artefactAdd) && body.artefactAdd.length) {
    for (const a of body.artefactAdd.slice(0, 5)) {
      if (typeof a?.id !== "string" || a.id.length > 80) continue;
      if (typeof a.metal !== "number" || a.metal < 0 || a.metal > 8) continue;
      if (typeof a.grade !== "number" || a.grade < 0 || a.grade > 4) continue;
      optionalStmts.push(env.DB.prepare(
        `INSERT OR IGNORE INTO artefacts (id, player_id, metal, grade, forged_at) VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(a.id, pid, a.metal | 0, a.grade | 0, a.forgedAt || now));
    }
  }

  // ── scalar state patch ─────────────────────────────────────
  // Split base columns from v3+ columns so the latter can be dropped if the migration
  // hasn't run yet, without losing the base updates (xp, levels, etc.).
  if (body.state && typeof body.state === "object") {
    const s = body.state;
    const baseFields = []; const baseBinds = [pid];
    const v2Fields = []; const v2Binds = [pid];
    const v3Fields = []; const v3Binds = [pid];
    const v4Fields = []; const v4Binds = [pid];
    const v8Fields = []; const v8Binds = [pid];
    const addBase = (col, value) => { baseBinds.push(value); baseFields.push(`${col} = ?${baseBinds.length}`); };
    const addV2 = (col, value) => { v2Binds.push(value); v2Fields.push(`${col} = ?${v2Binds.length}`); };
    const addV3 = (col, value) => { v3Binds.push(value); v3Fields.push(`${col} = ?${v3Binds.length}`); };
    const addV4 = (col, value) => { v4Binds.push(value); v4Fields.push(`${col} = ?${v4Binds.length}`); };
    const addV8 = (col, value) => { v8Binds.push(value); v8Fields.push(`${col} = ?${v8Binds.length}`); };

    if (Number.isFinite(s.xp))           addBase("xp", Math.max(0, s.xp | 0));
    if (Number.isFinite(s.shovelLevel))  addBase("shovel_level", Math.max(1, Math.min(9, s.shovelLevel | 0)));
    if (Number.isFinite(s.brushLevel))   addBase("brush_level", Math.max(0, Math.min(4, s.brushLevel | 0)));
    if (typeof s.frame === "string")     addBase("frame", String(s.frame).slice(0, 20));
    if (typeof s.bio === "string")       addBase("bio", String(s.bio).slice(0, 120));
    if (typeof s.selectedTitle === "string") addBase("selected_title", String(s.selectedTitle).slice(0, 40));
    if ("pinnedIds" in s) {
      if (s.pinnedIds === null) addBase("pinned_ids", null);
      else if (Array.isArray(s.pinnedIds)) addBase("pinned_ids", JSON.stringify(s.pinnedIds.slice(0, 8)));
    }
    // v3+ columns
    if (Number.isFinite(s.marks))     addV2("marks", Math.max(0, s.marks | 0));
    if (Number.isFinite(s.shovelDur)) addV2("shovel_dur", Math.max(0, Math.min(800, s.shovelDur | 0)));
    if (Array.isArray(s.equippedTarots)) {
      // Cap at 2 (cut from 5 in tarot rework). Server enforces too so a hacked client can't equip more.
      const filtered = s.equippedTarots.filter(c => typeof c === "string" && VALID_TAROT_IDS.has(c)).slice(0, 2);
      addV2("equipped_tarots", JSON.stringify(filtered));
    }
    // v3+ cosmetic ownership lists
    if (Array.isArray(s.ownedFrames)) {
      const filtered = s.ownedFrames.filter(f => typeof f === "string" && VALID_FRAME_IDS.has(f)).slice(0, 20);
      addV3("owned_frames", JSON.stringify(filtered));
    }
    if (Array.isArray(s.ownedTitles)) {
      const filtered = s.ownedTitles.filter(t => typeof t === "string" && VALID_TITLE_IDS.has(t)).slice(0, 20);
      addV3("owned_titles", JSON.stringify(filtered));
    }
    // v4+ tarot run-state
    if (Number.isFinite(s.findStreak))     addV4("find_streak", Math.max(0, Math.min(99, s.findStreak | 0)));
    if (typeof s.hangedManDate === "string") addV4("hanged_man_date", s.hangedManDate.slice(0, 24));

    // v8+ ore counters (skeleton-gameplay loop). Clamp each cell to 0..10.
    if (Array.isArray(s.oreCounts) && s.oreCounts.length === 9) {
      const clamped = s.oreCounts.map(n => Math.max(0, Math.min(10, Number(n)||0)));
      addV8("ore_counts", JSON.stringify(clamped));
    }

    if (baseFields.length) {
      stmts.push(env.DB.prepare(
        `UPDATE player_state SET ${baseFields.join(", ")} WHERE player_id = ?1`
      ).bind(...baseBinds));
    }
    if (v2Fields.length) {
      optionalStmts.push(env.DB.prepare(
        `UPDATE player_state SET ${v2Fields.join(", ")} WHERE player_id = ?1`
      ).bind(...v2Binds));
    }
    if (v3Fields.length) {
      optionalStmts.push(env.DB.prepare(
        `UPDATE player_state SET ${v3Fields.join(", ")} WHERE player_id = ?1`
      ).bind(...v3Binds));
    }
    if (v4Fields.length) {
      optionalStmts.push(env.DB.prepare(
        `UPDATE player_state SET ${v4Fields.join(", ")} WHERE player_id = ?1`
      ).bind(...v4Binds));
    }
    if (v8Fields.length) {
      optionalStmts.push(env.DB.prepare(
        `UPDATE player_state SET ${v8Fields.join(", ")} WHERE player_id = ?1`
      ).bind(...v8Binds));
    }
  }

  if (!stmts.length && !optionalStmts.length) return json({ ok: true, noop: true });

  // Run base statements as a strict batch — these MUST succeed.
  try {
    if (stmts.length) await env.DB.batch(stmts);
  } catch (e) {
    return bad("Transaction failed: " + (e.message || "unknown"), 500);
  }

  // Run v2+ statements one by one, swallowing per-statement errors so a missing
  // migration on, say, the tarot_cards table doesn't poison the rest.
  let optionalSkipped = 0;
  for (const s of optionalStmts) {
    try { await s.run(); }
    catch { optionalSkipped++; }
  }

  return json({ ok: true, optionalSkipped });
}
