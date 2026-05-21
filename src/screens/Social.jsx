import { useGame } from "../lib/GameContext.js";
import { coinRarity, rune, lvl, mkCoin } from "../lib/coin.js";
import { bannerStyle, activeTarotPair } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import TarotCard from "../components/TarotCard.jsx";

/* ─── SOCIAL ──────────────────────────────────────────────────────────────
 * Friends + profile viewer + user search. The header shows your friends
 * count. Tap a friend to view their profile inline (banner, level, bio,
 * pinned coins, equipped tarots). Buttons to challenge a duel or remove.
 *
 * Search auto-debounces in the parent component (see useDebouncedEffect on
 * searchQ). Adding a found user takes them to the friends list and clears
 * the search. */
export default function Social() {
  const {
    searchQ, searchResults, searching, friendsList, followersList,
    viewingProfile, profileData, profileLoading, profileErr,
    setSearchQ, setProfileData, setProfileErr, setViewingProfile,
    setTab, setTavernView,
    handleAddFriend, handleRemoveFriend, promptCreateDuel,
    METALS, RARITIES, FRAMES, TAROT_BY_ID, MAX_EQUIPPED_TAROTS,
    bio, frame, equippedTarots, xp,
    t, isDark, F, VT, FR, mu, microLabel, sectionTitle, card,
  } = useGame();
  return (
    <div className="animate-fadein">
      {!viewingProfile?(
        <>
          <div className="flex items-baseline justify-between mb-3.5 px-0.5">
            <div style={sectionTitle}>Social</div>
            <div style={microLabel}>{friendsList.length} friend{friendsList.length===1?"":"s"}</div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3.5">
            <input
              value={searchQ}
              onChange={e=>setSearchQ(e.target.value.replace(/[^A-Za-z0-9_]/g,"").slice(0,20))}
              placeholder="Search by username…"
              className="w-full pl-[38px] pr-[14px] py-3 rounded-[11px] text-sm outline-none transition-[border-color] duration-150"
              style={{ ...F, border:`1px solid ${t.inputBorder}`, background:t.input, color:t.text }}
              onFocus={e=>e.target.style.borderColor=t.inputFocus}
              onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
            <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-base opacity-50 pointer-events-none">🔍</span>
            {searchQ&&(
              <button
                onClick={()=>setSearchQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-lg p-1"
                style={{ color:t.muted }}>×</button>
            )}
          </div>

          {/* Search results */}
          {searchQ.trim().length>=2&&(
            <div className="mb-[18px]">
              <div className="mb-2 px-0.5" style={microLabel}>{searching?"Searching…":`Results (${searchResults.length})`}</div>
              {searchResults.length===0&&!searching?(
                <div className="text-[13px] py-4 px-1 italic" style={mu}>No collectors found by that name.</div>
              ):(
                <div className="flex flex-col gap-[7px]">
                  {searchResults.map(u=>{
                    const ulvl=lvl(u.xp);
                    const isFriend=friendsList.some(f=>f.username.toLowerCase()===u.username.toLowerCase());
                    return (
                      <div
                        key={u.id}
                        onClick={()=>setViewingProfile(u.username)}
                        className="px-3.5 py-[11px] cursor-pointer flex items-center gap-3 transition-all duration-150"
                        style={card}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor=t.borderHi; e.currentTarget.style.transform="translateX(2px)"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.transform=""; }}>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-base"
                          style={{ background:t.surfaceHi, border:`1px solid ${t.borderHi}`, ...FR, color:t.accent }}>
                          {u.username.slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[15px] -tracking-[0.2px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ ...FR, color:t.text }}>
                            {u.username}
                            {isFriend&&<span className="text-[9px] font-bold ml-2 uppercase tracking-[1.5px]" style={{ ...F, color:t.success }}>· Friend</span>}
                          </div>
                          <div className="text-[11px] mt-px" style={{ ...mu, color:t.textDim }}>Lv.{ulvl} · {u.title}</div>
                        </div>
                        <span className="text-lg opacity-40" style={{ color:t.muted }}>›</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Friends list */}
          <div className="mb-2 px-0.5" style={microLabel}>Your Circle</div>
          {friendsList.length===0?(
            <div className="text-center py-10 px-5" style={card}>
              <div className="text-[42px] mb-3 opacity-40">♟</div>
              <div className="font-bold text-[16px] mb-1.5 -tracking-[0.3px]" style={FR}>No friends yet</div>
              <div className="text-xs max-w-[240px] mx-auto leading-[1.55]" style={mu}>Search above to find other collectors and add them to your circle.</div>
            </div>
          ):(
            <div className="flex flex-col gap-[7px]">
              {friendsList.map(f=>{
                const flvl=lvl(f.xp);
                return (
                  <div
                    key={f.id}
                    onClick={()=>setViewingProfile(f.username)}
                    className="px-3.5 py-[11px] cursor-pointer flex items-center gap-3 transition-all duration-150"
                    style={card}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=t.borderHi; e.currentTarget.style.transform="translateX(2px)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.transform=""; }}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-base text-white"
                      style={{ ...bannerStyle(f.frame||"stone"), border:`1px solid ${(FRAMES[f.frame]||FRAMES.stone).accent}66`, ...FR, textShadow:"0 1px 2px rgba(0,0,0,.5)" }}>
                      {f.username.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px] -tracking-[0.2px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ ...FR, color:t.text }}>{f.username}</div>
                      <div className="text-[11px] mt-px" style={{ ...mu, color:t.textDim }}>Lv.{flvl} · {f.title}</div>
                    </div>
                    <span className="text-lg opacity-40" style={{ color:t.muted }}>›</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Followers (people who friended you, but you haven't friended them back) ── */}
          {followersList.length>0&&(
            <div className="mt-6">
              <div className="flex items-baseline justify-between mb-2 px-0.5">
                <div style={microLabel}>Followers</div>
                <div style={{ ...microLabel, color:t.muted }}>{followersList.length}</div>
              </div>
              <div className="text-[11px] mb-2.5 px-0.5 italic" style={mu}>Tap to view their profile and friend back.</div>
              <div className="flex flex-col gap-[7px]">
                {followersList.map(f=>{
                  const flvl=lvl(f.xp);
                  return (
                    <div
                      key={f.id}
                      onClick={()=>setViewingProfile(f.username)}
                      className="px-3.5 py-2.5 cursor-pointer flex items-center gap-3 transition-all duration-150 opacity-85"
                      style={card}
                      onMouseEnter={e=>{ e.currentTarget.style.borderColor=t.borderHi; e.currentTarget.style.opacity="1"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.opacity=".85"; }}>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm text-white"
                        style={{ ...bannerStyle(f.frame||"stone"), border:`1px solid ${(FRAMES[f.frame]||FRAMES.stone).accent}55`, ...FR, textShadow:"0 1px 2px rgba(0,0,0,.5)" }}>
                        {f.username.slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] -tracking-[0.2px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ ...FR, color:t.textDim }}>{f.username}</div>
                        <div className="text-[10px] mt-px" style={mu}>Lv.{flvl} · {f.title}</div>
                      </div>
                      <span
                        className="text-[9px] font-bold px-[7px] py-[3px] rounded uppercase tracking-[1.5px]"
                        style={{ ...F, color:t.accent, background:`${t.accent}11`, border:`1px solid ${t.accent}33` }}>
                        + Friend
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ):(
        /* ── Profile detail view ── */
        <div className="animate-fadein">
          <button
            onClick={()=>{ setViewingProfile(null); setProfileData(null); setProfileErr(null); }}
            className="text-xs font-bold bg-transparent border-none px-0 py-1 mb-3.5 cursor-pointer uppercase tracking-[1.5px]"
            style={{ ...F, color:t.muted }}>← Back</button>
          {profileLoading&&<div className="text-center py-[60px] italic" style={mu}>Opening their vault…</div>}
          {profileErr&&(
            <div className="px-4 py-6 text-center" style={{ ...card, borderColor:t.danger }}>
              <div className="font-semibold" style={{ ...F, color:t.danger }}>⚠ {profileErr}</div>
            </div>
          )}
          {profileData&&(()=>{
            const pd=profileData;
            const plvl=lvl(pd.xp);
            const pfr=FRAMES[pd.frame]||FRAMES.stone;
            return (
              <>
                <div
                  className="h-[130px] rounded-2xl -mx-3.5 relative overflow-hidden"
                  style={{ ...bannerStyle(pd.frame||"stone"), border:`1px solid ${t.border}` }}>
                  <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 30% 60%,rgba(255,255,255,.06),transparent 65%)" }}/>
                  <div className="noise-overlay" style={{ opacity:.06 }}/>
                  <div className="absolute bottom-2 left-4 text-[9px] opacity-70" style={{ ...microLabel, color:pfr.accent }}>{pfr.lbl}</div>
                </div>
                <div className="mt-3.5 mb-3 px-1 flex items-end justify-between gap-2.5">
                  <div
                    className="w-[88px] h-[88px] rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ border:`3px solid ${pfr.accent}`, background:t.surface, boxShadow:`0 6px 18px rgba(0,0,0,.35),inset 0 0 0 2px ${t.surface}` }}>
                    {pd.showcase[0]?<CoinCanvas coin={(()=>{ const b=mkCoin(pd.showcase[0].seed,1,pd.showcase[0].metalIdx); b.shiny=pd.showcase[0].shiny; return b; })()} size={80}/>:<span className="text-[30px] opacity-30">⚒</span>}
                  </div>
                  {!pd.isSelf&&(
                    pd.isFriend?(
                      <div className="flex gap-1.5 items-center">
                        {/* Duel button hidden until duel system is reworked.
                            promptCreateDuel + Tavern duels view + duel API endpoints
                            still exist; just no entry point from the UI. */}
                        {/* <button
                          onClick={()=>{ promptCreateDuel(pd.username); setTab("tavern"); setTavernView("duels"); }}
                          title="Challenge to a coin duel"
                          className="px-3.5 py-[9px] rounded-[10px] cursor-pointer text-[11px] font-extrabold uppercase tracking-[1.5px]"
                          style={{ ...F, border:`1px solid ${t.danger}`, background:isDark?"linear-gradient(135deg,#2a0808,#481010)":"linear-gradient(135deg,#fbe8e8,#f0c4c4)", color:t.danger }}>
                          ⚔ Duel
                        </button> */}
                        <button
                          onClick={()=>handleRemoveFriend(pd.username)}
                          className="px-3.5 py-[9px] rounded-[10px] cursor-pointer text-[11px] font-bold uppercase tracking-[1.5px] transition-all duration-150"
                          style={{ ...F, border:`1px solid ${t.border}`, background:t.surfaceHi, color:t.muted }}>
                          ✓ Friends
                        </button>
                      </div>
                    ):(
                      <button
                        onClick={()=>handleAddFriend(pd.username)}
                        className="px-4 py-[9px] rounded-[10px] border-none cursor-pointer text-[11px] font-extrabold uppercase tracking-[1.5px]"
                        style={{ ...F, background:`linear-gradient(135deg,${t.accentHi},${t.accent})`, color:t.accentInk, boxShadow:`0 4px 10px ${t.accent}33` }}>
                        + Add Friend
                      </button>
                    )
                  )}
                </div>
                <div className="px-1 mb-3.5">
                  <div className="font-extrabold text-2xl -tracking-[0.5px] leading-[1.1]" style={{ ...FR, color:t.text }}>{pd.username}</div>
                  <div className="text-[18px] tracking-[3px] mt-[3px]" style={{ ...VT, color:t.muted }}>{rune(pd.username.toUpperCase().replace(/[^A-Z]/g,""))}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="font-black text-[11px] px-2.5 py-[3px] rounded-[5px] tracking-[1px]"
                      style={{ background:`linear-gradient(135deg,${t.accentHi},${t.accent})`, color:t.accentInk }}>
                      LV {plvl}
                    </span>
                    <span className="text-xs font-semibold" style={{ ...F, color:t.textDim }}>{pd.title}</span>
                  </div>
                  {pd.bio&&<div className="text-[13px] mt-2.5 leading-[1.55] max-w-[380px]" style={{ ...mu, color:t.textDim }}>{pd.bio}</div>}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-[18px] px-1">
                  {[["Coins",pd.coinCount],["Score",pd.rarityScore.toLocaleString()],["✦ Shiny",pd.shinyCount]].map(([k,v])=>(
                    <div key={k} className="px-2 py-2.5 text-center" style={card}>
                      <div className="font-extrabold text-[20px] -tracking-[0.5px] tabular-nums leading-none" style={{ ...FR, color:t.text }}>{v}</div>
                      <div className="text-[9px] mt-1" style={microLabel}>{k}</div>
                    </div>
                  ))}
                </div>
                {pd.showcase.length>0&&(
                  <div className="px-0.5">
                    <div className="mb-[9px]" style={microLabel}>Display Cabinet</div>
                    <div className="grid grid-cols-3 gap-[9px]">
                      {pd.showcase.map((cs,i)=>{
                        const m=METALS[cs.metalIdx];
                        const dispCoin=(()=>{ const b=mkCoin(cs.seed,1,cs.metalIdx); b.id=cs.id; b.shiny=cs.shiny; return b; })();
                        return (
                          <div
                            key={i}
                            className={`relative text-center${cs.shiny?" shiny-card":""}`}
                            style={{
                              background:isDark?`linear-gradient(160deg,${m.dark}40,${t.surface})`:t.surface,
                              border:`1px solid ${m.eng}30`,
                              borderTop:`2px solid ${pfr.accent}`,
                              borderRadius:13,
                              padding:"13px 8px 10px",
                            }}>
                            {cs.shiny&&<div className="shiny-aura"/>}
                            {cs.metalIdx>=7&&<div className={`ambient-particles ${cs.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
                            {cs.shiny&&<div className="absolute top-1.5 right-[7px] text-[11px]" style={{ color:"#ffe060", textShadow:"0 0 6px #ffe06088" }}>✦</div>}
                            <div className="flex justify-center mb-[7px]"><CoinCanvas coin={dispCoin} size={64}/></div>
                            <div className="text-[14px] tracking-[2px] leading-[1.1]" style={{ ...VT, color:m.hl }}>{dispCoin.runes}</div>
                            <div className="text-[8px] mt-[3px] opacity-85 font-bold" style={{ ...microLabel, color:RARITIES[coinRarity(dispCoin)].color }}>{RARITIES[coinRarity(dispCoin)].name}{cs.shiny?" ✦":""}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Equipped tarots — visible on friends' profiles too */}
                {Array.isArray(pd.equippedTarots)&&pd.equippedTarots.length>0&&(
                  <div className="px-0.5 mt-[18px]">
                    <div className="mb-[9px]" style={microLabel}>Tarot Spread · {pd.equippedTarots.length}/{MAX_EQUIPPED_TAROTS}</div>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 px-0.5 justify-center">
                      {pd.equippedTarots.map(cid=>{
                        const tCard=TAROT_BY_ID[cid];
                        if(!tCard)return null;
                        return <div key={cid} className="flex-shrink-0"><TarotCard card={tCard} owned equipped size="sm" t={t}/></div>;
                      })}
                    </div>
                    {/* Pair badge — shows when the other player has a
                        synergy pair active. Lets you scout opponents'
                        builds before duelling. */}
                    {(() => {
                      const pair = activeTarotPair(pd.equippedTarots);
                      if (!pair) return null;
                      return (
                        <div className="px-3 py-2 mt-2 rounded-md text-center"
                          style={{
                            background:"linear-gradient(135deg, rgba(122,76,255,.22), rgba(0,229,255,.18))",
                            border:"1px solid rgba(0,229,255,.5)",
                            boxShadow:"0 0 12px rgba(122,76,255,.35)",
                          }}>
                          <div className="text-[9px] font-bold uppercase tracking-[2px]" style={{ ...F, color:"#00e5ff" }}>Pair Active</div>
                          <div className="text-[13px] font-extrabold mt-0.5" style={{ ...F, color:"#e8e0ff" }}>{pair.label}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
