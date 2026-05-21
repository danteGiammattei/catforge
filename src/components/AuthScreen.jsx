import { useState } from "react";
import { DARK } from "../lib/theme.js";
import { apiClient, TOKEN_KEY } from "../lib/api.js";
import { rune } from "../lib/coin.js";

/* ─── AUTH SCREEN ─────────────────────────────────────────────────────────
 * Login / register pre-app screen. Always uses the DARK theme regardless
 * of the user's later preference — auth feels more inviting in dark.
 *
 * Username: 3–20 chars, letters/digits/underscore.
 * PIN: 4–6 digits, numeric input mode for mobile keyboards.
 * Token persists to localStorage on success and is handed to onAuthed. */
export default function AuthScreen({ onAuthed }) {
  const [mode,     setMode]     = useState("login");
  const [username, setUsername] = useState("");
  const [pin,      setPin]      = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState(null);
  const t = DARK;
  const F  = { fontFamily: "Outfit,sans-serif" };
  const VT = { fontFamily: "VT323,monospace" };
  const FR = { fontFamily: "'Fraunces',serif" };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setErr(null); setBusy(true);
    try {
      const api = apiClient(null);
      const res = await (mode === "login" ? api.login(username, pin) : api.register(username, pin));
      localStorage.setItem(TOKEN_KEY, res.token);
      onAuthed(res.token, res.player);
    } catch (ex) {
      setErr(ex.message); setBusy(false);
    }
  };

  const canSubmit = username.length >= 3 && /^\d{4,6}$/.test(pin) && !busy;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden"
      style={{ ...F, background: t.bg, color: t.text }}>
      <div className="noise-overlay fixed z-[1]" style={{ opacity: .04 }}/>
      <div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(212,160,23,.12),transparent 65%)", filter: "blur(12px)" }}/>
      <div className="relative z-[2] w-full max-w-[360px] text-center">
        {/* Crest */}
        <div
          className="w-[72px] h-[72px] mx-auto mb-[18px] rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg,${t.surfaceHi},${t.surface})`,
            border: `1px solid ${t.borderHi}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.05),0 8px 24px rgba(0,0,0,.4)",
          }}>
          <span className="text-[42px] font-black -tracking-[2px]" style={{ ...FR, color: t.accent }}>⚒</span>
        </div>
        <div className="font-black text-[34px] -tracking-[1px] leading-none" style={{ ...FR, color: t.text }}>MINTFORGE</div>
        <div className="text-lg tracking-[5px] mt-1" style={{ ...VT, color: t.muted }}>{rune("MINTFORGE")}</div>
        <div className="italic text-sm mt-3.5 mb-7 tracking-[0.3px]" style={{ ...FR, color: t.textDim }}>Your vault awaits.</div>

        {/* Mode toggle */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-[18px]"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          {[["login", "Sign In"], ["register", "Create Vault"]].map(([id, lbl]) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => { setMode(id); setErr(null); }}
                className="flex-1 py-2.5 rounded-[9px] border-none cursor-pointer text-xs font-extrabold uppercase tracking-[2px] transition-all duration-200"
                style={{
                  ...F,
                  background: active ? `linear-gradient(135deg,${t.accentHi},${t.accent})` : "transparent",
                  color: active ? t.accentInk : t.muted,
                }}>
                {lbl}
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 text-left">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[2.5px] mb-1.5" style={{ ...F, color: t.muted }}>Username</div>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value.slice(0, 20))}
              autoComplete="username"
              spellCheck={false}
              placeholder="3–20 letters, numbers, _"
              className="w-full px-3.5 py-3 rounded-[10px] text-[15px] outline-none transition-[border-color] duration-150"
              style={{ ...F, border: `1px solid ${t.inputBorder}`, background: t.input, color: t.text }}
              onFocus={e => e.target.style.borderColor = t.inputFocus}
              onBlur={e => e.target.style.borderColor = t.inputBorder}/>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[2.5px] mb-1.5" style={{ ...F, color: t.muted }}>PIN</div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="4–6 digits"
              className="w-full px-3.5 py-3 rounded-[10px] text-[15px] outline-none tracking-[6px] tabular-nums transition-[border-color] duration-150"
              style={{ ...F, border: `1px solid ${t.inputBorder}`, background: t.input, color: t.text }}
              onFocus={e => e.target.style.borderColor = t.inputFocus}
              onBlur={e => e.target.style.borderColor = t.inputBorder}/>
          </div>
          {err && (
            <div
              className="text-xs px-3 py-2 rounded-lg text-center"
              style={{ ...F, color: t.danger, background: "#1a0808", border: `1px solid ${t.danger}55` }}>
              ⚠ {err}
            </div>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 py-3.5 rounded-[11px] text-sm font-extrabold uppercase tracking-[3px] transition-all duration-150"
            style={{
              ...F,
              border: `1px solid ${canSubmit ? t.accent : t.border}`,
              cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? `linear-gradient(135deg,${t.accentHi},${t.accent})` : t.surfaceHi,
              color: canSubmit ? t.accentInk : t.muted,
              boxShadow: canSubmit ? `0 6px 18px ${t.accent}33` : "none",
            }}>
            {busy ? "…" : mode === "login" ? "⚒ Enter" : "⚒ Forge Vault"}
          </button>
          <div className="italic text-[11px] text-center mt-2 leading-[1.6]" style={{ ...FR, color: t.muted }}>
            {mode === "login" ? "Welcome back, collector." : "A new vault. A new reign."}
          </div>
        </form>
      </div>
    </div>
  );
}
