import { useState, useEffect, useMemo, useCallback } from "react";

/* ════════════════════════════════════════════════════════════════════════
   CATFORGE  •  v0.1  •  cosy idle cat-mining game
   ────────────────────────────────────────────────────────────────────────
   Forked from MintForge. Most of the dig/forge/tavern/shrine systems were
   stripped — what's left is the bare framework:
     - auth gate (login / register via /api/auth/*)
     - top bar with marks + level + theme toggle + logout
     - hamburger drawer for navigation (Field / Vault / Profile / Social)
     - GameContext with just-enough state to feed IdleField

   Only the FIELD tab is wired up. Vault/Profile/Social show a "Coming
   soon" placeholder — those screens get rebuilt fresh for the cat game.
   ──────────────────────────────────────────────────────────────────────── */

import { DARK, LIGHT } from "./lib/theme.js";
import { lvl, lvlMin, lvlMax, mkCoin, coinValue } from "./lib/coin.js";
import { METALS, RARITIES, RARITY_COLOR } from "./lib/data.js";
import { apiClient, TOKEN_KEY } from "./lib/api.js";
import { useDebouncedEffect } from "./hooks/index.js";
import { GameContext } from "./lib/GameContext.js";

import AuthScreen   from "./components/AuthScreen.jsx";
import MarksCounter from "./components/MarksCounter.jsx";
import IdleField    from "./screens/IdleField.jsx";
import Profile      from "./screens/Profile.jsx";
import Vault        from "./screens/Vault.jsx";
import LevelEditor  from "./screens/LevelEditor.jsx";

export default function MintForge(){
  /* ── auth ───────────────────────────────────────────────────────── */
  const [token, setToken]           = useState(()=>{ try{return localStorage.getItem(TOKEN_KEY);}catch{return null;} });
  const [player, setPlayer]         = useState(null);
  const [authReady, setAuthReady]   = useState(false);
  const [loadErr, setLoadErr]       = useState(null);
  const [retryCounter, setRetryCounter] = useState(0);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const api = useMemo(()=>apiClient(token), [token]);

  /* ── theme ──────────────────────────────────────────────────────── */
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? DARK : LIGHT;
  useEffect(()=>{
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else        root.classList.remove("dark");
  }, [isDark]);

  /* ── game state (minimal) ───────────────────────────────────────── */
  const [coins, setCoins] = useState([]);
  const [xp,    setXP]    = useState(0);
  const [marks, setMarks] = useState(0);
  const [fieldState, setFieldState] = useState({});  // free-form: buildings, cats, timers
  // Ore counters kept as stub so IdleField doesn't crash. Real impl TBD.
  const [oreCounts, setOreCounts] = useState(()=>new Array(9).fill(0));
  const addOre = useCallback((metalIdx, n=1)=>{
    setOreCounts(prev => {
      const next = prev.slice();
      next[metalIdx] = Math.min(10, (next[metalIdx]||0) + n);
      return next;
    });
  }, []);

  /* commitCoin — drops a freshly-mined coin into the vault and persists it.
   * Called from IdleField when a station's cycle completes. Awards XP based
   * on coin value too so the level bar advances naturally with play. */
  const commitCoin = useCallback((coin, source = "field") => {
    setCoins(prev => [coin, ...prev]);
    const xpGain = Math.max(10, Math.round(coinValue(coin) * 0.5));
    setXP(p => p + xpGain);
    // Persist coin to vault. State (xp/marks/fieldState) gets persisted by
    // the debounced effect below, so we only need to add the coin row here.
    api.tx({
      add: [{
        id:       coin.id,
        seed:     coin.seed,
        metalIdx: coin.metalIdx,
        rarity:   coin.rarity || 0,
        shiny:    !!coin.shiny,
        source,
      }],
    }).catch(() => {});
  }, [api]);

  /* ── routing ────────────────────────────────────────────────────── */
  const [tab, setTab]         = useState("field");
  const [menuOpen, setMenuOpen] = useState(false);

  const level = lvl(xp);
  const xpIn    = xp - lvlMin(level);
  const xpRange = lvlMax(level) - lvlMin(level);
  const xpPct   = Math.min(100, Math.round(xpIn / xpRange * 100));

  /* ── auth bootstrap: on token change, fetch vault ─────────────── */
  useEffect(()=>{
    if (!token) { setAuthReady(true); return; }
    let cancel = false;
    api.getVault().then(v => {
      if (cancel) return;
      setPlayer({ username: v.username });
      setXP(v.xp || 0);
      setMarks(v.marks || 0);
      setFieldState(v.fieldState || {});
      // Rehydrate coins via the procedural renderer (only seed + metalIdx persisted)
      setCoins((v.coins || []).map(row => {
        const base = mkCoin(row.seed, 1, row.metalIdx);
        base.id     = row.id;
        base.shiny  = !!row.shiny;
        base.locked = !!row.locked;
        if (typeof row.rarity === "number") base.rarity = row.rarity;
        return base;
      }));
      setLoadedFromServer(true);
      setAuthReady(true);
    }).catch(err => {
      if (cancel) return;
      const msg = String(err.message || "");
      if (/401|unauthor/i.test(msg)) {
        try { localStorage.removeItem(TOKEN_KEY); } catch {}
        setToken(null); setAuthReady(true); setLoadErr(null);
      } else {
        setAuthReady(true);
        setLoadErr(msg || "Could not reach the server");
      }
    });
    return ()=>{ cancel = true; };
  }, [token, retryCounter]); // eslint-disable-line

  /* ── persist scalars (debounced) ──────────────────────────────── */
  useDebouncedEffect(()=>{
    if (!loadedFromServer) return;
    api.tx({ state: { xp, marks, fieldState } }).catch(()=>{});
  }, [xp, marks, fieldState, loadedFromServer], 800);

  /* ── auth handlers ────────────────────────────────────────────── */
  const handleAuthed = useCallback((tok, pl) => {
    setToken(tok); setPlayer(pl); setLoadedFromServer(false);
  }, []);
  const handleLogout = useCallback(()=>{
    api.logout();
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setToken(null); setPlayer(null);
    setCoins([]); setXP(0); setMarks(0); setFieldState({});
    setOreCounts(new Array(9).fill(0));
    setTab("field"); setMenuOpen(false);
    setLoadedFromServer(false); setAuthReady(true);
  }, [api]);

  /* ── style helpers (shared) ────────────────────────────────────── */
  const F  = { fontFamily: "Outfit,sans-serif" };
  const FR = { fontFamily: "'Fraunces',serif" };
  const VT = { fontFamily: "VT323,monospace" };

  /* ── auth screens ─────────────────────────────────────────────── */
  if (!authReady) {
    return (
      <div style={{...F, minHeight:"100vh", background:DARK.bg, color:DARK.muted, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, letterSpacing:2, textTransform:"uppercase"}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{...FR, fontSize:22, color:DARK.accent}}>🐾</span>
          Opening the field…
        </div>
      </div>
    );
  }
  if (token && loadErr && !loadedFromServer) {
    return (
      <div style={{...F, minHeight:"100vh", background:DARK.bg, color:DARK.text, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 20px"}}>
        <div style={{maxWidth:380, textAlign:"center"}}>
          <div style={{fontSize:48, opacity:.5, marginBottom:16}}>🐾</div>
          <div style={{...FR, fontWeight:800, fontSize:22, letterSpacing:-.4, marginBottom:10}}>The field won't open</div>
          <div style={{fontSize:13, color:DARK.textDim, lineHeight:1.55}}>The server returned an error while loading your account. Your account is safe.</div>
          <div style={{...VT, fontSize:13, color:DARK.danger, padding:"10px 14px", background:"rgba(210,74,40,.08)", border:`1px solid ${DARK.danger}33`, borderRadius:8, margin:"16px 0", wordBreak:"break-word"}}>{loadErr}</div>
          <div style={{display:"flex", flexDirection:"column", gap:9, marginTop:18}}>
            <button onClick={()=>{ setLoadErr(null); setRetryCounter(c=>c+1); }} style={{padding:"12px 0", borderRadius:11, border:`1px solid ${DARK.accent}`, background:`linear-gradient(135deg,${DARK.accentHi},${DARK.accent})`, cursor:"pointer", fontWeight:800, fontSize:13, color:DARK.accentInk, letterSpacing:2.5, textTransform:"uppercase", ...F}}>Retry</button>
            <button onClick={()=>{ try{localStorage.removeItem(TOKEN_KEY);}catch{} setToken(null); setLoadErr(null); }} style={{padding:"10px 0", borderRadius:11, border:`1px solid ${DARK.border}`, background:"transparent", cursor:"pointer", fontWeight:600, fontSize:11, color:DARK.muted, letterSpacing:2, textTransform:"uppercase", ...F}}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }
  if (!token) return <AuthScreen onAuthed={handleAuthed}/>;

  /* ── context bundle (small — easy to grow as features land) ───── */
  const g = {
    // theme + style
    t, isDark, setIsDark, F, FR, VT,
    // auth
    token, player, currentPlayer: player, api, handleLogout,
    // game state
    coins, setCoins,
    xp, setXP,
    marks, setMarks,
    fieldState, setFieldState,
    oreCounts, setOreCounts, addOre,
    commitCoin,
    // routing
    tab, setTab,
    menuOpen, setMenuOpen,
    // derived
    level, xpPct, xpIn, xpRange,
    // data tables (used by screens)
    METALS, RARITIES, RARITY_COLOR,
  };

  /* ── layout ────────────────────────────────────────────────────── */
  return (
    <GameContext.Provider value={g}>
    <div style={{...F, height:"100dvh", minHeight:"100vh", maxHeight:"100dvh", background:t.bg, color:t.text, position:"relative", overflow:"hidden", display:"flex", flexDirection:"column"}}>

      {/* ═══ TOP BAR ═══ */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:`1px solid ${t.border}`, background:t.nav, position:"relative", zIndex:80, flexShrink:0}}>
        {/* Hamburger + logo */}
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <button
            onClick={()=>setMenuOpen(o=>!o)}
            aria-label="Menu"
            style={{width:36, height:36, borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceHi, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:0}}>
            <span style={{width:14, height:2, background:t.text, borderRadius:1}}/>
            <span style={{width:14, height:2, background:t.text, borderRadius:1}}/>
            <span style={{width:14, height:2, background:t.text, borderRadius:1}}/>
          </button>
          <div style={{...FR, fontWeight:900, fontSize:17, letterSpacing:-.5, color:t.text}}>CATFORGE</div>
        </div>
        {/* Marks + level + theme + logout */}
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{display:"flex", alignItems:"center", gap:7, justifyContent:"flex-end", marginBottom:4}}>
              <MarksCounter marks={marks} t={t} F={F}/>
              <span style={{...F, fontSize:10, color:t.textDim, opacity:.55}}>·</span>
              <span style={{background:`linear-gradient(135deg,${t.accentHi},${t.accent})`, color:t.accentInk, fontWeight:900, fontSize:10, padding:"2px 8px", borderRadius:4, letterSpacing:1}}>LV {level}</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:6}}>
              <div style={{width:104, height:5, background:t.faint, borderRadius:3, overflow:"hidden", border:`1px solid ${t.border}`}}>
                <div style={{width:`${xpPct}%`, height:"100%", background:`linear-gradient(to right,${t.accentDim},${t.accent},${t.accentHi})`, transition:"width .6s"}}/>
              </div>
              <span style={{...F, fontSize:9, color:t.muted, fontVariantNumeric:"tabular-nums"}}>{xpIn}/{xpRange}</span>
            </div>
          </div>
          <button onClick={()=>setIsDark(d=>!d)} style={{width:34, height:34, borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceHi, cursor:"pointer", fontSize:14, color:t.text}}>
            {isDark ? "☀" : "☾"}
          </button>
          <button onClick={()=>{ if (confirm("Sign out?")) handleLogout(); }} title="Sign out" style={{width:34, height:34, borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceHi, cursor:"pointer", fontSize:13, color:t.muted}}>
            ⎋
          </button>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{position:"relative", flex:1, minHeight:0, overflow:"hidden"}}>
        {tab === "field"   && <IdleField/>}
        {tab === "vault"   && <Vault/>}
        {tab === "profile" && <Profile/>}
        {tab === "editor"  && <LevelEditor/>}
        {tab === "social"  && <Placeholder t={t} F={F} FR={FR} title="Social" body="Friends and visiting other villages. Coming soon."/>}
      </div>

      {/* ═══ HAMBURGER DRAWER ═══ */}
      {menuOpen && (
        <>
          {/* backdrop */}
          <div onClick={()=>setMenuOpen(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,.5)", backdropFilter:"blur(4px)", zIndex:99, animation:"fadein .15s ease"}}/>
          {/* drawer */}
          <div style={{position:"fixed", top:0, left:0, bottom:0, width:260, background:t.surface, borderRight:`1px solid ${t.border}`, zIndex:100, padding:"18px 14px", display:"flex", flexDirection:"column", gap:6, boxShadow:"4px 0 24px rgba(0,0,0,.4)", animation:"slideRight .2s ease"}}>
            <div style={{...FR, fontWeight:900, fontSize:20, color:t.text, padding:"6px 8px 16px", borderBottom:`1px solid ${t.border}`, marginBottom:8}}>
              {player?.username || "Player"}
            </div>
            <NavItem t={t} F={F} active={tab==="field"}   icon="🌾" label="Field"   onClick={()=>{setTab("field"); setMenuOpen(false);}}/>
            <NavItem t={t} F={F} active={tab==="vault"}   icon="🪙" label="Vault"   onClick={()=>{setTab("vault"); setMenuOpen(false);}}/>
            <NavItem t={t} F={F} active={tab==="profile"} icon="🐾" label="Profile" onClick={()=>{setTab("profile"); setMenuOpen(false);}}/>
            <NavItem t={t} F={F} active={tab==="social"}  icon="🤝" label="Social"  onClick={()=>{setTab("social"); setMenuOpen(false);}}/>
            <NavItem t={t} F={F} active={tab==="editor"}  icon="🛠" label="Level Editor" onClick={()=>{setTab("editor"); setMenuOpen(false);}}/>
          </div>
        </>
      )}
    </div>
    </GameContext.Provider>
  );
}

function NavItem({ t, F, active, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...F, display:"flex", alignItems:"center", gap:12, padding:"11px 12px",
      borderRadius:9, border:"none", cursor:"pointer", textAlign:"left",
      background: active ? `${t.accent}22` : "transparent",
      color: active ? t.accent : t.text,
      fontWeight: active ? 800 : 600, fontSize:14, letterSpacing:.3,
      transition:"background .12s",
    }}>
      <span style={{fontSize:18}}>{icon}</span>{label}
    </button>
  );
}

function Placeholder({ t, F, FR, title, body }) {
  return (
    <div style={{...F, height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 28px", textAlign:"center", color:t.text}}>
      <div style={{fontSize:48, opacity:.4, marginBottom:14}}>🐾</div>
      <div style={{...FR, fontWeight:800, fontSize:24, marginBottom:8}}>{title}</div>
      <div style={{fontSize:13, color:t.muted, maxWidth:280, lineHeight:1.55}}>{body}</div>
    </div>
  );
}
