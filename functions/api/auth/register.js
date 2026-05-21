import { json, bad, hashPin, randomHex, validateUsername, validatePin } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return bad("Invalid JSON"); }

  const username = validateUsername(body?.username);
  if (!username) return bad("Username must be 3–20 letters, numbers, or underscores");
  if (!validatePin(body?.pin)) return bad("PIN must be 4–6 digits");

  const now  = Date.now();
  const salt = randomHex(16);
  const hash = await hashPin(body.pin, salt);

  try {
    const ins = await env.DB.prepare(
      `INSERT INTO players (username, password_hash, password_salt, created_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?4, ?4)`
    ).bind(username, hash, salt, now).run();
    const playerId = ins.meta.last_row_id;

    // Catforge-shape player_state: xp + field_state JSON + cosmetics JSON
    await env.DB.prepare(
      `INSERT INTO player_state (player_id, xp, field_state, cosmetics, updated_at)
       VALUES (?1, 0, '{}', '{}', ?2)`
    ).bind(playerId, now).run();

    const token = randomHex(24);
    await env.DB.prepare(
      `INSERT INTO sessions (token, player_id, created_at) VALUES (?1, ?2, ?3)`
    ).bind(token, playerId, now).run();

    return json({ token, player: { id: playerId, username } });
  } catch (e) {
    if (/UNIQUE constraint/i.test(e.message || "")) return bad("Username already taken", 409);
    return bad("Could not create account: " + (e.message || "unknown"), 500);
  }
}
