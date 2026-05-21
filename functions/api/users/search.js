import { json, bad, getAuth } from "../_utils.js";

/* GET /api/users/search?q=xxx
   Returns up to 10 matching users (case-insensitive prefix). Auth required. */
export async function onRequestGet({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ users: [] });

  // Sanitize: allow letters/numbers/underscore only (matches username rules)
  if (!/^[A-Za-z0-9_]+$/.test(q)) return json({ users: [] });

  const rows = await env.DB.prepare(
    `SELECT players.id, players.username, COALESCE(player_state.xp, 0) AS xp,
            COALESCE(player_state.selected_title, 'Novice Digger') AS title
       FROM players
       LEFT JOIN player_state ON player_state.player_id = players.id
      WHERE players.username LIKE ?1 COLLATE NOCASE
        AND players.id != ?2
      ORDER BY players.last_seen_at DESC
      LIMIT 10`
  ).bind(q + "%", auth.player.id).all();

  return json({
    users: (rows.results || []).map(r => ({
      id: r.id,
      username: r.username,
      xp: r.xp,
      title: r.title,
    })),
  });
}
