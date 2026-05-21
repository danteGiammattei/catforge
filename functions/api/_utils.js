/* MintForge · shared API utilities */

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });

export const bad = (msg, status = 400) => json({ error: msg }, status);

/* PBKDF2-SHA-256 hashing — 10k iterations keeps the Worker fast while
   still being meaningfully stronger than plain SHA-256 for 4-digit PINs. */
export async function hashPin(pin, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 10000, hash: "SHA-256" },
    key, 256
  );
  const bytes = new Uint8Array(bits);
  return btoa(String.fromCharCode(...bytes));
}

export function randomHex(bytes = 24) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

/* Timing-safe string compare */
export function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Validates + normalizes a username.  Returns null on bad input. */
export function validateUsername(u) {
  if (typeof u !== "string") return null;
  const v = u.trim();
  if (v.length < 3 || v.length > 20) return null;
  if (!/^[A-Za-z0-9_]+$/.test(v)) return null;
  return v;
}

/* PIN must be 4–6 digits */
export function validatePin(p) {
  return typeof p === "string" && /^\d{4,6}$/.test(p);
}

/* Resolve the current player from the Authorization: Bearer <token> header.
   Returns { player, token } or null. */
export async function getAuth(request, env) {
  const h = request.headers.get("Authorization") || "";
  const m = /^Bearer\s+([A-Za-z0-9]+)$/.exec(h);
  if (!m) return null;
  const token = m[1];
  const row = await env.DB.prepare(
    `SELECT players.id AS player_id, players.username
       FROM sessions JOIN players ON players.id = sessions.player_id
      WHERE sessions.token = ?1`
  ).bind(token).first();
  if (!row) return null;
  // refresh last_seen lazily
  env.DB.prepare("UPDATE players SET last_seen_at = ?1 WHERE id = ?2")
    .bind(Date.now(), row.player_id).run().catch(() => {});
  return { player: { id: row.player_id, username: row.username }, token };
}
