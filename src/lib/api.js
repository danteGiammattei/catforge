/* ════════════════════════════════════════════════════════════════════════
 *  API CLIENT
 *  ────────────────────────────────────────────────────────────────────────
 *  Thin wrapper around fetch for the Cloudflare Pages Functions backend.
 *  All endpoints are same-origin so API_BASE is empty. Token (if any) is
 *  passed as a Bearer header.
 * ════════════════════════════════════════════════════════════════════════ */

export const API_BASE  = ""; // same-origin
export const TOKEN_KEY = "mintforge:token";

export function apiClient(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const call = async (path, method = "GET", body) => {
    const r   = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text();
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch {}
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  };

  return {
    register:     (username, pin) => call("/api/auth/register", "POST", { username, pin }),
    login:        (username, pin) => call("/api/auth/login",    "POST", { username, pin }),
    logout:       ()              => call("/api/auth/logout",   "POST").catch(() => {}),
    getVault:     ()              => call("/api/vault",         "GET"),
    tx:           (payload)       => call("/api/vault",         "POST", payload),
    searchUsers:  (q)             => call(`/api/users/search?q=${encodeURIComponent(q)}`, "GET"),
    getUser:      (username)      => call(`/api/users/${encodeURIComponent(username)}`,  "GET"),
    listFriends:  ()              => call("/api/friends",       "GET"),
    addFriend:    (username)      => call("/api/friends",       "POST",   { username }),
    removeFriend: (username)      => call("/api/friends",       "DELETE", { username }),
    // Duels — friend coin battles
    listDuels:    ()                                => call("/api/duels", "GET"),
    createDuel:   (friendUsername, coinId)          => call("/api/duels", "POST", { action:"create",  friendUsername, coinId }),
    acceptDuel:   (duelId, coinId)                  => call("/api/duels", "POST", { action:"accept",  duelId, coinId }),
    declineDuel:  (duelId)                          => call("/api/duels", "POST", { action:"decline", duelId }),
    flipDuel:     (duelId)                          => call("/api/duels", "POST", { action:"flip",    duelId }),
  };
}
