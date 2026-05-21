/* ════════════════════════════════════════════════════════════════════════
 *  /api/vault  —  GET  : return player's vault snapshot
 *                POST : apply a transaction (state update, add/remove coins)
 *
 *  Matches the catforge v1 schema:
 *    player_state(player_id, xp, field_state, cosmetics, updated_at)
 *    coins(id, player_id, seed, metal_idx, rarity, shiny, locked, pinned,
 *          found_at, source)
 * ════════════════════════════════════════════════════════════════════════ */

import { json, bad, getAuth } from "../_utils.js";

/* ── GET: snapshot ────────────────────────────────────────────── */
export const onRequestGet = async ({ request, env }) => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("unauthorized", 401);
  const pid = auth.player.id;

  // Ensure player_state row exists (lazy create on first GET)
  await env.DB.prepare(
    `INSERT OR IGNORE INTO player_state (player_id, xp, field_state, cosmetics, updated_at)
     VALUES (?1, 0, '{}', '{}', ?2)`
  ).bind(pid, Date.now()).run();

  const state = await env.DB.prepare(
    `SELECT xp, field_state, cosmetics FROM player_state WHERE player_id = ?1`
  ).bind(pid).first();

  let fieldState = {};
  let cosmetics  = {};
  try { fieldState = JSON.parse(state?.field_state || "{}"); } catch {}
  try { cosmetics  = JSON.parse(state?.cosmetics   || "{}"); } catch {}

  // Marks live inside cosmetics for now (no dedicated column). When/if
  // marks gets its own column later, swap this with a direct read.
  const marks = Number(cosmetics.marks || 0);

  const coinsRes = await env.DB.prepare(
    `SELECT id, seed, metal_idx AS metalIdx, rarity, shiny, locked, pinned
       FROM coins WHERE player_id = ?1 ORDER BY found_at DESC`
  ).bind(pid).all();

  return json({
    username:   auth.player.username,
    xp:         Number(state?.xp || 0),
    marks,
    fieldState,
    cosmetics,
    coins:      coinsRes.results || [],
  });
};

/* ── POST: transaction ────────────────────────────────────────── */
/* Accepts a body like:
   {
     state: { xp?, marks?, fieldState?, cosmetics? },
     add:    [{ id, seed, metalIdx, rarity, shiny?, source? }, ...],
     remove: ["coinId", ...],
     lock:   [{ id, locked: true|false }, ...]
   }
   Everything is optional. Returns { ok: true }. */
export const onRequestPost = async ({ request, env }) => {
  const auth = await getAuth(request, env);
  if (!auth) return bad("unauthorized", 401);
  const pid = auth.player.id;

  let body = {};
  try { body = await request.json(); } catch { return bad("invalid json"); }

  // 1) state patch — merge with existing player_state
  if (body.state && typeof body.state === "object") {
    const cur = await env.DB.prepare(
      `SELECT xp, field_state, cosmetics FROM player_state WHERE player_id = ?1`
    ).bind(pid).first();
    let curField = {}; let curCos = {};
    try { curField = JSON.parse(cur?.field_state || "{}"); } catch {}
    try { curCos   = JSON.parse(cur?.cosmetics   || "{}"); } catch {}

    const nextXP    = Number.isFinite(body.state.xp)    ? body.state.xp    : Number(cur?.xp || 0);
    const nextField = (body.state.fieldState && typeof body.state.fieldState === "object") ? body.state.fieldState : curField;
    const nextCos   = { ...curCos };
    if (body.state.cosmetics && typeof body.state.cosmetics === "object") {
      Object.assign(nextCos, body.state.cosmetics);
    }
    if (Number.isFinite(body.state.marks)) nextCos.marks = body.state.marks;

    await env.DB.prepare(
      `INSERT INTO player_state (player_id, xp, field_state, cosmetics, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(player_id) DO UPDATE SET
         xp=excluded.xp, field_state=excluded.field_state,
         cosmetics=excluded.cosmetics, updated_at=excluded.updated_at`
    ).bind(pid, nextXP, JSON.stringify(nextField), JSON.stringify(nextCos), Date.now()).run();
  }

  // 2) add coins
  if (Array.isArray(body.add) && body.add.length) {
    const stmts = body.add.map(c => env.DB.prepare(
      `INSERT OR IGNORE INTO coins (id, player_id, seed, metal_idx, rarity, shiny, locked, pinned, found_at, source)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, ?7, ?8)`
    ).bind(
      String(c.id),
      pid,
      Number(c.seed) | 0,
      Number(c.metalIdx) | 0,
      Number(c.rarity || 0),
      c.shiny ? 1 : 0,
      Date.now(),
      c.source || null,
    ));
    await env.DB.batch(stmts);
  }

  // 3) remove coins (only the caller's)
  if (Array.isArray(body.remove) && body.remove.length) {
    const stmts = body.remove.map(id => env.DB.prepare(
      `DELETE FROM coins WHERE id = ?1 AND player_id = ?2`
    ).bind(String(id), pid));
    await env.DB.batch(stmts);
  }

  // 4) lock / unlock
  if (Array.isArray(body.lock) && body.lock.length) {
    const stmts = body.lock.map(e => env.DB.prepare(
      `UPDATE coins SET locked = ?1 WHERE id = ?2 AND player_id = ?3`
    ).bind(e.locked ? 1 : 0, String(e.id), pid));
    await env.DB.batch(stmts);
  }

  return json({ ok: true });
};
