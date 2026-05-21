import { json, bad, getAuth } from "../_utils.js";

/* GET /api/friends
   Returns:
   - friends: people YOU have friended (outbound)
   - followers: people who have friended YOU but you haven't reciprocated (inbound) */
export async function onRequestGet({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const pid = auth.player.id;

  const friendsQuery = env.DB.prepare(
    `SELECT players.id, players.username,
            COALESCE(player_state.xp, 0) AS xp,
            COALESCE(player_state.selected_title, 'Novice Digger') AS title,
            COALESCE(player_state.frame, 'stone') AS frame,
            friends.created_at
       FROM friends
       JOIN players ON players.id = friends.friend_id
       LEFT JOIN player_state ON player_state.player_id = players.id
      WHERE friends.player_id = ?1
      ORDER BY friends.created_at DESC`
  ).bind(pid);

  // Followers: anyone who has friended us, where we haven't reciprocated.
  // SQL: friend_id = me, AND no row exists with reverse direction.
  const followersQuery = env.DB.prepare(
    `SELECT players.id, players.username,
            COALESCE(player_state.xp, 0) AS xp,
            COALESCE(player_state.selected_title, 'Novice Digger') AS title,
            COALESCE(player_state.frame, 'stone') AS frame,
            friends.created_at
       FROM friends
       JOIN players ON players.id = friends.player_id
       LEFT JOIN player_state ON player_state.player_id = players.id
      WHERE friends.friend_id = ?1
        AND NOT EXISTS (
          SELECT 1 FROM friends f2
          WHERE f2.player_id = ?1 AND f2.friend_id = friends.player_id
        )
      ORDER BY friends.created_at DESC`
  ).bind(pid);

  const [friendsRes, followersRes] = await Promise.all([friendsQuery.all(), followersQuery.all()]);

  return json({
    friends: (friendsRes.results || []).map(r => ({
      id: r.id, username: r.username, xp: r.xp, title: r.title, frame: r.frame, addedAt: r.created_at,
    })),
    followers: (followersRes.results || []).map(r => ({
      id: r.id, username: r.username, xp: r.xp, title: r.title, frame: r.frame, addedAt: r.created_at,
    })),
  });
}

/* POST /api/friends   { username }   add a friend (one-directional follow). */
export async function onRequestPost({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);

  let body; try { body = await request.json(); } catch { return bad("Invalid JSON"); }
  const username = String(body?.username || "").trim();
  if (!username) return bad("Username required");

  const target = await env.DB.prepare(
    `SELECT id FROM players WHERE username = ?1 COLLATE NOCASE`
  ).bind(username).first();
  if (!target) return bad("Player not found", 404);
  if (target.id === auth.player.id) return bad("Cannot friend yourself");

  await env.DB.prepare(
    `INSERT OR IGNORE INTO friends (player_id, friend_id, created_at) VALUES (?1, ?2, ?3)`
  ).bind(auth.player.id, target.id, Date.now()).run();

  return json({ ok: true });
}

/* DELETE /api/friends   { username }   remove. */
export async function onRequestDelete({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);

  let body; try { body = await request.json(); } catch { return bad("Invalid JSON"); }
  const username = String(body?.username || "").trim();
  if (!username) return bad("Username required");

  const target = await env.DB.prepare(
    `SELECT id FROM players WHERE username = ?1 COLLATE NOCASE`
  ).bind(username).first();
  if (!target) return bad("Player not found", 404);

  await env.DB.prepare(
    `DELETE FROM friends WHERE player_id = ?1 AND friend_id = ?2`
  ).bind(auth.player.id, target.id).run();

  return json({ ok: true });
}
