import { useGame } from "../lib/GameContext.js";

/* ─── SHRINE ──────────────────────────────────────────────────────────────
 * Two sub-tabs:
 *   forge      → consume 5 same-metal coins + marks fee → produce an artefact
 *   collection → grid of forged artefacts, scored by grade
 *
 * Grade tier reflects the average rarity of input coins. Forge cost scales
 * geometrically per metal tier (Copper → Astral); The Tower tarot reduces
 * forge cost by 40% (visible in the button label as "✦"). */
export default function Shrine() {
  const {
    coins, marks, shrineView, shrinePicker, artefacts, buff,
    setShrineView, setShrinePicker,
    METALS, ARTEFACTS, ARTEFACT_GRADES, ARTEFACT_FORGE_COST,
    t, isDark, F, FR, mu, microLabel, card,
  } = useGame();
  return (
    <div className="animate-fadein">
      {/* Hero banner — celestial glow ambience */}
      <div
        className="-mx-3.5 -mt-[18px] mb-4 px-[22px] pt-9 pb-5 relative overflow-hidden"
        style={{
          background:isDark?"linear-gradient(to bottom,#020a14 0%,#04101e 50%,transparent 100%)":"linear-gradient(to bottom,#d8dde8 0%,#c8d2e0 50%,transparent 100%)",
          borderBottom:`1px solid ${isDark?"rgba(120,140,200,.18)":"rgba(120,140,200,.2)"}`,
        }}>
        <div
          className="absolute top-[30%] left-[20%] w-[140px] h-[140px] rounded-full pointer-events-none animate-flicker"
          style={{ background:`radial-gradient(circle,${isDark?"rgba(180,200,255,.12)":"rgba(180,200,255,.15)"},transparent 70%)`, filter:"blur(4px)", animationDuration:"4s" }}/>
        <div
          className="absolute top-[40%] right-[15%] w-[90px] h-[90px] rounded-full pointer-events-none animate-flicker"
          style={{ background:`radial-gradient(circle,${isDark?"rgba(200,160,255,.16)":"rgba(200,160,255,.18)"},transparent 70%)`, filter:"blur(4px)", animationDuration:"3.2s" }}/>
        <div className="flex gap-3.5 items-center relative">
          <div className="text-[38px]" style={{ filter:"drop-shadow(0 2px 6px rgba(180,200,255,.4))" }}>✧</div>
          <div className="flex-1">
            <div className="font-extrabold text-[22px] mb-[3px] -tracking-[0.3px]" style={{ ...FR, color:t.text }}>The Shrine</div>
            <div className="text-xs italic" style={mu}>Forge artefacts from coins of like metal — vessels for the long ages.</div>
          </div>
          <div
            className="text-[13px] font-extrabold tracking-[0.5px] tabular-nums flex items-center gap-1 px-[11px] py-1.5 rounded-lg"
            style={{
              ...F,
              color:t.accent,
              background:"rgba(212,160,23,.1)",
              border:`1px solid ${t.borderHi}`,
            }}>
            ◈ {marks.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sub-tab: Forge / Collection */}
      <div
        className="flex gap-1.5 mb-3.5 p-1 rounded-[11px]"
        style={{ background:t.surface, border:`1px solid ${t.border}` }}>
        {[["forge","⚒","Forge"],["collection","✧",`Collection · ${artefacts.length}`]].map(([id,ic,lbl])=>{
          const active=shrineView===id;
          return (
            <button
              key={id}
              onClick={()=>setShrineView(id)}
              className="flex-1 py-[9px] rounded-lg border-none cursor-pointer text-[11px] font-extrabold uppercase tracking-[1.5px] transition-all duration-200 flex items-center justify-center gap-[5px]"
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

      {shrineView==="forge"&&(()=>{
        // Group unlocked coins by metal so the player can see what they can forge
        const grouped={};
        for(const c of coins){
          if(c.locked)continue;
          if(!grouped[c.metalIdx])grouped[c.metalIdx]=[];
          grouped[c.metalIdx].push(c);
        }
        const metalsWithEnough=Object.entries(grouped).filter(([,arr])=>arr.length>=5).map(([m])=>+m);
        return (
          <div className="animate-fadein">
            <div className="text-xs mb-3 italic px-0.5" style={mu}>Combine 5 coins of the same metal to forge an artefact. Higher rarity coins yield finer grades.</div>
            {coins.filter(c=>!c.locked).length<5?(
              <div className="px-[18px] py-6 text-center" style={card}>
                <div className="text-[34px] mb-2.5 opacity-50">✧</div>
                <div className="text-[15px] font-bold mb-1.5" style={FR}>Not enough coins</div>
                <div className="text-xs max-w-[260px] mx-auto leading-[1.5]" style={mu}>You need at least 5 unlocked coins of the same metal to forge.</div>
              </div>
            ):metalsWithEnough.length===0?(
              <div className="px-[18px] py-6 text-center" style={card}>
                <div className="text-[34px] mb-2.5 opacity-50">✧</div>
                <div className="text-[15px] font-bold mb-1.5" style={FR}>Spread too thin</div>
                <div className="text-xs max-w-[280px] mx-auto leading-[1.5]" style={mu}>You have unlocked coins, but no metal with 5 of the same kind yet. Keep hunting!</div>
              </div>
            ):(
              <div className="flex flex-col gap-2.5">
                {metalsWithEnough.map(metalIdx=>{
                  const m=METALS[metalIdx];
                  const arr=grouped[metalIdx];
                  const def=ARTEFACTS[metalIdx];
                  const baseCost=ARTEFACT_FORGE_COST[metalIdx];
                  const cost=Math.max(1,Math.round(baseCost*(1-(buff.forgeDiscount||0))));
                  const discounted=cost<baseCost;
                  const canAfford=marks>=cost;
                  return (
                    <div key={metalIdx} className="px-4 py-3.5" style={{ ...card, border:`1px solid ${m.eng}55` }}>
                      <div className="flex items-center justify-between gap-2.5 mb-2.5">
                        <div className="flex items-center gap-[11px] min-w-0 flex-1">
                          <div
                            className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                            style={{
                              background:isDark?`linear-gradient(135deg,${m.dark},${m.mid})`:`linear-gradient(135deg,${m.mid},${m.base})`,
                              border:`1px solid ${m.eng}88`,
                              color:m.hl,
                              fontFamily:"'Fraunces',serif",
                            }}>
                            {def.art?<img src={`/artefacts/${def.art}.webp`} alt={def.name} loading="lazy" className="w-full h-full object-cover"/>:def.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[15px] -tracking-[0.2px]" style={FR}>{def.name}</div>
                            <div className="text-[11px] italic mt-px" style={mu}>{m.name} · {arr.length} available</div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={()=>setShrinePicker({metalIdx,available:arr})}
                        disabled={!canAfford}
                        className="w-full py-2.5 rounded-lg text-[11px] font-extrabold uppercase tracking-[1.5px]"
                        style={{
                          ...F,
                          border:`1px solid ${canAfford?m.eng:t.border}`,
                          background:canAfford?`linear-gradient(135deg,${m.dark}80,${m.mid}90)`:t.surfaceHi,
                          cursor:canAfford?"pointer":"not-allowed",
                          color:canAfford?m.hl:t.muted,
                        }}>
                        {canAfford?`Forge · ◈ ${cost.toLocaleString()}${discounted?" ✦":""}`:`Need ◈ ${cost.toLocaleString()}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {shrineView==="collection"&&(
        <div className="animate-fadein">
          <div className="text-xs mb-3 italic px-0.5" style={mu}>Forged artefacts. Future updates will let these grant passive effects, unlock avatars, or summon companions.</div>
          {artefacts.length===0?(
            <div className="px-[18px] py-8 text-center" style={card}>
              <div className="text-[38px] mb-3 opacity-40">✧</div>
              <div className="text-[15px] font-bold mb-1.5" style={FR}>No artefacts yet</div>
              <div className="text-xs max-w-[260px] mx-auto leading-[1.5]" style={mu}>Visit the Forge tab here to combine coins into your first relic.</div>
            </div>
          ):(
            <div className="grid gap-[9px]" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))" }}>
              {artefacts.map(a=>{
                const m=METALS[a.metal];
                const def=ARTEFACTS[a.metal];
                const g=ARTEFACT_GRADES[a.grade]||ARTEFACT_GRADES[0];
                return (
                  <div
                    key={a.id}
                    className="text-center relative overflow-hidden flex flex-col"
                    style={{
                      ...card,
                      padding:0,
                      border:`1px solid ${g.color}55`,
                      borderTop:`2px solid ${g.color}`,
                      background:"#0a0604",
                      boxShadow:`0 0 0 1px ${g.color}22, 0 0 14px ${g.color}22`,
                    }}>
                    {def.art?(
                      <div className="w-full relative" style={{ aspectRatio:"280/254", background:`radial-gradient(ellipse at center,${m.dark}40,#000)` }}>
                        <img src={`/artefacts/${def.art}.webp`} alt={def.name} loading="lazy" className="w-full h-full object-cover block"/>
                      </div>
                    ):(
                      <div
                        className="w-full flex items-center justify-center text-[48px]"
                        style={{
                          aspectRatio:"280/254",
                          background:isDark?`radial-gradient(circle,${m.mid},${m.dark})`:`radial-gradient(circle,${m.base},${m.mid})`,
                          color:m.hl,
                          fontFamily:"'Fraunces',serif",
                          textShadow:`0 0 20px ${m.hl}88`,
                        }}>
                        {def.icon}
                      </div>
                    )}
                    <div
                      className="px-1.5 pt-2 pb-[9px]"
                      style={{ borderTop:`1px solid ${g.color}33`, background:"linear-gradient(to bottom,#15100d,#0a0604)" }}>
                      <div className="text-[11px] font-bold leading-[1.2] -tracking-[0.1px]" style={{ ...FR, color:"#e8d8a0" }}>{def.name}</div>
                      <div className="text-[7.5px] mt-[3px] font-extrabold tracking-[1.5px]" style={{ ...microLabel, color:g.color }}>{g.name}</div>
                      <div className="text-[7px] mt-px opacity-55" style={{ ...microLabel, color:m.hl }}>{m.name}</div>
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
