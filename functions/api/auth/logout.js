import { json, getAuth } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return json({ ok: true });
  await env.DB.prepare(`DELETE FROM sessions WHERE token = ?1`).bind(auth.token).run();
  return json({ ok: true });
}
