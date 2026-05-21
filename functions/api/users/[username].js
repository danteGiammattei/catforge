import { json, bad, getAuth } from "../_utils.js";

/* GET /api/users/:username
   Returns the public profile of a player — bio, title, level, frame,
   pinned showcase coins (or top-by-rarity if no pins), and equipped tarots. */
export async function onRequestGet({ request, env, params }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);

  const username = String(params.username || "").trim();
  if (!username) return bad("Username required");

  // Base columns — always present
  const player = await env.DB.prepare(
    `SELECT players.id, players.username, players.created_at,
            COALESCE(player_state.xp, 0) AS xp,
            COALESCE(player_state.frame, 'stone') AS frame,
            COALESCE(player_state.bio, '') AS bio,
            COALESCE(player_state.selected_title, 'Novice Digger') AS title,
            player_state.pinned_ids
       FROM players
       LEFT JOIN player_state ON player_state.player_id = players.id
      WHERE players.username = ?1 COLLATE NOCASE`
  ).bind(username).first();

  if (!player) return bad("Player not found", 404);

  // v2+ extras (equipped tarots) — wrapped in try so missing migration doesn't 500
  let equippedTarots = [];
  try {
    const ext = await env.DB.prepare(
      `SELECT equipped_tarots FROM player_state WHERE player_id = ?1`
    ).bind(player.id).first();
    if (ext?.equipped_tarots) equippedTarots = JSON.parse(ext.equipped_tarots);
  } catch {}

  // Coin list — try with rarity column, fall back without if migration missing
  let allCoins = [];
  try {
    const r = await env.DB.prepare(
      `SELECT id, seed, metal_idx, shiny, rarity_idx FROM coins WHERE player_id = ?1`
    ).bind(player.id).all();
    allCoins = r.results || [];
  } catch {
    const r = await env.DB.prepare(
      `SELECT id, seed, metal_idx, shiny FROM coins WHERE player_id = ?1`
    ).bind(player.id).all();
    allCoins = r.results || [];
  }

  // Showcase: pinned_ids preserves order, otherwise top by metal then shiny
  let showcase;
  if (player.pinned_ids) {
    try {
      const ids = JSON.parse(player.pinned_ids);
      const byId = new Map(allCoins.map(c => [c.id, c]));
      showcase = ids.map(id => byId.get(id)).filter(Boolean).slice(0, 8);
    } catch { showcase = []; }
  }
  if (!showcase || !showcase.length) {
    showcase = [...allCoins]
      .sort((a, b) => b.metal_idx - a.metal_idx || (b.shiny ? 1 : 0) - (a.shiny ? 1 : 0))
      .slice(0, 6);
  }

  // Tier weights extended for 9 metals (Eldritch, Astral added)
  const tierWeights = [1, 3, 8, 20, 45, 120, 300, 800, 2000];
  const rarityScore = allCoins.reduce(
    (s, c) => s + (tierWeights[c.metal_idx] || 1) * (c.shiny ? 3 : 1), 0
  );

  // Friendship status
  const friendRow = await env.DB.prepare(
    `SELECT 1 FROM friends WHERE player_id = ?1 AND friend_id = ?2`
  ).bind(auth.player.id, player.id).first();

  return json({
    id: player.id,
    username: player.username,
    title: player.title,
    bio: player.bio,
    xp: player.xp,
    frame: player.frame,
    createdAt: player.created_at,
    isSelf: player.id === auth.player.id,
    isFriend: !!friendRow,
    coinCount: allCoins.length,
    shinyCount: allCoins.filter(c => c.shiny).length,
    rarityScore,
    equippedTarots,
    showcase: showcase.map(c => ({
      id: c.id,
      seed: c.seed >>> 0,
      metalIdx: c.metal_idx,
      shiny: !!c.shiny,
      rarityIdx: c.rarity_idx ?? null,
    })),
  });
}
