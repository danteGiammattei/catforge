import { useGame } from "../lib/GameContext.js";
import { coinRarity, senseLevel, RNG, rollRarity } from "../lib/coin.js";
import DigPit from "../components/DigPit.jsx";
import BrushReveal from "../components/BrushReveal.jsx";

/* ─── HUNT ────────────────────────────────────────────────────────────────
 * The core game loop. Three phases:
 *   hunt    → metal-detector field; sweep, find signal, dig
 *   dig     → 4×4 dig pit, tap cells until coin or shovel runs out
 *   brush   → BrushReveal canvas, scrub away the dirt to reveal the coin
 *
 * Tarot effects surface here:
 *   The Hermit  → reveals the next coin's rarity in the field, allows skip
 *   Wheel of Fortune → guaranteed Rare+ every Nth find, counter visible
 *   The Hanged Man   → daily reroll button at brush phase
 *   The Sun     → rarity floor, shown as a glyph in the field
 *   The Chariot → first-strike chance baked into DigPit logic
 *
 * BUG FIX during migration: previous version referenced RNG, rollRarity,
 * and level inside the Hermit reveal block without importing them or
 * destructuring level from useGame(). Would have crashed at runtime when
 * the Hermit tarot was equipped. Now imported and destructured properly. */
export default function Hunt() {
  const {
    phase, huntCoin, foundCoin,
    detFrac, signal, signalColor, canDig,
    shovelLevel, shovelDur, maxDur, brushData, buff,
    findStreak, hangedManAvailable, hermitPeek, tooDeepMsg, level,
    fieldRef,
    onFieldInteract, onDig, onDigFound, onTooDeep, onCellScrap,
    onSkipHunt, onAbandon, onBrushDone, rerollFoundRarity,
    setTab, setTavernView,
    METALS, RARITIES, RARITY_COLOR, SENSE_PHRASES,
    t, isDark, F, VT, FR, mu, microLabel, sectionTitle, card,
  } = useGame();
  return (
    <div className="animate-fadein">
      {phase==="hunt"&&(
        <>
          {/* Header — title + level + durability bar */}
          <div className="flex items-baseline justify-between mb-3 px-0.5">
            <div style={sectionTitle}>The Field</div>
            <div className="flex items-center gap-2">
              <div style={microLabel}>Lv.{shovelLevel}</div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] opacity-65">⛏</span>
                <div className="w-[42px] h-[5px] rounded-[3px] overflow-hidden" style={{ background:t.faint, border:`1px solid ${t.border}` }}>
                  <div className="h-full transition-[width] duration-300" style={{ width:`${Math.round((shovelDur/maxDur)*100)}%`, background:shovelDur>maxDur*.5?t.success:shovelDur>maxDur*.2?t.accent:t.danger }}/>
                </div>
                <span className="text-[9px] font-semibold tabular-nums" style={{ ...F, color:t.muted }}>{shovelDur}/{maxDur}</span>
              </div>
            </div>
          </div>
          <div className="text-[13px] mb-3.5 px-0.5 italic" style={{ ...mu, color:t.textDim }}>Sweep across the soil. When the signal locks, dig.</div>

          {/* Signal bar + dig button */}
          <div className="px-4 py-3 mb-3 flex items-center gap-3.5 flex-wrap" style={card}>
            <div className="flex-1 min-w-[140px]">
              <div className="flex justify-between mb-1.5 items-baseline">
                <span className="text-[9px]" style={microLabel}>Signal</span>
                <span className="text-[18px] tracking-[1.5px]" style={{ ...VT, color:signalColor, textShadow:`0 0 8px ${signalColor}55` }}>
                  {signal<.04?"NO SIGNAL":signal<.28?"FAINT":signal<.58?"MODERATE":signal<.84?"STRONG":"LOCKED ON"}
                </span>
              </div>
              <div className="h-1.5 rounded-[3px] overflow-hidden" style={{ background:t.faint, border:`1px solid ${t.border}` }}>
                <div className="h-full rounded-[3px] transition-[width] duration-[80ms]" style={{ width:`${signal*100}%`, background:`linear-gradient(to right,#2a3850,${signalColor})`, boxShadow:`0 0 8px ${signalColor}55` }}/>
              </div>
            </div>
            {canDig&&shovelDur>0&&(
              <button
                onClick={onDig}
                className="px-[26px] py-[11px] rounded-[11px] cursor-pointer text-[14px] font-extrabold flex-shrink-0 uppercase tracking-[2px] animate-flicker flex items-center gap-2"
                style={{
                  ...F,
                  border:`1px solid ${t.success}`,
                  background:isDark?"linear-gradient(135deg,#0e2810,#1e4820)":"linear-gradient(135deg,#e8f8ee,#bce8ca)",
                  color:t.success,
                  boxShadow:`0 4px 12px ${t.success}33`,
                }}>
                <span>⛏ Dig</span>
                <kbd
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-[0.5px] opacity-85"
                  style={{ ...F, background:"rgba(0,0,0,.25)", color:t.success, border:`1px solid ${t.success}55` }}>↵</kbd>
              </button>
            )}
            {shovelDur<=0&&(
              <button
                onClick={()=>{ setTab("tavern"); setTavernView("repair"); }}
                className="px-[22px] py-[11px] rounded-[11px] cursor-pointer text-[13px] font-extrabold flex-shrink-0 uppercase tracking-[1.5px]"
                style={{
                  ...F,
                  border:`1px solid ${t.danger}`,
                  background:isDark?"linear-gradient(135deg,#2a0808,#481010)":"linear-gradient(135deg,#fbe8e8,#f0c4c4)",
                  color:t.danger,
                }}>
                ⚒ Repair Pickaxe
              </button>
            )}
          </div>

          {/* Hunt field — metal-detector view with concentric pings */}
          <div
            ref={fieldRef}
            onMouseMove={onFieldInteract}
            onTouchMove={onFieldInteract}
            onClick={onFieldInteract}
            className="relative h-[280px] rounded-2xl overflow-hidden cursor-crosshair select-none"
            style={{
              touchAction:"none",
              background:isDark
                ? `radial-gradient(ellipse at 30% 20%,#1a1208 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,#100a04 0%,transparent 60%),linear-gradient(180deg,#100a06,#0a0604)`
                : `radial-gradient(ellipse at 30% 20%,#c8b090 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,#a89070 0%,transparent 60%),linear-gradient(180deg,#b89878,#988868)`,
              border:`1px solid ${isDark?"#2a1a0a":"#a08868"}`,
              boxShadow:`inset 0 0 60px rgba(0,0,0,.45)`,
              WebkitTapHighlightColor:"transparent",
            }}>
            {/* Soil grain pattern — static SVG, paints once */}
            <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none z-[1]" style={{ opacity:isDark?.55:.5 }}>
              <defs>
                <pattern id="soilGrain" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="6" r="0.7" fill={isDark?"#5a3818":"#3a2814"}/>
                  <circle cx="11" cy="20" r="0.5" fill={isDark?"#704020":"#403018"}/>
                  <circle cx="20" cy="9" r="0.8" fill={isDark?"#4a2810":"#5a4020"}/>
                  <circle cx="24" cy="24" r="0.4" fill={isDark?"#604020":"#3e2c18"}/>
                  <circle cx="14" cy="14" r="0.55" fill={isDark?"#503010":"#4a3418"}/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#soilGrain)"/>
            </svg>
            {/* Scanline */}
            <div className="absolute top-0 h-full w-[3px] left-0 z-[2] pointer-events-none" style={{ background:`linear-gradient(to bottom,transparent,${signalColor}33,transparent)`, animation:"scanline 8s linear infinite" }}/>
            {/* Soft signal halo around cursor */}
            <div className="absolute inset-0 pointer-events-none transition-[background] duration-150 z-[2]" style={{ background:`radial-gradient(circle at ${detFrac.x*100}% ${detFrac.y*100}%, ${signalColor}22 0%, transparent 30%)` }}/>
            {/* Concentric pings — proximity-driven speed */}
            {(()=>{
              const m=METALS[huntCoin.metalIdx]||METALS[0];
              const ringColor=signal>0.55?(canDig?"#7cffb0":m.hl):signalColor;
              const ringDur=canDig?0.7:signal>0.55?1.0:signal>0.28?1.3:1.8;
              return [0,1,2,3].map(i=>{
                const visible=signal>(i*.22);
                return (
                  <div key={i} className="absolute rounded-full pointer-events-none z-[3]" style={{
                    left:`${detFrac.x*100}%`, top:`${detFrac.y*100}%`,
                    width:50+i*32, height:50+i*32,
                    border:`${canDig?2:1.5}px solid ${ringColor}`,
                    transform:"translate(-50%,-50%)",
                    animation:`pingRing ${ringDur}s ease-out ${i*(ringDur*0.22)}s infinite`,
                    opacity:visible?1:0,
                    transition:"opacity .35s, border-color .25s, width .2s, height .2s",
                    boxShadow:canDig?`0 0 8px ${ringColor}44`:undefined,
                  }}/>
                );
              });
            })()}
            {/* Cursor */}
            <div className="absolute rounded-full pointer-events-none z-[4]" style={{
              left:`${detFrac.x*100}%`, top:`${detFrac.y*100}%`,
              width:canDig?20:signal>0.55?14:10,
              height:canDig?20:signal>0.55?14:10,
              background:canDig?`radial-gradient(circle,#a0ffcc,#50e890)`:`radial-gradient(circle,${signalColor},${signalColor}88)`,
              transform:"translate(-50%,-50%)",
              border:`2px solid ${canDig?"rgba(80,255,144,.6)":signalColor+"66"}`,
              boxShadow:canDig?`0 0 0 4px rgba(80,255,144,.15),0 0 20px #50ff9088`:signal>.5?`0 0 10px ${signalColor}66`:"none",
              transition:"all .2s cubic-bezier(.34,1.56,.64,1)",
              animation:canDig?"pulseDot .9s ease-in-out infinite":signal>0.55?"breathe 1.4s ease-in-out infinite":"none",
              color:canDig?"#50ff90":signalColor,
            }}/>
            {/* Sense text / idle hint */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
              {(()=>{
                const lvl=senseLevel(signal);
                if(!lvl)return (
                  <span className="text-[13px] opacity-50 italic tracking-[1px]" style={{ ...mu, color:isDark?"#8a7560":"#3a2814" }}>Sweep to scan</span>
                );
                const phrases=SENSE_PHRASES[lvl];
                const phrase=phrases[huntCoin.seed%phrases.length];
                return (
                  <span
                    key={lvl}
                    className="italic tracking-[1px] animate-fadein"
                    style={{
                      ...mu,
                      fontSize:lvl==="locked"?14:13,
                      opacity:lvl==="locked"?.95:.7,
                      color:lvl==="locked"?"#50ff90":isDark?"#c8b89a":"#3a2814",
                      textShadow:lvl==="locked"?"0 0 10px #50ff9066":"none",
                    }}>
                    {phrase}
                  </span>
                );
              })()}
            </div>
            {/* Hermit reveal badge */}
            {buff.revealRarity&&(()=>{
              const rRng=new RNG(huntCoin.seed^0xfa11);
              const previewRarity=rollRarity(rRng,level,null,false);
              const r=RARITIES[previewRarity];
              return (
                <div className="absolute top-2.5 left-2.5 px-[11px] py-[5px] rounded-[7px] z-[6] pointer-events-none flex items-center gap-1.5" style={{ background:isDark?"rgba(20,12,4,.92)":"rgba(255,248,232,.92)", border:`1px solid ${r.color}88` }}>
                  <span className="text-[8px] tracking-[1.5px]" style={{ ...microLabel, color:isDark?"#8a7250":"#5a4020" }}>Hermit sees</span>
                  <span className="text-[11px] font-extrabold tracking-[0.5px]" style={{ ...F, color:r.color }}>{r.name}</span>
                </div>
              );
            })()}
            {/* Wheel of Fortune streak counter */}
            {buff.guaranteedEvery>0&&(
              <div className="absolute top-2.5 right-2.5 px-[11px] py-[5px] rounded-[7px] z-[6] pointer-events-none flex items-center gap-1.5" style={{ background:isDark?"rgba(20,12,4,.92)":"rgba(255,248,232,.92)", border:`1px solid ${RARITY_COLOR.epic}88` }}>
                <span className="text-[8px] tracking-[1.5px]" style={{ ...microLabel, color:isDark?"#8a7250":"#5a4020" }}>Wheel</span>
                <span className="text-[11px] font-extrabold tracking-[0.5px] tabular-nums" style={{ ...F, color:RARITY_COLOR.epic }}>{findStreak%buff.guaranteedEvery}/{buff.guaranteedEvery}</span>
              </div>
            )}
          </div>

          {/* Hermit skip button */}
          {buff.allowSkip&&buff.revealRarity&&(
            <button
              onClick={onSkipHunt}
              className="mt-2.5 px-4 py-[7px] rounded-lg cursor-pointer text-[11px] font-bold uppercase tracking-[1.5px] self-center"
              style={{ ...F, border:`1px solid ${isDark?"#3a3020":"#a89878"}`, background:"transparent", color:t.muted }}>
              ↻ Skip · Hermit's wisdom
            </button>
          )}
        </>
      )}

      {phase==="dig"&&foundCoin&&(
        <div className="flex flex-col items-center gap-4 animate-fadein">
          <div className="text-center" style={sectionTitle}>Excavate</div>
          <div className="flex gap-2 flex-wrap justify-center">
            <div className="text-[10px] px-[11px] py-[5px] rounded-md" style={{ ...microLabel, background:isDark?"#0e2010":"#e8f5ec", border:`1px solid ${isDark?"#1e3820":"#aadaba"}`, color:t.success }}>⚡ 1–2 digs · rarity up</div>
            <div className="text-[10px] px-[11px] py-[5px] rounded-md" style={{ ...microLabel, background:isDark?"#1a0e08":"#faf0ea", border:`1px solid ${isDark?"#3a1e10":"#e0b090"}`, color:"#c47040" }}>☠ All cells · rarity down</div>
          </div>
          {tooDeepMsg&&(
            <div
              className="px-[18px] py-[11px] rounded-[9px] text-[13px] text-center font-semibold max-w-[320px] tracking-[0.3px]"
              style={{ ...F, background:isDark?"#1a0c08":"#fff5f0", border:`1px solid ${t.danger}`, color:t.danger }}>
              ⛏ {tooDeepMsg}
            </div>
          )}
          <DigPit coin={foundCoin} shovelLevel={shovelLevel} onFound={onDigFound} onTooDeep={onTooDeep} onCellScrap={onCellScrap} firstStrikeBonus={buff.firstStrikeBonus||0} t={t} isDark={isDark}/>
          <div className="flex gap-2 items-center flex-wrap justify-center">
            <button
              onClick={onAbandon}
              className="px-[18px] py-2 rounded-lg cursor-pointer text-[11px] font-semibold uppercase tracking-[2px] transition-all duration-150"
              style={{ ...F, border:`1px solid ${t.border}`, background:"transparent", color:t.muted }}
              onMouseEnter={e=>{ e.currentTarget.style.color=t.textDim; e.currentTarget.style.borderColor=t.borderHi; }}
              onMouseLeave={e=>{ e.currentTarget.style.color=t.muted; e.currentTarget.style.borderColor=t.border; }}>
              ← Leave buried
            </button>
          </div>
        </div>
      )}

      {phase==="brush"&&foundCoin&&(
        <div className="flex flex-col items-center gap-3.5 animate-fadein">
          <div className="text-center" style={sectionTitle}>Brush It Off</div>
          {/* Show what rarity was rolled — the Hanged Man choice is informed */}
          {(()=>{
            const r=RARITIES[coinRarity(foundCoin)]||RARITIES[0];
            return (
              <div
                className="text-[10px] px-[13px] py-1.5 rounded-md font-extrabold tracking-[1.5px] flex items-center gap-1.5"
                style={{ ...microLabel, background:`${r.color}15`, border:`1px solid ${r.color}66`, color:r.color, boxShadow:`0 0 10px ${r.color}22` }}>
                <span>Rolled · {r.name}</span>
                {foundCoin.rerolled&&<span className="opacity-70 text-[8px]">(rerolled)</span>}
              </div>
            );
          })()}
          <div
            className="text-[10px] px-[13px] py-[5px] rounded-md"
            style={{ ...microLabel, background:t.surfaceHi, border:`1px solid ${t.border}`, color:t.textDim }}>
            🖌️ {brushData.label} · {Math.round(Math.min(0.95,brushData.shinyChance+buff.shinyBonus)*100)}% shiny
            {buff.shinyBonus>0&&<span className="ml-1" style={{ color:t.success }}>(+{Math.round(buff.shinyBonus*100)}%)</span>}
          </div>
          {hangedManAvailable&&!foundCoin.rerolled&&(
            <button
              onClick={rerollFoundRarity}
              className="px-[22px] py-[9px] rounded-[9px] cursor-pointer text-[11px] font-extrabold uppercase tracking-[2px] transition-all duration-150"
              style={{
                ...F,
                border:`1px solid ${RARITY_COLOR.epic}`,
                background:`linear-gradient(135deg,${RARITY_COLOR.epic}33,${RARITY_COLOR.epic}11)`,
                color:RARITY_COLOR.epic,
                boxShadow:`0 0 16px ${RARITY_COLOR.epic}33`,
              }}>
              ✦ Hanged Man · Reroll Rarity
            </button>
          )}
          <BrushReveal coin={foundCoin} brushAlpha={brushData.alpha} shinyChance={Math.min(0.95,brushData.shinyChance+buff.shinyBonus)} onRevealed={onBrushDone} t={t}/>
        </div>
      )}
    </div>
  );
}
