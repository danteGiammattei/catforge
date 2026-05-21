import { useState } from "react";
import { useGame } from "../lib/GameContext.js";
import { coinRarity, lvl, lvlMin, lvlMax } from "../lib/coin.js";
import CoinCanvas from "../components/CoinCanvas.jsx";

/* ─── PROFILE ─────────────────────────────────────────────────────────────
 * Player stats: username, level, total coins, shiny count, top coins.
 * Editable bio. Sign out button. Kept simple — no banner/title/frame
 * cosmetics yet, those come later when the catforge cosmetic system
 * is designed. */
export default function Profile() {
  const {
    player, coins, xp, marks,
    fieldState, setFieldState,
    handleLogout, t, isDark, F, FR,
  } = useGame();

  const level = lvl(xp);
  const xpIn    = xp - lvlMin(level);
  const xpRange = lvlMax(level) - lvlMin(level);

  // Bio lives in fieldState.bio so it persists via the standard save flow.
  const bio = fieldState?.bio ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio);

  const shinyCount = coins.filter(c => c.shiny).length;
  const topCoins   = [...coins]
    .sort((a, b) => coinRarity(b) - coinRarity(a) || b.metalIdx - a.metalIdx)
    .slice(0, 6);

  const saveBio = () => {
    setFieldState(prev => ({ ...prev, bio: draft.slice(0, 200) }));
    setEditing(false);
  };

  return (
    <div style={{
      ...F, padding: "20px 16px 80px", maxWidth: 480, margin: "0 auto",
      height: "100%", overflowY: "auto",
    }}>

      {/* ── HEADER CARD ── */}
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 16, padding: 20, marginBottom: 16,
        boxShadow: isDark ? "0 6px 18px rgba(0,0,0,.25)" : "0 4px 14px rgba(74,40,8,.08)",
      }}>
        {/* Avatar disc — large cat emoji placeholder */}
        <div style={{
          width: 84, height: 84, borderRadius: "50%",
          background: `linear-gradient(135deg, ${t.surfaceHi}, ${t.surface})`,
          border: `2px solid ${t.borderHi}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 44, margin: "0 auto 12px",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,.1)",
        }}>🐾</div>

        <div style={{
          ...FR, fontWeight: 900, fontSize: 24, textAlign: "center",
          color: t.text, letterSpacing: -.4,
        }}>{player?.username || "Player"}</div>
        <div style={{
          fontSize: 11, textAlign: "center", color: t.muted,
          marginTop: 4, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600,
        }}>Level {level} · {coins.length} coins</div>

        {/* XP bar */}
        <div style={{ marginTop: 14, padding: "0 8px" }}>
          <div style={{
            height: 8, background: t.faint, borderRadius: 4,
            border: `1px solid ${t.border}`, overflow: "hidden",
          }}>
            <div style={{
              width: `${Math.round(xpIn / xpRange * 100)}%`, height: "100%",
              background: `linear-gradient(to right, ${t.accentDim}, ${t.accent}, ${t.accentHi})`,
              transition: "width .6s",
            }}/>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 5, fontSize: 10, color: t.muted, fontVariantNumeric: "tabular-nums",
          }}>
            <span>{xpIn} XP</span><span>{xpRange - xpIn} to Lv {level + 1}</span>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16,
      }}>
        <StatCell t={t} F={F} FR={FR} value={coins.length} label="Coins"/>
        <StatCell t={t} F={F} FR={FR} value={shinyCount} label="Shinies"/>
        <StatCell t={t} F={F} FR={FR} value={marks.toLocaleString()} label="Marks"/>
      </div>

      {/* ── BIO ── */}
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 14, padding: 16, marginBottom: 16,
      }}>
        <div style={{
          ...FR, fontWeight: 800, fontSize: 13, color: t.text,
          letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10,
        }}>About</div>
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={200}
              placeholder="A line or two about yourself…"
              style={{
                ...F, width: "100%", minHeight: 60, padding: 10,
                background: t.input, border: `1px solid ${t.inputBorder}`,
                borderRadius: 8, color: t.text, fontSize: 13, resize: "vertical",
                outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={saveBio} style={btnPrimary(t, F)}>Save</button>
              <button onClick={() => { setDraft(bio); setEditing(false); }} style={btnGhost(t, F)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontSize: 13, color: bio ? t.text : t.muted, fontStyle: bio ? "normal" : "italic",
              lineHeight: 1.55, minHeight: 20,
            }}>{bio || "No bio yet."}</div>
            <button onClick={() => { setDraft(bio); setEditing(true); }} style={{
              ...btnGhost(t, F), marginTop: 10, padding: "6px 14px", fontSize: 11,
            }}>Edit</button>
          </>
        )}
      </div>

      {/* ── TOP COINS ── */}
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 14, padding: 16, marginBottom: 16,
      }}>
        <div style={{
          ...FR, fontWeight: 800, fontSize: 13, color: t.text,
          letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12,
        }}>Best Finds</div>
        {topCoins.length === 0 ? (
          <div style={{
            fontSize: 13, color: t.muted, fontStyle: "italic", textAlign: "center", padding: "10px 0",
          }}>Mine some coins to fill this out.</div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8,
          }}>
            {topCoins.map(c => (
              <div key={c.id} style={{
                aspectRatio: "1", borderRadius: 9,
                background: t.surfaceHi, border: `1px solid ${t.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CoinCanvas coin={c} size={44}/>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SIGN OUT ── */}
      <button onClick={() => { if (confirm("Sign out? Your village stays saved.")) handleLogout(); }} style={{
        ...F, width: "100%", padding: "12px 0",
        background: "transparent", border: `1px solid ${t.danger}55`,
        borderRadius: 11, color: t.danger,
        fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase",
        cursor: "pointer", marginBottom: 20,
      }}>Sign out</button>
    </div>
  );
}

function StatCell({ t, F, FR, value, label }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: "14px 8px", textAlign: "center",
    }}>
      <div style={{
        ...FR, fontWeight: 900, fontSize: 22, color: t.text,
        letterSpacing: -.5, lineHeight: 1, fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      <div style={{
        ...F, fontSize: 10, color: t.muted, marginTop: 4,
        letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600,
      }}>{label}</div>
    </div>
  );
}

const btnPrimary = (t, F) => ({
  ...F, padding: "8px 16px", borderRadius: 8,
  border: `1px solid ${t.accent}`,
  background: `linear-gradient(135deg, ${t.accentHi}, ${t.accent})`,
  color: t.accentInk, fontWeight: 800, fontSize: 11,
  letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer",
});
const btnGhost = (t, F) => ({
  ...F, padding: "8px 14px", borderRadius: 8,
  border: `1px solid ${t.border}`, background: "transparent",
  color: t.muted, fontWeight: 700, fontSize: 11,
  letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer",
});
