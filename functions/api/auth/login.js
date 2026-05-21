import { json, bad, hashPin, randomHex, safeEq, validateUsername, validatePin } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return bad("Invalid JSON"); }

  const username = validateUsername(body?.username);
  if (!username || !validatePin(body?.pin)) return bad("Invalid credentials", 401);

  const row = await env.DB.prepare(
    `SELECT id, username, password_hash, password_salt FROM players WHERE username = ?1 COLLATE NOCASE`
  ).bind(username).first();

  if (!row) return bad("Invalid credentials", 401);

  const attempt = await hashPin(body.pin, row.password_salt);
  if (!safeEq(attempt, row.password_hash)) return bad("Invalid credentials", 401);

  const token = randomHex(24);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO sessions (token, player_id, created_at) VALUES (?1, ?2, ?3)`).bind(token, row.id, now),
    env.DB.prepare(`UPDATE players SET last_seen_at = ?1 WHERE id = ?2`).bind(now, row.id),
  ]);

  return json({ token, player: { id: row.id, username: row.username } });
}
