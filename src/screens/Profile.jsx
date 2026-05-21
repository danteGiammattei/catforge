import { useGame } from "../lib/GameContext.js";
import { rarityScore, unlockedTitles, rune } from "../lib/coin.js";
import { bannerStyle, activeTarotPair } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import TarotCard from "../components/TarotCard.jsx";

/* ─── PROFILE ─────────────────────────────────────────────────────────────
 * The player's home page. Banner + avatar + stats grid + display cabinet
 * (pinned coins) + tarot spread + title selector. Banner choice and title
 * choice persist via setFrame/setSelectedTitle.
 *
 * Avatar shows the highest-scoring showcase coin. Display cabinet has
 * `maxPins` slots (6 base + The Lovers tarot adds +1). Empty slots are
 * tappable to open a coin picker.
 *
 * BUG FIX during migration: `username` was used but not destructured from
 * useGame(). Now properly declared. */
export default function Profile() {
  const {
    coins, frame, filter, pinnedIds, showcaseCoins, level,
    bio, selectedTitle, maxPins, fr, username,
    ownedFrames, ownedTitles, ownedTarots, equippedTarots,
    editingProfile,
    setBio, setFrame, setSelectedTitle, setPinnedIds, setSelectedCoin,
    setEditingProfile, setPickerSlot, setTab, setTavernView,
    togglePin, toggleTarot,
    METALS, FRAMES, MAX_EQUIPPED_TAROTS, PREMIUM_TITLE_BY_ID, RARITY_COLOR,
    TAROT_BY_ID, TITLE_LEVELS,
    t, isDark, F, VT, FR, mu, microLabel, sectionTitle, card,
  } = useGame();
  return (
    <div className="animate-fadein">
      {/* Banner — bleeds to the page edges */}
      <div
        className="h-[130px] rounded-b-[20px] -mx-3.5 -mt-[18px] relative overflow-hidden"
        style={{ ...bannerStyle(frame), border:`1px solid ${t.border}`, borderTop:"none" }}>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 30% 60%,rgba(255,255,255,.06),transparent 65%)" }}/>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 70% 30%,rgba(212,160,23,.08),transparent 60%)" }}/>
        {/* Image banners get a subtle darkening overlay for text legibility */}
        {FRAMES[frame]?.premium&&<div className="absolute inset-0" style={{ background:"linear-gradient(to bottom,rgba(0,0,0,.15) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 70%,rgba(0,0,0,.45) 100%)" }}/>}
        <div className="noise-overlay" style={{ opacity:.06 }}/>
        <div className="absolute top-3 right-3.5">
          <select
            value={frame}
            onChange={e=>setFrame(e.target.value)}
            className="px-2.5 py-1 rounded-md text-[11px] cursor-pointer font-semibold tracking-[0.5px]"
            style={{ ...F, background:"rgba(0,0,0,.6)", border:`1px solid rgba(255,255,255,.16)`, color:"#c8b89a" }}>
            {Object.entries(FRAMES).filter(([k,f])=>!f.premium||ownedFrames.includes(k)).map(([k,f])=>(
              <option key={k} value={k} disabled={level<f.minLvl}>{f.lbl}{level<f.minLvl?` · Lv${f.minLvl}`:""}</option>
            ))}
          </select>
        </div>
        <div className="absolute bottom-2 left-4 text-[9px] opacity-85" style={{ ...microLabel, color:fr.accent, textShadow:"0 1px 3px rgba(0,0,0,.7)" }}>{fr.lbl}</div>
      </div>

      {/* Avatar sits fully below banner now (no overlap) */}
      <div className="mt-3.5 mb-3 px-1 flex justify-start">
        <div
          className="w-[88px] h-[88px] rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{
            border:`3px solid ${fr.accent}`,
            background:t.surface,
            boxShadow:`0 6px 18px rgba(0,0,0,.35),inset 0 0 0 2px ${t.surface}`,
          }}>
          {showcaseCoins[0]?<CoinCanvas coin={showcaseCoins[0]} size={80}/>:<span className="text-[30px] opacity-30">⚒</span>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3.5 px-1">
        {[["Coins",coins.length],["Score",rarityScore(coins).toLocaleString()],["✦ Shiny",coins.filter(c=>c.shiny).length]].map(([k,v])=>(
          <div key={k} className="px-2 py-2.5 text-center" style={card}>
            <div className="font-extrabold text-[20px] -tracking-[0.5px] tabular-nums leading-none" style={{ ...FR, color:t.text }}>{v}</div>
            <div className="text-[9px] mt-1" style={microLabel}>{k}</div>
          </div>
        ))}
      </div>

      {!editingProfile?(
        <>
          <div className="flex justify-between items-start px-1 mb-3.5">
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[22px] -tracking-[0.5px]" style={{ ...FR, color:t.text }}>{username}</div>
              <div className="text-[18px] tracking-[3px] mt-0.5" style={{ ...VT, color:t.muted }}>{rune(username.toUpperCase().replace(/[^A-Z]/g,""))}</div>
              <div className="text-[13px] mt-2 leading-[1.55] max-w-[340px]" style={{ ...mu, color:t.textDim }}>{bio}</div>
            </div>
            <button
              onClick={()=>setEditingProfile(true)}
              className="px-3.5 py-2 rounded-[9px] cursor-pointer text-[11px] font-bold whitespace-nowrap flex-shrink-0 uppercase tracking-[1.5px] ml-2"
              style={{ ...F, border:`1px solid ${t.border}`, background:t.surfaceHi, color:t.textDim }}>
              Edit
            </button>
          </div>
          <div className="px-1 mb-[18px]">
            <div className="mb-2" style={microLabel}>Equipped Title</div>
            <div className="flex gap-1.5 flex-wrap">
              {unlockedTitles(level).map(title=>{
                const sel=selectedTitle===title;
                return (
                  <button
                    key={title}
                    onClick={()=>setSelectedTitle(title)}
                    className="px-[13px] py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 tracking-[0.5px]"
                    style={{ ...F, border:`1px solid ${sel?t.accent:t.border}`, background:sel?`${t.accent}18`:t.surface, color:sel?t.accent:t.textDim }}>
                    {title}
                  </button>
                );
              })}
              {/* Premium owned titles render with their animated effect even in selection chips */}
              {ownedTitles.map(id=>{
                const ti=PREMIUM_TITLE_BY_ID[id];
                if(!ti)return null;
                const sel=selectedTitle===ti.label;
                return (
                  <button
                    key={id}
                    onClick={()=>setSelectedTitle(ti.label)}
                    className="px-[13px] py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-150 tracking-[0.5px]"
                    style={{ ...F, border:`1px solid ${sel?t.accent:t.border}`, background:sel?`${t.accent}18`:t.surface }}>
                    <span className={`title-${ti.effect}`}>{ti.label}</span>
                  </button>
                );
              })}
              {level<TITLE_LEVELS[unlockedTitles(level).length]&&(
                <span className="text-[11px] self-center italic" style={mu}>Lv.{TITLE_LEVELS[unlockedTitles(level).length]} unlocks next</span>
              )}
            </div>
          </div>
        </>
      ):(
        <div className="p-[18px] mb-4" style={card}>
          <div className="font-bold text-[16px] mb-3.5 -tracking-[0.3px]" style={FR}>Edit Profile</div>
          <div className="mb-3">
            <div className="mb-1.5" style={microLabel}>Username</div>
            <div
              className="w-full px-[13px] py-2.5 rounded-[9px] text-sm tracking-[0.3px] flex justify-between items-center"
              style={{ ...F, border:`1px solid ${t.border}`, background:t.surface2, color:t.textDim }}>
              <span>{username}</span>
              <span className="text-[9px] font-bold uppercase tracking-[1.5px]" style={{ ...F, color:t.muted }}>🔒 Locked</span>
            </div>
          </div>
          <div className="mb-3.5">
            <div className="mb-1.5" style={microLabel}>Bio</div>
            <textarea
              value={bio}
              onChange={e=>setBio(e.target.value.slice(0,120))}
              rows={2}
              className="w-full px-[13px] py-2.5 rounded-[9px] text-[13px] resize-none outline-none leading-[1.55] transition-[border-color] duration-150"
              style={{ ...F, border:`1px solid ${t.inputBorder}`, background:t.input, color:t.text }}
              onFocus={e=>e.target.style.borderColor=t.inputFocus}
              onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
            <div className="text-[10px] text-right mt-[3px] tracking-[0.5px]" style={mu}>{bio.length} / 120</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={()=>setEditingProfile(false)}
              className="flex-1 py-[11px] rounded-[10px] cursor-pointer font-bold text-[13px] uppercase tracking-[1.5px]"
              style={{ ...F, border:`1px solid ${t.border}`, background:t.surfaceHi, color:t.muted }}>
              Cancel
            </button>
            <button
              onClick={()=>setEditingProfile(false)}
              className="flex-[2] py-[11px] rounded-[10px] border-none cursor-pointer font-extrabold text-[13px] uppercase tracking-[2px]"
              style={{ ...F, background:`linear-gradient(135deg,${t.accentHi},${t.accent})`, color:t.accentInk, boxShadow:`0 4px 12px ${t.accent}33` }}>
              Save
            </button>
          </div>
        </div>
      )}

      {coins.length>0&&(
        <div className="px-1 mb-[18px]">
          <div className="mb-1.5" style={microLabel}>Vault Composition</div>
          <div
            className="flex h-1.5 rounded-[3px] overflow-hidden gap-[1.5px] p-px"
            style={{ background:t.faint, border:`1px solid ${t.border}` }}>
            {METALS.map((mt,i)=>{
              const cnt=coins.filter(c=>c.metalIdx===i).length;
              const p=(cnt/Math.max(1,coins.length))*100;
              return p>0&&<div key={i} className="rounded-[1.5px]" style={{ width:`${p}%`, background:`linear-gradient(to bottom,${mt.hl},${mt.base})` }}/>;
            })}
          </div>
          <div className="flex gap-[11px] mt-[9px] flex-wrap">
            {METALS.map((mt,i)=>{
              const cnt=coins.filter(c=>c.metalIdx===i).length;
              return cnt>0&&(
                <div key={i} className="flex items-center gap-[5px]">
                  <div className="w-[7px] h-[7px] rounded-sm" style={{ background:mt.hl, boxShadow:`0 0 6px ${mt.hl}55` }}/>
                  <span className="text-[11px] font-semibold" style={{ ...mu, color:t.textDim }}>
                    {cnt}<span className="font-medium" style={{ color:t.muted }}> {mt.name}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Display Cabinet header */}
      <div className="flex items-baseline justify-between mb-3 px-1">
        <div className="text-[18px]" style={sectionTitle}>Display Cabinet</div>
        <div className="flex items-center gap-2">
          {pinnedIds!=null&&(
            <button
              onClick={()=>{ if(confirm("Reset to auto-pinned (top 6 by rarity)?"))setPinnedIds(null); }}
              className="text-[9px] font-bold uppercase tracking-[1.5px] px-2 py-[3px] rounded-[5px] cursor-pointer"
              style={{ ...F, color:t.muted, border:`1px solid ${t.border}`, background:"transparent" }}>
              Reset
            </button>
          )}
          <div style={microLabel}>{pinnedIds?"Manual":"Auto"}{maxPins>6&&` · ${maxPins} slots`}</div>
        </div>
      </div>
      {/* Cabinet grid */}
      <div className="grid grid-cols-3 gap-[9px]">
        {Array.from({length:maxPins}).map((_,i)=>{
          const coin=showcaseCoins[i];
          if(!coin)return (
            <button
              key={i}
              onClick={()=>setPickerSlot(i)}
              className="min-h-[144px] rounded-[13px] flex flex-col items-center justify-center gap-[5px] cursor-pointer transition-all duration-150"
              style={{
                fontFamily:"Outfit,sans-serif",
                border:`1px dashed ${t.border}`,
                background:`${t.surface}66`,
                color:t.muted,
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=t.borderHi; e.currentTarget.style.background=t.surfaceHi; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=`${t.surface}66`; }}>
              <span className="text-[22px] opacity-40">+</span>
              <span className="text-[9px] font-bold uppercase tracking-[1.5px] opacity-55" style={F}>Pick coin</span>
            </button>
          );
          const m=METALS[coin.metalIdx];
          return (
            <div
              key={coin.id}
              className={`text-center relative cursor-pointer transition-transform duration-200 overflow-visible${coin.shiny?" shiny-card":""}`}
              style={{
                background:isDark?`linear-gradient(160deg,${m.dark}40,${t.surface})`:t.surface,
                border:`1px solid ${m.eng}30`,
                borderTop:`2px solid ${fr.accent}`,
                borderRadius:13,
                padding:"13px 8px 10px",
              }}
              onClick={()=>setSelectedCoin(coin)}
              onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=""; }}>
              {coin.shiny&&<div className="shiny-aura"/>}
              {coin.metalIdx>=7&&<div className={`ambient-particles ${coin.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
              <button
                onClick={(e)=>{ e.stopPropagation(); togglePin(coin.id); }}
                title="Unpin from display"
                className="absolute top-[5px] right-[5px] w-5 h-5 rounded-full cursor-pointer text-[11px] p-0 leading-none flex items-center justify-center z-[3]"
                style={{ fontFamily:"Outfit,sans-serif", border:`1px solid ${t.border}`, background:`${t.surface}cc`, color:t.muted }}>
                ×
              </button>
              {coin.shiny&&<div className="absolute top-1.5 left-[7px] text-[11px]" style={{ color:"#ffe060", textShadow:"0 0 6px #ffe06088" }}>✦</div>}
              <div className="flex justify-center mb-[7px]"><CoinCanvas coin={coin} size={64}/></div>
              <div className="text-[15px] tracking-[3px] leading-none" style={{ ...VT, color:m.hl }}>{coin.runes}</div>
              <div className="text-[8px] mt-[3px] opacity-60" style={{ ...microLabel, color:m.hl }}>{m.name}{coin.shiny?" ✦":""}</div>
            </div>
          );
        })}
      </div>

      {/* ─── EQUIPPED TAROTS ─── */}
      <div className="flex items-baseline justify-between mb-3 mt-[22px] px-1">
        <div className="text-[18px]" style={sectionTitle}>Tarot Spread</div>
        <div style={microLabel}>{equippedTarots.length} / {MAX_EQUIPPED_TAROTS}</div>
      </div>
      {equippedTarots.length===0&&ownedTarots.length===0?(
        <div className="text-center py-6 px-[18px]" style={{ ...card, borderStyle:"dashed" }}>
          <div className="text-[32px] mb-2 opacity-40">🃏</div>
          <div className="text-[13px] max-w-[280px] mx-auto leading-[1.55]" style={mu}>The merchant in the Tavern sells tarot cards that grant passive buffs.</div>
          <button
            onClick={()=>{ setTab("tavern"); setTavernView("shop"); }}
            className="mt-3.5 px-[18px] py-2 rounded-[9px] cursor-pointer font-bold text-[11px] uppercase tracking-[2px]"
            style={{ ...F, border:`1px solid ${t.borderHi}`, background:`${t.accent}1a`, color:t.accent }}>
            Visit Shop →
          </button>
        </div>
      ):(
        <>
          {/* Equipped slots — exactly MAX_EQUIPPED_TAROTS (currently 2).
              Previously hard-coded to 5 from an older deck size; now
              tracks the constant so future tweaks to slot count flow
              through automatically. */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 px-0.5 justify-center">
            {Array.from({length:MAX_EQUIPPED_TAROTS}).map((_,i)=>{
              const cardId=equippedTarots[i];
              if(!cardId)return (
                <div
                  key={`empty-${i}`}
                  className="flex-shrink-0 w-[88px] rounded-[9px] flex items-center justify-center"
                  style={{ aspectRatio:"241 / 565", border:`1px dashed ${t.border}`, background:`${t.surface}66` }}>
                  <span className="text-[9px] font-semibold uppercase tracking-[1.5px]" style={{ ...F, color:t.muted }}>Slot {i+1}</span>
                </div>
              );
              const tCard=TAROT_BY_ID[cardId];
              if(!tCard)return null;
              return <div key={cardId} className="flex-shrink-0"><TarotCard card={tCard} owned equipped size="sm" t={t} onClick={()=>toggleTarot(cardId)}/></div>;
            })}
          </div>

          {/* Active pair badge — visible only when both equipped tarots
              form one of the TAROT_PAIRS combinations. Mirrors the
              eldritch-cyan/violet palette so it reads as a special
              synergy effect not just another buff. */}
          {(() => {
            const pair = activeTarotPair(equippedTarots);
            if (!pair) return null;
            return (
              <div className="px-3.5 py-2.5 mt-2.5 rounded-md text-center"
                style={{
                  background:"linear-gradient(135deg, rgba(122,76,255,.22), rgba(0,229,255,.18))",
                  border:"1px solid rgba(0,229,255,.5)",
                  boxShadow:"0 0 14px rgba(122,76,255,.4)",
                }}>
                <div className="text-[10px] font-bold uppercase tracking-[2px]" style={{ ...F, color:"#00e5ff" }}>Pair Active</div>
                <div className="text-[14px] font-extrabold mt-1" style={{ ...FR, color:"#e8e0ff" }}>{pair.label}</div>
                <div className="text-[11px] italic mt-0.5" style={{ ...F, color:"#a89ed0" }}>{pair.desc}</div>
              </div>
            );
          })()}

          {/* Active buffs summary (per-card descriptions) */}
          {equippedTarots.length>0&&(
            <div className="px-3.5 py-3 mt-2.5 flex flex-wrap gap-2" style={card}>
              {equippedTarots.map(cid=>{
                const c=TAROT_BY_ID[cid];
                if(!c)return null;
                return (
                  <div
                    key={cid}
                    className="flex items-center gap-1.5 px-[9px] py-1 rounded-md"
                    style={{ background:t.surfaceHi, border:`1px solid ${RARITY_COLOR[c.rarity]}33` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background:RARITY_COLOR[c.rarity], boxShadow:`0 0 5px ${RARITY_COLOR[c.rarity]}88` }}/>
                    <span className="text-[11px] font-medium" style={{ ...F, color:t.textDim }}>{c.desc}</span>
                  </div>
                );
              })}
            </div>
          )}
          {ownedTarots.length>equippedTarots.length&&(
            <div className="text-[11px] mt-2 italic text-center" style={mu}>{ownedTarots.length-equippedTarots.length} unequipped — manage in the Tavern shop</div>
          )}
        </>
      )}
    </div>
  );
}
