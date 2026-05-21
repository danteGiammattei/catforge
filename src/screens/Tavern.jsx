import { useGame } from "../lib/GameContext.js";
import { repairCost } from "../lib/coin.js";
import { bannerStyle } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import TarotCard from "../components/TarotCard.jsx";
import ShovelIcon from "../components/ShovelIcon.jsx";
import RouletteWheel from "../components/RouletteWheel.jsx";

/* ─── TAVERN ──────────────────────────────────────────────────────────────
 * Three sub-tabs:
 *   shop   → Tarot / Banners / Titles purchase grids
 *   duels  → Active duels list + create/accept/decline/flip
 *   repair → Pickaxe durability fix or buy-new-pickaxe fallback
 *
 * Shop tab is the cosmetic + tarot store. Locked items show level/cost gates.
 * Duels show pending invitations (incoming need stake, outgoing are pending),
 * active duels (both staked, ready to flip), and resolved ones (with result).
 * Repair tab gates on marks; if you can't afford, offers a Lv1 reset option.
 *
 * BUG FIX during migration: NEW_PICKAXE_COST was used but not destructured.
 * Now properly added to GameContext exposure and destructured here. */
export default function Tavern() {
  const {
    coins, marks, tab, tavernView, shopTab,
    frame, level, shovelLevel, shovelDur, maxDur,
    selectedTitle, ownedFrames, ownedTitles, ownedTarots, equippedTarots,
    duelsList,
    setTavernView, setShopTab, setFrame, setSelectedTitle, setTab,
    buyFrame, buyTitle, buyTarot, buyNewPickaxe, repairPickaxe, NEW_PICKAXE_COST,
    toggleTarot, promptAcceptDuel, declineDuel, flipDuel,
    // Gambling — wired in MintForge, presented in the Gamble sub-view
    gambMode, setGambMode, betIds, betCoins, toggleBet,
    gambPhase, gambResult, gamble, doGamble, gambOk, resetGamble,
    roulBetId, setRoulBetId, roulBetCoin, roulResult, roulDone,
    onRoulResult, resetRoulette,
    METALS, FRAMES, BANNERS, TAROT_CARDS, TITLES, PREMIUM_TITLES, SHOVEL_UPS, MAX_EQUIPPED_TAROTS,
    t, isDark, F, FR, mu, microLabel, sectionTitle, card,
  } = useGame();
  return (
    <div className="animate-fadein">
      {/* Hero banner — warm tavern firelight */}
      <div
        className="-mx-3.5 -mt-[18px] mb-4 px-[22px] pt-9 pb-5 relative overflow-hidden"
        style={{
          background:isDark?"linear-gradient(to bottom,#0e0604 0%,#1a0a04 40%,transparent 100%)":"linear-gradient(to bottom,#f0d8a8 0%,#e8c898 40%,transparent 100%)",
          borderBottom:`1px solid ${isDark?"rgba(180,80,20,.18)":"rgba(180,80,20,.2)"}`,
        }}>
        <div
          className="absolute bottom-0 left-[15%] w-[90px] h-[90px] rounded-full pointer-events-none animate-flicker"
          style={{ background:`radial-gradient(circle,${isDark?"rgba(220,90,15,.32)":"rgba(220,90,15,.3)"},transparent 70%)`, filter:"blur(2px)", animationDuration:"2s" }}/>
        <div
          className="absolute bottom-0 right-[18%] w-[70px] h-[70px] rounded-full pointer-events-none animate-flicker"
          style={{ background:`radial-gradient(circle,${isDark?"rgba(220,90,15,.26)":"rgba(220,90,15,.24)"},transparent 70%)`, filter:"blur(2px)", animationDuration:"1.6s" }}/>
        <div className="flex gap-3.5 items-center relative">
          <div className="text-[40px]" style={{ filter:"drop-shadow(0 2px 6px rgba(220,90,15,.4))" }}>🍺</div>
          <div className="flex-1">
            <div className="font-extrabold text-[22px] mb-[3px] -tracking-[0.3px]" style={{ ...FR, color:t.text }}>The Tavern</div>
            <div className="text-xs italic" style={mu}>Trade with the merchant. Wager with the dealer. Mend your pickaxe.</div>
          </div>
          <div
            className="text-[13px] font-extrabold tracking-[0.5px] tabular-nums flex items-center gap-1 px-[11px] py-1.5 rounded-lg"
            style={{ ...F, color:t.accent, background:"rgba(212,160,23,.1)", border:`1px solid ${t.borderHi}` }}>
            ◈ {marks.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Top-level view switcher */}
      <div
        className="flex gap-1.5 mb-3.5 p-1 rounded-[11px]"
        style={{ background:t.surface, border:`1px solid ${t.border}` }}>
        {/* Duels hidden until friend-vs-friend coin battles are reworked.
            Duel state, API, accept/decline/flip handlers, list — all preserved
            in MintForge.jsx + functions/api/duels/. Just not navigable. */}
        {[["shop","◈","Shop"],["gamble","🎲","Gamble"],["repair","⚒","Repair"]].map(([id,ic,lbl])=>{
          const active=tavernView===id;
          return (
            <button
              key={id}
              onClick={()=>setTavernView(id)}
              className="flex-1 py-[9px] rounded-lg border-none cursor-pointer text-[11px] font-extrabold uppercase tracking-[1.5px] transition-all duration-200 flex items-center justify-center gap-[5px] relative"
              style={{
                ...F,
                background:active?`linear-gradient(135deg,${t.accentHi},${t.accent})`:"transparent",
                color:active?t.accentInk:t.muted,
              }}>
              <span className="text-[13px]">{ic}</span>{lbl}
            </button>
          );
        })}
      </div>

      {/* ── SHOP VIEW ── */}
      {tavernView==="shop"&&(
        <div className="animate-fadein">
          {/* Shop sub-tab picker */}
          <div
            className="flex gap-[5px] mb-3 p-[3px] rounded-[9px]"
            style={{ background:t.surfaceHi, border:`1px solid ${t.border}` }}>
            {[["tarot","🃏","Tarot"],["banners","🖼","Banners"],["titles","✦","Titles"]].map(([id,ic,lbl])=>{
              const active=shopTab===id;
              return (
                <button
                  key={id}
                  onClick={()=>setShopTab(id)}
                  className="flex-1 py-[7px] rounded-[7px] border-none cursor-pointer text-[10px] font-extrabold uppercase tracking-[1.5px] transition-all duration-150 flex items-center justify-center gap-[5px]"
                  style={{ ...F, background:active?(isDark?"#2a1a08":"#f0e0c0"):"transparent", color:active?t.accent:t.muted }}>
                  <span className="text-xs">{ic}</span>{lbl}
                </button>
              );
            })}
          </div>

          {/* ── TAROT SUB-TAB ── */}
          {shopTab==="tarot"&&(
            <>
              <div className="text-xs mb-3 italic px-0.5" style={mu}>Tarot cards grant a single, build-defining effect while equipped. Maximum 2 active at a time — choose carefully. One copy each.</div>
              {/* Tarot grid — explicit 3 columns so the 12 cards lay out
                  cleanly as 4 rows × 3 columns on mobile (rather than the
                  old auto-fill which could give 2 or 5 columns depending
                  on viewport width). Drops the gap slightly and shrinks
                  card text on small screens. */}
              <div className="grid grid-cols-3 gap-2">
                {TAROT_CARDS.map(tc=>{
                  const owned=ownedTarots.includes(tc.id);
                  const equipped=equippedTarots.includes(tc.id);
                  const lvlMet=!tc.minLvl||level>=tc.minLvl;
                  const canBuy=!owned&&lvlMet&&marks>=tc.price;
                  return (
                    <div key={tc.id} className="flex flex-col gap-[7px]">
                      <TarotCard
                        card={tc}
                        owned={owned}
                        equipped={equipped}
                        t={t}
                        onClick={owned?()=>toggleTarot(tc.id):canBuy?()=>{ if(confirm(`Purchase ${tc.title} for ◈${tc.price}?`))buyTarot(tc.id); }:undefined}/>
                      <div className="text-[10px] leading-[1.4] italic text-center min-h-[28px]" style={{ ...F, color:t.textDim }}>{tc.desc}</div>
                      {!owned?(
                        !lvlMet?(
                          <div
                            className="py-[7px] rounded-lg text-[10px] font-bold uppercase tracking-[1px] text-center"
                            style={{ ...F, border:`1px solid ${t.border}`, background:t.surfaceHi, color:t.muted }}>
                            Lv {tc.minLvl} required
                          </div>
                        ):(
                          <button
                            onClick={()=>{ if(canBuy&&confirm(`Purchase ${tc.title} for ◈${tc.price}?`))buyTarot(tc.id); }}
                            disabled={!canBuy}
                            className="py-[7px] rounded-lg text-[11px] font-extrabold uppercase tracking-[1px] tabular-nums"
                            style={{
                              ...F,
                              border:`1px solid ${canBuy?t.accent:t.border}`,
                              background:canBuy?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,
                              cursor:canBuy?"pointer":"not-allowed",
                              color:canBuy?t.accentInk:t.muted,
                            }}>
                            ◈ {tc.price.toLocaleString()}
                          </button>
                        )
                      ):(
                        <button
                          onClick={()=>toggleTarot(tc.id)}
                          disabled={!equipped&&equippedTarots.length>=MAX_EQUIPPED_TAROTS}
                          className="py-[7px] rounded-lg text-[11px] font-extrabold uppercase tracking-[1px]"
                          style={{
                            ...F,
                            border:`1px solid ${equipped?t.success:(equippedTarots.length>=MAX_EQUIPPED_TAROTS?t.border:t.borderHi)}`,
                            background:equipped?(isDark?"#0e2810":"#e8f8ee"):t.surfaceHi,
                            cursor:(!equipped&&equippedTarots.length>=MAX_EQUIPPED_TAROTS)?"not-allowed":"pointer",
                            color:equipped?t.success:(equippedTarots.length>=MAX_EQUIPPED_TAROTS?t.muted:t.textDim),
                          }}>
                          {equipped?"✓ Equipped":(equippedTarots.length>=MAX_EQUIPPED_TAROTS?"Slots Full":"Equip")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── BANNERS SUB-TAB ── */}
          {shopTab==="banners"&&(
            <>
              <div className="text-xs mb-3 italic px-0.5" style={mu}>Premium banners — once owned, equip them in your Profile. Standard frames are XP-unlocked separately.</div>
              <div className="flex flex-col gap-3">
                {Object.entries(FRAMES).filter(([,f])=>f.premium).map(([id,f])=>{
                  const owned=ownedFrames.includes(id);
                  const equipped=frame===id;
                  const lvlMet=level>=f.minLvl;
                  const canBuy=!owned&&lvlMet&&marks>=f.price;
                  return (
                    <div
                      key={id}
                      className="rounded-xl overflow-hidden"
                      style={{
                        border:`1px solid ${equipped?f.accent:t.border}`,
                        background:t.surface,
                        boxShadow:equipped?`0 0 14px ${f.accent}55`:"none",
                      }}>
                      <div
                        className="h-[120px] relative"
                        style={{ ...bannerStyle(id), filter:owned?"none":"grayscale(.4) brightness(.75)" }}>
                        <div className="absolute inset-0" style={{ background:"linear-gradient(to bottom,transparent 30%,rgba(0,0,0,.55) 100%)" }}/>
                        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2.5">
                          <div>
                            <div className="font-extrabold text-lg text-white -tracking-[0.3px]" style={{ ...FR, textShadow:"0 2px 6px rgba(0,0,0,.8)" }}>{f.lbl}</div>
                            <div className="text-[10px] italic tracking-[0.3px]" style={{ ...F, color:"#e0d0a0", textShadow:"0 1px 3px rgba(0,0,0,.9)" }}>{f.desc}</div>
                          </div>
                          <div
                            className="text-[9px] font-bold px-2 py-[3px] rounded-[5px] tracking-[1.5px] uppercase whitespace-nowrap"
                            style={{ ...F, color:lvlMet?"#fff":"#f0a060", background:"rgba(0,0,0,.55)" }}>
                            Lv {f.minLvl}+
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-2.5">
                        {!owned?(
                          <button
                            onClick={()=>{ if(canBuy&&confirm(`Purchase ${f.lbl} banner for ◈${f.price}?`))buyFrame(id); }}
                            disabled={!canBuy}
                            className="w-full py-[9px] rounded-lg text-[11px] font-extrabold uppercase tracking-[1.5px]"
                            style={{
                              ...F,
                              border:`1px solid ${canBuy?t.accent:t.border}`,
                              background:canBuy?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,
                              cursor:canBuy?"pointer":"not-allowed",
                              color:canBuy?t.accentInk:t.muted,
                            }}>
                            {!lvlMet?`Reach Lv ${f.minLvl}`:marks<f.price?`Need ◈ ${f.price.toLocaleString()}`:`Purchase · ◈ ${f.price.toLocaleString()}`}
                          </button>
                        ):equipped?(
                          <div className="text-[11px] font-extrabold text-center uppercase tracking-[1.5px] py-[9px]" style={{ ...F, color:t.success }}>✓ Currently equipped</div>
                        ):(
                          <button
                            onClick={()=>setFrame(id)}
                            className="w-full py-[9px] rounded-lg cursor-pointer text-[11px] font-extrabold uppercase tracking-[1.5px]"
                            style={{ ...F, border:`1px solid ${t.borderHi}`, background:t.surfaceHi, color:t.text }}>
                            Equip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── TITLES SUB-TAB ── */}
          {shopTab==="titles"&&(
            <>
              <div className="text-xs mb-3 italic px-0.5" style={mu}>Premium titles with animated text effects. Equip in your Profile after purchase.</div>
              <div className="flex flex-col gap-2.5">
                {PREMIUM_TITLES.map(ti=>{
                  const owned=ownedTitles.includes(ti.id);
                  const equipped=selectedTitle===ti.label;
                  const lvlMet=level>=ti.minLvl;
                  const canBuy=!owned&&lvlMet&&marks>=ti.price;
                  return (
                    <div
                      key={ti.id}
                      className="px-4 py-3.5"
                      style={{
                        ...card,
                        border:`1px solid ${equipped?t.accent:t.border}`,
                        boxShadow:equipped?`0 0 12px ${t.accent}33`:"none",
                      }}>
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-lg -tracking-[0.2px] mb-1" style={FR}><span className={`title-${ti.effect}`}>{ti.label}</span></div>
                          <div className="text-[10px] uppercase tracking-[1.5px] font-bold" style={{ ...F, color:t.muted }}>Lv {ti.minLvl}+ · ◈ {ti.price.toLocaleString()}</div>
                        </div>
                      </div>
                      {!owned?(
                        <button
                          onClick={()=>{ if(canBuy&&confirm(`Purchase title "${ti.label}" for ◈${ti.price}?`))buyTitle(ti.id); }}
                          disabled={!canBuy}
                          className="w-full py-2 rounded-[7px] text-[10px] font-extrabold uppercase tracking-[1.5px]"
                          style={{
                            ...F,
                            border:`1px solid ${canBuy?t.accent:t.border}`,
                            background:canBuy?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,
                            cursor:canBuy?"pointer":"not-allowed",
                            color:canBuy?t.accentInk:t.muted,
                          }}>
                          {!lvlMet?`Reach Lv ${ti.minLvl}`:marks<ti.price?`Need ◈ ${ti.price.toLocaleString()}`:`Purchase`}
                        </button>
                      ):equipped?(
                        <div className="text-[10px] font-extrabold text-center uppercase tracking-[1.5px] py-2" style={{ ...F, color:t.success }}>✓ Currently equipped</div>
                      ):(
                        <button
                          onClick={()=>setSelectedTitle(ti.label)}
                          className="w-full py-2 rounded-[7px] cursor-pointer text-[10px] font-extrabold uppercase tracking-[1.5px]"
                          style={{ ...F, border:`1px solid ${t.borderHi}`, background:t.surfaceHi, color:t.text }}>
                          Equip
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── GAMBLE VIEW ──────────────────────────────────────────────────
          Two minigames: Coin Toss and the Roulette wheel. Coin Toss is a
          50/50 — win → coin's metal tier bumps up one, lose → coin lost.
          Roulette is six-sector weighted: most likely outcomes punish you,
          rare outcomes are big upside. All state lives in MintForge so this
          view is mostly presentation. */}
      {/* ════════════════════════════════════════════════════════════════
            ELDRITCH GAMBLE VIEW
            ───────────────────────────────────────────────────────────────
            Deliberate visual departure from the rest of the tavern: the
            gambling games are framed as cosmic offerings to an indifferent
            god. Deep void backdrops, violet/cyan glow, drifting starfield,
            pixel-art ornament corners, and the actual coin you're betting
            renders via CoinCanvas mid-flip instead of a generic emoji. */}
      {tavernView==="gamble"&&(()=>{
        // Eldritch palette — kept inline so it doesn't leak to the rest
        // of the tavern's warmer brown/tan look.
        const E = {
          bg:"#08051c", bgPanel:"rgba(14,8,40,.65)",
          violet:"#7a4cff", violetHi:"#9a72ff",
          cyan:"#00e5ff", gold:"#f0c850",
          dread:"#ff3d6c", ink:"#e8e0ff", muted:"#8278b0",
          border:"rgba(122,76,255,.35)", borderHi:"rgba(0,229,255,.6)",
        };
        // Reusable cosmic-void panel. Multi-layer radial-gradient star
        // pattern is pure CSS, no JS, no images — keeps the deploy lean.
        const eldritchPanel = {
          background:
            "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,.6) 50%, transparent 51%), "+
            "radial-gradient(1px 1px at 78% 32%, rgba(180,200,255,.5) 50%, transparent 51%), "+
            "radial-gradient(1px 1px at 41% 67%, rgba(220,180,255,.6) 50%, transparent 51%), "+
            "radial-gradient(1px 1px at 86% 81%, rgba(255,200,220,.4) 50%, transparent 51%), "+
            "radial-gradient(1px 1px at 24% 88%, rgba(160,200,255,.5) 50%, transparent 51%), "+
            "radial-gradient(2px 2px at 60% 12%, rgba(255,255,255,.3) 50%, transparent 51%), "+
            "radial-gradient(ellipse at 50% 50%, rgba(40,20,80,.4), rgba(8,5,28,.95) 70%), "+
            E.bg,
          border:`1px solid ${E.border}`, borderRadius:14, padding:18,
          boxShadow:`0 0 24px rgba(122,76,255,.18), inset 0 0 32px rgba(0,229,255,.04)`,
          position:"relative", overflow:"hidden",
        };
        return (
        <div className="animate-fadein flex flex-col gap-3.5">
          <style>{`
            @keyframes eldritchCoinFlip {
              0%   { transform: perspective(600px) rotateY(0deg)   scale(0.9); filter: brightness(1) drop-shadow(0 0 12px #00e5ff); }
              25%  { transform: perspective(600px) rotateY(450deg) scaleX(0.15) scale(1.05); filter: brightness(1.4) drop-shadow(0 0 18px #9a72ff); }
              50%  { transform: perspective(600px) rotateY(900deg) scale(1.1); filter: brightness(1.6) drop-shadow(0 0 22px #00e5ff); }
              75%  { transform: perspective(600px) rotateY(1350deg) scaleX(0.15) scale(1.05); filter: brightness(1.4) drop-shadow(0 0 18px #9a72ff); }
              100% { transform: perspective(600px) rotateY(1800deg) scale(0.95); filter: brightness(1) drop-shadow(0 0 12px #f0c850); }
            }
            @keyframes eldritchPulse {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50%      { opacity: 1;   transform: scale(1.04); }
            }
          `}</style>

          {/* Mode picker (eldritch) */}
          <div className="flex gap-1.5 p-1 rounded-[10px]"
               style={{ background:E.bgPanel, border:`1px solid ${E.border}` }}>
            {[["toss","◐","Coin Toss"],["roulette","✶","Roulette"]].map(([id,ic,lbl])=>{
              const active=gambMode===id;
              return (
                <button key={id}
                  onClick={()=>{ setGambMode(id); resetGamble(); resetRoulette(); }}
                  className="flex-1 py-2 rounded-md border-none cursor-pointer text-[11px] font-bold uppercase tracking-[1.5px] transition-all flex items-center justify-center gap-1.5"
                  style={{
                    ...F,
                    background:active?`linear-gradient(135deg,${E.violet},${E.cyan})`:"transparent",
                    color:active?"#08051c":E.muted,
                    boxShadow: active ? `0 0 16px ${E.violet}88` : "none",
                  }}>
                  <span style={{ fontSize: 16, color: active ? "#08051c" : E.cyan }}>{ic}</span>{lbl}
                </button>
              );
            })}
          </div>

          {/* ─── COIN TOSS ─────────────────────────────────────────── */}
          {gambMode==="toss"&&(
            <div style={eldritchPanel}>
              <div style={{...FR, fontSize:18, color:E.violetHi, letterSpacing:".5px", textAlign:"center", marginBottom:4 }}>
                {gamble.label}
              </div>
              <div style={{...F, fontSize:11, color:E.muted, letterSpacing:1.5, textTransform:"uppercase", textAlign:"center", marginBottom:14 }}>
                {gamble.desc}
              </div>

              {gambPhase==="select"&&(
                <>
                  <div style={{...F, fontSize:12, fontStyle:"italic", color:E.ink, opacity:.75, textAlign:"center", marginBottom:14 }}>
                    Offer a coin to the void. Heads — its metal ascends. Tails — it is consumed.
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-[260px] overflow-y-auto pr-1 mb-3">
                    {coins.filter(c=>!c.locked).slice(0,80).map(c=>{
                      const selected=betIds.includes(c.id);
                      return (
                        <button key={c.id}
                          onClick={()=>toggleBet(c.id)}
                          className="p-1.5 rounded-md cursor-pointer transition-all"
                          style={{
                            border:`2px solid ${selected?E.cyan:"transparent"}`,
                            background:selected ? `${E.violet}33` : "rgba(20,12,40,.4)",
                            boxShadow:selected ? `0 0 12px ${E.cyan}66` : "none",
                          }}>
                          <CoinCanvas coin={c} size={48}/>
                        </button>
                      );
                    })}
                    {coins.filter(c=>!c.locked).length===0 && (
                      <div className="col-span-4 text-xs italic py-6 text-center" style={{...F, color:E.muted}}>
                        Your vault is empty. The void hungers regardless.
                      </div>
                    )}
                  </div>
                  <button
                    disabled={!gambOk}
                    onClick={doGamble}
                    className="w-full py-2.5 rounded-md font-bold uppercase tracking-[2px] text-xs border-none transition-all"
                    style={{
                      ...F,
                      background:gambOk ? `linear-gradient(135deg,${E.violet},${E.cyan})` : "rgba(20,12,40,.5)",
                      color:gambOk ? "#08051c" : E.muted,
                      cursor:gambOk ? "pointer" : "not-allowed",
                      opacity:gambOk ? 1 : 0.5,
                      boxShadow:gambOk ? `0 0 18px ${E.violet}88` : "none",
                    }}>
                    {gambOk ? "⟁  Offer to the Void  ⟁" : `Select ${gamble.count} coin${gamble.count>1?"s":""}`}
                  </button>
                </>
              )}

              {/* Spinning — actual selected coin via CoinCanvas in a 3D flip */}
              {gambPhase==="spinning"&&betCoins[0]&&(
                <div className="py-10 flex flex-col items-center justify-center gap-4">
                  <div style={{ width:110, height:110, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{
                      position:"absolute", inset:-20, borderRadius:"50%",
                      background:`radial-gradient(circle, ${E.violet}66, transparent 70%)`,
                      animation:"eldritchPulse 1.4s ease-in-out infinite",
                      pointerEvents:"none",
                    }}/>
                    <div style={{
                      animation: "eldritchCoinFlip 1.6s cubic-bezier(.4,.0,.2,1) infinite",
                      transformStyle: "preserve-3d",
                      width: 96, height: 96,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <CoinCanvas coin={betCoins[0]} size={96}/>
                    </div>
                  </div>
                  <div style={{...FR, fontSize:18, color:E.violetHi, letterSpacing:6, textTransform:"uppercase", textShadow:`0 0 10px ${E.violet}88`, animation:"eldritchPulse 1.4s ease-in-out infinite" }}>
                    casting…
                  </div>
                </div>
              )}

              {gambPhase==="result"&&gambResult&&(
                <div className="py-6 text-center flex flex-col items-center gap-4">
                  <div style={{
                    fontSize:64,
                    filter:`drop-shadow(0 0 20px ${gambResult.won?E.cyan:E.dread})`,
                    animation:"eldritchPulse 1.6s ease-in-out infinite",
                  }}>
                    {gambResult.won?"✶":"☠"}
                  </div>
                  <div style={{
                    ...FR, fontSize:20, fontWeight:700,
                    color:gambResult.won?E.cyan:E.dread,
                    letterSpacing:4, textTransform:"uppercase",
                    textShadow:`0 0 12px ${gambResult.won?E.cyan:E.dread}aa`,
                  }}>
                    {gambResult.msg}
                  </div>
                  {gambResult.add[0] && (
                    <div className="flex flex-col items-center gap-1.5">
                      <div style={{
                        padding:6, borderRadius:"50%",
                        background:`radial-gradient(circle, ${E.violet}44, transparent 70%)`,
                        filter:`drop-shadow(0 0 16px ${E.cyan})`,
                      }}>
                        <CoinCanvas coin={gambResult.add[0]} size={88}/>
                      </div>
                      <div style={{...F, fontSize:11, color:E.muted, letterSpacing:2, textTransform:"uppercase"}}>The void returns this</div>
                    </div>
                  )}
                  <button
                    onClick={resetGamble}
                    className="px-5 py-2 rounded-md font-bold uppercase tracking-[2px] text-xs border-none cursor-pointer mt-1"
                    style={{...F, background:"rgba(20,12,40,.6)", color:E.cyan, border:`1px solid ${E.borderHi}`, boxShadow:`0 0 10px ${E.violet}66` }}>
                    Bet again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── ROULETTE ──────────────────────────────────────────── */}
          {/* Gated on (roulBetCoin || roulResult) so the result UI doesn't
              collapse the moment onRoulResult removes the bet from
              `coins` — that was the "breaks after spin" bug. */}
          {gambMode==="roulette"&&(()=>{
            const displayCoin = roulBetCoin || roulResult?.betCoin;
            return (
            <div style={eldritchPanel}>
              <div style={{...FR, fontSize:18, color:E.violetHi, letterSpacing:".5px", textAlign:"center", marginBottom:4 }}>
                The Wheel
              </div>
              <div style={{...F, fontSize:11, color:E.muted, letterSpacing:1.5, textTransform:"uppercase", textAlign:"center", marginBottom:14 }}>
                One coin · six fates · the void decides
              </div>

              {!displayCoin&&(
                <>
                  <div style={{...F, fontSize:12, fontStyle:"italic", color:E.ink, opacity:.75, textAlign:"center", marginBottom:14 }}>
                    Choose your offering. The wheel will know.
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto pr-1">
                    {coins.filter(c=>!c.locked).slice(0,80).map(c=>(
                      <button key={c.id}
                        onClick={()=>setRoulBetId(c.id)}
                        className="p-1.5 rounded-md cursor-pointer transition-all"
                        style={{
                          border:`2px solid ${roulBetId===c.id?E.cyan:"transparent"}`,
                          background:roulBetId===c.id ? `${E.violet}33` : "rgba(20,12,40,.4)",
                          boxShadow:roulBetId===c.id ? `0 0 12px ${E.cyan}66` : "none",
                        }}>
                        <CoinCanvas coin={c} size={48}/>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {displayCoin&&(
                <div className="flex flex-col items-center gap-3 py-2">
                  <div style={{
                    padding:12, borderRadius:"50%",
                    background:`radial-gradient(circle, ${E.violet}22, transparent 70%)`,
                    filter:`drop-shadow(0 0 24px ${E.violet}88)`,
                  }}>
                    <RouletteWheel
                      betCoin={displayCoin}
                      onResult={onRoulResult}
                      disabled={!!roulResult}
                      t={t}
                    />
                  </div>
                  {roulResult&&(
                    <div className="text-center flex flex-col items-center gap-2.5">
                      <div style={{
                        ...FR, fontSize:18, fontWeight:700,
                        color:roulResult.won?E.cyan:E.dread,
                        letterSpacing:4, textTransform:"uppercase",
                        textShadow:`0 0 12px ${roulResult.won?E.cyan:E.dread}aa`,
                      }}>
                        {roulResult.msg||roulResult.sector?.outcome}
                      </div>
                      {roulResult.add && roulResult.add.length > 0 && (
                        <div className="flex gap-1.5">
                          {roulResult.add.slice(0,4).map((c,i)=>(
                            <div key={i} style={{
                              padding:3, borderRadius:"50%",
                              background:`radial-gradient(circle, ${E.cyan}33, transparent 70%)`,
                              filter:`drop-shadow(0 0 8px ${E.cyan})`,
                            }}>
                              <CoinCanvas coin={c} size={44}/>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={resetRoulette}
                        className="px-5 py-2 rounded-md font-bold uppercase tracking-[2px] text-xs border-none cursor-pointer mt-1"
                        style={{...F, background:"rgba(20,12,40,.6)", color:E.cyan, border:`1px solid ${E.borderHi}`, boxShadow:`0 0 10px ${E.violet}66` }}>
                        Spin again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })()}
        </div>
        );
      })()}

      {/* ── REPAIR VIEW ── */}
      {tavernView==="repair"&&(()=>{
        const missing=maxDur-shovelDur;
        const cost=repairCost(missing,shovelLevel);
        const canRepair=missing>0&&marks>=cost;
        const durPct=Math.round((shovelDur/maxDur)*100);
        return (
          <div className="animate-fadein flex flex-col gap-3.5">
            <div className="p-[18px]" style={card}>
              <div className="flex items-center gap-3.5 mb-3.5">
                <div
                  className="w-[54px] h-[54px] rounded-[11px] flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`, border:`1px solid ${t.borderHi}` }}>
                  <ShovelIcon level={shovelLevel} size={40}/>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-base -tracking-[0.2px]" style={{ ...FR, color:t.text }}>{SHOVEL_UPS[shovelLevel]?.label||`Shovel Lv.${shovelLevel}`}</div>
                  <div className="text-[11px] mt-0.5" style={mu}>Durability {shovelDur} / {maxDur}</div>
                </div>
                <div className="font-extrabold text-2xl -tracking-[1px] tabular-nums" style={{ ...FR, color:durPct>50?t.success:durPct>20?t.accent:t.danger }}>{durPct}%</div>
              </div>
              <div
                className="h-[9px] rounded-[4px] overflow-hidden mb-3.5"
                style={{ background:t.faint, border:`1px solid ${t.border}` }}>
                <div
                  className="h-full transition-[width] duration-[400ms]"
                  style={{
                    width:`${durPct}%`,
                    background:durPct>50?`linear-gradient(to right,${t.success},#a0e0a0)`:durPct>20?`linear-gradient(to right,${t.accentDim},${t.accent})`:`linear-gradient(to right,#8a2010,${t.danger})`,
                    boxShadow:`0 0 8px ${durPct>50?t.success:durPct>20?t.accent:t.danger}55`,
                  }}/>
              </div>
              {missing===0?(
                <div className="text-[13px] font-bold text-center py-2.5 uppercase tracking-[1.5px]" style={{ ...F, color:t.success }}>✦ Pickaxe Pristine</div>
              ):(
                <button
                  onClick={()=>{ if(canRepair)repairPickaxe(); }}
                  disabled={!canRepair}
                  className="w-full py-3 rounded-[10px] text-[13px] font-extrabold uppercase tracking-[2px]"
                  style={{
                    ...F,
                    border:`1px solid ${canRepair?t.accent:t.border}`,
                    cursor:canRepair?"pointer":"not-allowed",
                    background:canRepair?`linear-gradient(135deg,${t.accentHi},${t.accent})`:t.surfaceHi,
                    color:canRepair?t.accentInk:t.muted,
                  }}>
                  {canRepair?`⚒ Repair · ◈ ${cost.toLocaleString()}`:marks<cost?`Need ◈ ${cost.toLocaleString()}`:`Repair · ◈ ${cost.toLocaleString()}`}
                </button>
              )}
              <div className="text-[11px] mt-2.5 italic text-center" style={mu}>Each dig consumes 1 durability. The Hierophant tarot halves it.</div>
            </div>

            {/* Broken-pickaxe last-resort replacement */}
            {shovelDur<=0&&(
              <div
                className="px-4 py-3.5"
                style={{ ...card, border:`1px dashed ${t.danger}66`, background:isDark?"#1a0606":"#fff0ec" }}>
                <div className="font-bold text-[14px] mb-1.5 -tracking-[0.2px]" style={{ ...FR, color:t.danger }}>Pickaxe Broken</div>
                <div className="text-xs italic leading-[1.5] mb-2.5" style={mu}>Stuck without enough marks to repair? Buy a fresh Lv1 pickaxe — resets your shovel level and refills durability.</div>
                <button
                  onClick={()=>{ if(marks>=NEW_PICKAXE_COST&&confirm(`Buy a fresh Lv1 pickaxe for ◈${NEW_PICKAXE_COST}? Your shovel level will reset to 1.`))buyNewPickaxe(); }}
                  disabled={marks<NEW_PICKAXE_COST}
                  className="w-full py-2.5 rounded-[9px] text-xs font-extrabold uppercase tracking-[2px]"
                  style={{
                    ...F,
                    border:`1px solid ${marks>=NEW_PICKAXE_COST?t.danger:t.border}`,
                    cursor:marks>=NEW_PICKAXE_COST?"pointer":"not-allowed",
                    background:marks>=NEW_PICKAXE_COST?(isDark?"linear-gradient(135deg,#3a1010,#5a1818)":"linear-gradient(135deg,#fbe8e8,#f0c4c4)"):t.surfaceHi,
                    color:marks>=NEW_PICKAXE_COST?(isDark?"#ffb0a0":t.danger):t.muted,
                  }}>
                  ⛏ Buy New Pickaxe · ◈ {NEW_PICKAXE_COST}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── DUELS VIEW ── friend coin battles */}
      {tavernView==="duels"&&(
        <div className="animate-fadein">
          <div className="px-1 pb-3.5 text-xs italic leading-[1.55]" style={mu}>
            Stake a coin against a friend's. Best of three flips. Winner takes both.
            <br/><span className="opacity-70">Visit a friend's profile to send a challenge.</span>
          </div>
          {duelsList.length===0?(
            <div className="text-center px-[18px] py-8" style={{ ...card, borderStyle:"dashed" }}>
              <div className="text-[36px] mb-2 opacity-40">⚔</div>
              <div className="text-[13px] max-w-[280px] mx-auto leading-[1.55]" style={mu}>No active duels. Find a friend in the Social tab and challenge them to a coin battle.</div>
              <button
                onClick={()=>setTab("social")}
                className="mt-3.5 px-[18px] py-2 rounded-[9px] cursor-pointer font-bold text-[11px] uppercase tracking-[2px]"
                style={{ ...F, border:`1px solid ${t.borderHi}`, background:`${t.accent}1a`, color:t.accent }}>
                Find Friend →
              </button>
            </div>
          ):(
            <div className="flex flex-col gap-2.5">
              {duelsList.map(d=>{
                const isChallenger=d.role==="challenger";
                const myCoin=isChallenger?d.challengerCoin:d.challengedCoin;
                const theirCoin=isChallenger?d.challengedCoin:d.challengerCoin;
                const theirName=isChallenger?d.challengedUsername:d.challengerUsername;
                const theirFrame=isChallenger?d.challengedFrame:d.challengerFrame;
                const needsMyStake=d.status==="pending"&&!isChallenger;
                const awaitingTheirStake=d.status==="pending"&&isChallenger;
                const readyToFlip=d.status==="ready";
                const hoursLeft=Math.max(0,Math.ceil((d.expiresAt-Date.now())/(60*60*1000)));
                return (
                  <div
                    key={d.id}
                    className="p-[13px] flex flex-col gap-[11px]"
                    style={{ ...card, borderColor:readyToFlip?t.success+"66":needsMyStake?t.accent+"66":t.border }}>
                    {/* Header: friend's identity + status pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px]" style={{ ...microLabel, color:t.muted }}>{isChallenger?"You vs":"Challenged by"}</span>
                        <span className="text-[13px] font-extrabold tracking-[0.3px] overflow-hidden text-ellipsis whitespace-nowrap" style={{ ...F, color:t.text }}>{theirName}</span>
                      </div>
                      <span
                        className="text-[8px] px-2 py-[3px] rounded-md tracking-[1.5px]"
                        style={{
                          ...microLabel,
                          background:readyToFlip?(isDark?"#0e2810":"#e8f8ee"):needsMyStake?(isDark?"#1a1408":"#fff5e8"):(isDark?"#1a1408":"#f4ebd8"),
                          color:readyToFlip?t.success:needsMyStake?t.accent:t.muted,
                        }}>
                        {readyToFlip?"Ready":needsMyStake?"Your move":"Pending"}
                      </span>
                    </div>
                    {/* Stakes — your coin vs theirs */}
                    <div className="flex items-center justify-center gap-3.5 py-1.5">
                      <div className="flex flex-col items-center gap-[5px]">
                        <span className="text-[8px]" style={{ ...microLabel, color:t.muted }}>YOU STAKE</span>
                        {myCoin?<CoinCanvas coin={myCoin} size={56}/>:(
                          <div
                            className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-lg"
                            style={{ border:`2px dashed ${t.border}`, color:t.muted }}>?</div>
                        )}
                      </div>
                      <span className="text-lg opacity-50 font-bold" style={{ ...F, color:t.muted }}>vs</span>
                      <div className="flex flex-col items-center gap-[5px]">
                        <span className="text-[8px]" style={{ ...microLabel, color:t.muted }}>THEY STAKE</span>
                        {theirCoin?<CoinCanvas coin={theirCoin} size={56}/>:(
                          <div
                            className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-lg"
                            style={{ border:`2px dashed ${t.border}`, color:t.muted }}>?</div>
                        )}
                      </div>
                    </div>
                    {/* Action row */}
                    <div className="flex gap-[7px] items-center">
                      {needsMyStake&&(
                        <button
                          onClick={()=>promptAcceptDuel(d)}
                          className="flex-1 py-[9px] rounded-lg text-[11px] font-extrabold uppercase tracking-[1.5px]"
                          style={{ ...F, border:`1px solid ${t.accent}`, background:`linear-gradient(135deg,${t.accentHi},${t.accent})`, cursor:"pointer", color:t.accentInk }}>
                          Accept · Set Stake
                        </button>
                      )}
                      {readyToFlip&&(
                        <button
                          onClick={()=>flipDuel(d)}
                          className="flex-1 py-[9px] rounded-lg text-[11px] font-extrabold uppercase tracking-[1.5px]"
                          style={{
                            ...F,
                            border:`1px solid ${t.success}`,
                            background:isDark?"linear-gradient(135deg,#0e3818,#1e6028)":"linear-gradient(135deg,#d8f5e0,#a8e8c0)",
                            cursor:"pointer",
                            color:t.success,
                          }}>
                          ⚔ Flip the Coins
                        </button>
                      )}
                      {awaitingTheirStake&&(
                        <div className="flex-1 py-[9px] text-center text-[9px] tracking-[1.5px]" style={{ ...microLabel, color:t.muted }}>
                          Awaiting their stake · {hoursLeft}h left
                        </div>
                      )}
                      <button
                        onClick={()=>{ if(confirm("Decline this duel?"))declineDuel(d.id); }}
                        className="px-3.5 py-[9px] rounded-lg text-[10px] font-bold uppercase tracking-[1.5px] cursor-pointer"
                        style={{ ...F, border:`1px solid ${t.border}`, background:"transparent", color:t.muted }}>
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
