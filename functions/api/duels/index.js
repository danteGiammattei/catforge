/* MintForge · /api/duels
 *
 * Friend-vs-friend coin battles. The flow:
 *   1. Challenger creates a duel naming a friend + a coin to stake.
 *   2. Challenged either declines, or stakes a coin of their own.
 *      Both stakes must be within 1 metal tier of each other.
 *   3. Either side can trigger the flip. Server runs a best-of-3 from a
 *      deterministic seed and transfers both coins to the winner.
 *
 * Security:
 *   - Only friends (mutual) can challenge each other.
 *   - Coins must belong to the staking player and not be locked.
 *   - The flip seed is generated server-side at resolve time and stored,
 *     so the result is auditable.
 *   - Coin ownership transfer + duel status update happen in a single
 *     batch transaction.
 *
 * Endpoints:
 *   GET  /api/duels                       — list user's pending+active duels
 *   POST /api/duels        {action:"create",     friendUsername, coinId}
 *   POST /api/duels        {action:"accept",     duelId, coinId}
 *   POST /api/duels        {action:"decline",    duelId}
 *   POST /api/duels        {action:"flip",       duelId}
 */

import { json, bad, getAuth } from "../_utils.js";

const DUEL_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const MAX_TIER_GAP = 1;                  // bronze can fight copper or silver, not gold

/* ─── Helpers ─── */
function newDuelId() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return "d_" + Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

/* Are two players friends in BOTH directions? */
async function areFriends(env, aId, bId) {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) as c FROM friends
      WHERE (player_id = ?1 AND friend_id = ?2)
         OR (player_id = ?2 AND friend_id = ?1)`
  ).bind(aId, bId).first();
  return (r?.c || 0) >= 2;
}

/* Look up a coin that belongs to a player and is eligible to stake. */
async function fetchOwnedCoin(env, playerId, coinId) {
  const c = await env.DB.prepare(
    `SELECT id, seed, metal_idx, shiny, locked, rarity
       FROM coins WHERE player_id = ?1 AND id = ?2`
  ).bind(playerId, coinId).first();
  if (!c) return null;
  if (c.locked) return null;
  return c;
}

/* Hash a string with SHA-256, returning lowercase hex. Used to make the
   flip seed depend on duel id + both player ids + a timestamp + crypto rand
   — none of which any single party controls. */
async function sha256Hex(input) {
  const buf = new TextEncoder().encode(input);
  const out = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(out), b => b.toString(16).padStart(2, "0")).join("");
}

/* Run three deterministic flips from a seed. Each flip uses 16 hex chars
   (64 bits) of the seed converted to a number; even = challenger, odd = challenged.
   First to 2 wins; we may stop early but always store all three results for audit. */
function runFlips(seedHex, challengerId, challengedId) {
  const flips = [];
  for (let i = 0; i < 3; i++) {
    const slice = seedHex.slice(i * 16, i * 16 + 16);
    const n = BigInt("0x" + slice);
    const challengerWins = (n & 1n) === 0n;
    flips.push(challengerWins);
    // Early stop if someone has 2 wins, but we still record any pre-rolled flips so the seed is fully traceable.
    const cWins = flips.filter(f => f).length;
    const xWins = flips.length - cWins;
    if (cWins === 2 || xWins === 2) {
      // Pad remaining slots with the same flip-result-byte for transparency. Not played, marked as null.
      while (flips.length < 3) flips.push(null);
      break;
    }
  }
  const cWins = flips.filter(f => f === true).length;
  const winnerId = cWins >= 2 ? challengerId : challengedId;
  return { flips, winnerId };
}

/* ─── GET /api/duels ─── */
export async function onRequestGet({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const pid = auth.player.id;
  const now = Date.now();

  // Auto-decline expired pending/ready duels involving this player. Cheap.
  await env.DB.prepare(
    `UPDATE duels SET status = 'declined', resolved_at = ?1
       WHERE expires_at < ?1
         AND status IN ('pending','ready')
         AND (challenger_id = ?2 OR challenged_id = ?2)`
  ).bind(now, pid).run();

  // Pending+ready duels where this player is involved
  const rows = await env.DB.prepare(
    `SELECT d.id, d.challenger_id, d.challenged_id,
            d.challenger_coin, d.challenged_coin,
            d.status, d.flip_results, d.winner_id,
            d.created_at, d.resolved_at, d.expires_at,
            pc.username AS challenger_username, pc.frame AS challenger_frame,
            px.username AS challenged_username, px.frame AS challenged_frame
       FROM duels d
       JOIN players pc ON pc.id = d.challenger_id
       JOIN players px ON px.id = d.challenged_id
      WHERE (d.challenger_id = ?1 OR d.challenged_id = ?1)
        AND d.status IN ('pending','ready')
      ORDER BY d.created_at DESC
      LIMIT 30`
  ).bind(pid).all();

  // For each duel, hydrate the staked coins so the UI can render them.
  // Coins might no longer exist (stale), in which case we expose null.
  const duels = [];
  for (const r of (rows.results || [])) {
    const challengerCoin = r.challenger_coin
      ? await env.DB.prepare(
          `SELECT id, seed, metal_idx, shiny, rarity FROM coins WHERE id = ?1`
        ).bind(r.challenger_coin).first()
      : null;
    const challengedCoin = r.challenged_coin
      ? await env.DB.prepare(
          `SELECT id, seed, metal_idx, shiny, rarity FROM coins WHERE id = ?1`
        ).bind(r.challenged_coin).first()
      : null;
    duels.push({
      id: r.id,
      role: r.challenger_id === pid ? "challenger" : "challenged",
      status: r.status,
      challengerUsername: r.challenger_username,
      challengerFrame: r.challenger_frame,
      challengedUsername: r.challenged_username,
      challengedFrame: r.challenged_frame,
      challengerCoin: challengerCoin ? {
        id: challengerCoin.id,
        seed: challengerCoin.seed >>> 0,
        metalIdx: challengerCoin.metal_idx,
        shiny: !!challengerCoin.shiny,
        rarity: challengerCoin.rarity,
      } : null,
      challengedCoin: challengedCoin ? {
        id: challengedCoin.id,
        seed: challengedCoin.seed >>> 0,
        metalIdx: challengedCoin.metal_idx,
        shiny: !!challengedCoin.shiny,
        rarity: challengedCoin.rarity,
      } : null,
      flipResults: r.flip_results ? JSON.parse(r.flip_results) : null,
      winnerId: r.winner_id,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    });
  }
  return json({ duels });
}

/* ─── POST /api/duels — action router ─── */
export async function onRequestPost({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const pid = auth.player.id;

  let body;
  try { body = await request.json(); } catch { return bad("Invalid JSON"); }
  const action = body?.action;
  if (typeof action !== "string") return bad("Missing action");

  if (action === "create")  return await actionCreate(env, pid, body);
  if (action === "accept")  return await actionAccept(env, pid, body);
  if (action === "decline") return await actionDecline(env, pid, body);
  if (action === "flip")    return await actionFlip(env, pid, body);
  return bad("Unknown action: " + action, 400);
}

/* ─── create — challenger initiates a duel ─── */
async function actionCreate(env, pid, body) {
  const friendUsername = typeof body.friendUsername === "string" ? body.friendUsername.trim().toLowerCase() : "";
  const coinId = typeof body.coinId === "string" ? body.coinId : "";
  if (!friendUsername) return bad("Missing friendUsername");
  if (!coinId)         return bad("Missing coinId");

  // Look up the friend
  const friend = await env.DB.prepare(
    `SELECT id, username FROM players WHERE LOWER(username) = ?1`
  ).bind(friendUsername).first();
  if (!friend) return bad("Player not found", 404);
  if (friend.id === pid) return bad("Cannot duel yourself", 400);

  // Friendship check — must be mutual
  if (!(await areFriends(env, pid, friend.id))) return bad("You can only duel friends", 403);

  // Coin check
  const coin = await fetchOwnedCoin(env, pid, coinId);
  if (!coin) return bad("Coin not available to stake", 400);

  // One pending/ready duel per friend pair at a time
  const existing = await env.DB.prepare(
    `SELECT id FROM duels
      WHERE status IN ('pending','ready')
        AND ((challenger_id = ?1 AND challenged_id = ?2)
          OR (challenger_id = ?2 AND challenged_id = ?1))
      LIMIT 1`
  ).bind(pid, friend.id).first();
  if (existing) return bad("You already have an active duel with this friend", 409);

  const now = Date.now();
  const id = newDuelId();
  await env.DB.prepare(
    `INSERT INTO duels
       (id, challenger_id, challenged_id, challenger_coin, status, created_at, expires_at)
     VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6)`
  ).bind(id, pid, friend.id, coinId, now, now + DUEL_TTL_MS).run();

  return json({ ok: true, id, status: "pending" });
}

/* ─── accept — challenged stakes their coin, duel becomes ready ─── */
async function actionAccept(env, pid, body) {
  const duelId = typeof body.duelId === "string" ? body.duelId : "";
  const coinId = typeof body.coinId === "string" ? body.coinId : "";
  if (!duelId || !coinId) return bad("Missing duelId or coinId");

  const duel = await env.DB.prepare(
    `SELECT * FROM duels WHERE id = ?1`
  ).bind(duelId).first();
  if (!duel) return bad("Duel not found", 404);
  if (duel.challenged_id !== pid) return bad("Not yours to accept", 403);
  if (duel.status !== "pending") return bad("Duel is not pending", 409);
  if (duel.expires_at < Date.now()) return bad("Duel has expired", 410);

  // Validate the challenged player's coin
  const myCoin = await fetchOwnedCoin(env, pid, coinId);
  if (!myCoin) return bad("Coin not available to stake", 400);

  // Validate the challenger's coin still exists (could have been sold)
  const theirCoin = await env.DB.prepare(
    `SELECT metal_idx FROM coins WHERE id = ?1 AND player_id = ?2`
  ).bind(duel.challenger_coin, duel.challenger_id).first();
  if (!theirCoin) return bad("Challenger's coin no longer available — cancelling duel", 410);

  // Tier-gap check: stakes must be within 1 metal tier of each other
  if (Math.abs(theirCoin.metal_idx - myCoin.metal_idx) > MAX_TIER_GAP) {
    return bad(`Coin must be within ${MAX_TIER_GAP} tier of challenger's stake`, 400);
  }

  await env.DB.prepare(
    `UPDATE duels SET challenged_coin = ?1, status = 'ready' WHERE id = ?2`
  ).bind(coinId, duelId).run();

  return json({ ok: true, status: "ready" });
}

/* ─── decline — either side bows out before flip ─── */
async function actionDecline(env, pid, body) {
  const duelId = typeof body.duelId === "string" ? body.duelId : "";
  if (!duelId) return bad("Missing duelId");

  const duel = await env.DB.prepare(
    `SELECT challenger_id, challenged_id, status FROM duels WHERE id = ?1`
  ).bind(duelId).first();
  if (!duel) return bad("Duel not found", 404);
  if (duel.challenger_id !== pid && duel.challenged_id !== pid) return bad("Not your duel", 403);
  if (duel.status !== "pending" && duel.status !== "ready") return bad("Cannot decline this duel", 409);

  await env.DB.prepare(
    `UPDATE duels SET status = 'declined', resolved_at = ?1 WHERE id = ?2`
  ).bind(Date.now(), duelId).run();
  return json({ ok: true, status: "declined" });
}

/* ─── flip — resolve a ready duel, transfer coins to the winner ─── */
async function actionFlip(env, pid, body) {
  const duelId = typeof body.duelId === "string" ? body.duelId : "";
  if (!duelId) return bad("Missing duelId");

  const duel = await env.DB.prepare(
    `SELECT * FROM duels WHERE id = ?1`
  ).bind(duelId).first();
  if (!duel) return bad("Duel not found", 404);
  if (duel.challenger_id !== pid && duel.challenged_id !== pid) return bad("Not your duel", 403);
  if (duel.status !== "ready") return bad("Duel is not ready to flip", 409);

  // Re-validate both coins still exist and are unlocked. Stale coins (sold,
  // forged, etc.) cancel the duel rather than transfer something missing.
  const cCoin = await env.DB.prepare(
    `SELECT id, locked FROM coins WHERE id = ?1 AND player_id = ?2`
  ).bind(duel.challenger_coin, duel.challenger_id).first();
  const xCoin = await env.DB.prepare(
    `SELECT id, locked FROM coins WHERE id = ?1 AND player_id = ?2`
  ).bind(duel.challenged_coin, duel.challenged_id).first();
  if (!cCoin || !xCoin || cCoin.locked || xCoin.locked) {
    await env.DB.prepare(
      `UPDATE duels SET status = 'declined', resolved_at = ?1 WHERE id = ?2`
    ).bind(Date.now(), duelId).run();
    return bad("One of the staked coins is no longer eligible — duel cancelled", 410);
  }

  // Generate the flip seed. Combines the duel id, both player ids, a server
  // timestamp, and 16 bytes of fresh randomness. Hashed to a stable 64-char hex.
  const rand = new Uint8Array(16);
  crypto.getRandomValues(rand);
  const randHex = Array.from(rand, x => x.toString(16).padStart(2, "0")).join("");
  const seedInput = `${duel.id}:${duel.challenger_id}:${duel.challenged_id}:${Date.now()}:${randHex}`;
  const seedHex = await sha256Hex(seedInput);

  const { flips, winnerId } = runFlips(seedHex, duel.challenger_id, duel.challenged_id);
  const loserId = winnerId === duel.challenger_id ? duel.challenged_id : duel.challenger_id;
  const winnerCoinId = winnerId === duel.challenger_id ? duel.challenger_coin : duel.challenged_coin;
  const loserCoinId = winnerId === duel.challenger_id ? duel.challenged_coin : duel.challenger_coin;

  // Look up winner's username for client-side display
  const winnerUser = await env.DB.prepare(
    `SELECT username FROM players WHERE id = ?1`
  ).bind(winnerId).first();

  // Transfer the loser's staked coin to the winner. Atomic batch.
  const stmts = [
    env.DB.prepare(`UPDATE coins SET player_id = ?1 WHERE id = ?2`).bind(winnerId, loserCoinId),
    env.DB.prepare(
      `UPDATE duels SET status = 'resolved', flip_seed = ?1, flip_results = ?2,
             winner_id = ?3, resolved_at = ?4 WHERE id = ?5`
    ).bind(seedHex, JSON.stringify(flips), winnerId, Date.now(), duelId),
  ];
  await env.DB.batch(stmts);

  return json({
    ok: true,
    status: "resolved",
    flips,
    winnerId,
    winnerUsername: winnerUser?.username || null,
    seed: seedHex,
    // Echo coin ids for client-side animation routing
    winnerCoinId,
    loserCoinId,
  });
}
