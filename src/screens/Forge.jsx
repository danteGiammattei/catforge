import { useState } from "react";
import { useGame } from "../lib/GameContext.js";
import PickaxeIcon from "../components/PickaxeIcon.jsx";

/* ─── FORGE ───────────────────────────────────────────────────────────────
 * Two switchable views — **Axe** and **Brush**. Each tab shows its piece of
 * equipment in a cosmic-eldritch panel (matching the gamble UI in the
 * tavern), followed by that equipment's existing upgrade row from the old
 * forge layout. The axe view also frames empty Charm + Handle Wrap slots
 * for the future loadout system.
 *
 * One renderUpgradeRow function is defined inside the component and called
 * with a per-equipment config so both tabs reuse the same row layout
 * (header, level pips, durability bar for the shovel, cost recipe,
 * forge button) without duplicating the JSX. */
export default function Forge() {
  const {
    coins, sacrificialCoins,
    shovelLevel, brushLevel, shovelDur, maxDur,
    setTab, setTavernView,
    forgeUp, canAfford,
    METALS, MAX_SH, MAX_BR, SHOVEL_UPS, BRUSH_UPS, SHOVEL_TIER_CAP,
    t, isDark, F, FR, mu, microLabel, card,
  } = useGame();
  const [forgeView, setForgeView] = useState("axe");

  // Eldritch palette — kept in lockstep with the tavern gamble views so the
  // tone reads as one continuous "otherworldly" aesthetic across screens.
  const E = {
    bg:"#08051c", bgPanel:"rgba(14,8,40,.65)",
    violet:"#7a4cff", violetHi:"#9a72ff",
    cyan:"#00e5ff", gold:"#f0c850",
    dread:"#ff3d6c", ink:"#e8e0ff", muted:"#8278b0",
    border:"rgba(122,76,255,.35)", borderHi:"rgba(0,229,255,.6)",
  };
  // Reusable cosmic-void panel style — multi-layer radial-gradient starfield
  // over a dark purple base, with violet/cyan glow border. Pure CSS.
  const eldritchPanelStyle = {
    background:
      "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,.6) 50%, transparent 51%), "+
      "radial-gradient(1px 1px at 78% 32%, rgba(180,200,255,.5) 50%, transparent 51%), "+
      "radial-gradient(1px 1px at 41% 67%, rgba(220,180,255,.6) 50%, transparent 51%), "+
      "radial-gradient(1px 1px at 86% 81%, rgba(255,200,220,.4) 50%, transparent 51%), "+
      "radial-gradient(2px 2px at 60% 12%, rgba(255,255,255,.3) 50%, transparent 51%), "+
      "radial-gradient(ellipse at 50% 50%, rgba(40,20,80,.4), rgba(8,5,28,.95) 70%), "+
      E.bg,
    border:`1px solid ${E.border}`,
    boxShadow:`0 0 24px rgba(122,76,255,.18), inset 0 0 32px rgba(0,229,255,.04)`,
    position:"relative", overflow:"hidden",
    borderRadius:14,
  };

  // Equipment-specific upgrade-row config. Same shape both rows take in the
  // old layout, just split per tab now.
  const shovelConfig = { type:"shovel", icon:"⛏", label:"Axe", level:shovelLevel, max:MAX_SH, ups:SHOVEL_UPS, stat:"Unlocks up to", statV:l=>METALS[SHOVEL_TIER_CAP[Math.min(l-1,SHOVEL_TIER_CAP.length-1)]]?.name??"Copper" };
  const brushConfig  = { type:"brush",  icon:"🖌️", label:"Brush", level:brushLevel, max:MAX_BR, ups:BRUSH_UPS, stat:"Shiny chance", statV:l=>`${Math.round((BRUSH_UPS[l]?.shinyChance??0.01)*100)}%` };

  /* Renders one full upgrade row (header + body) for a given config. Pulled
     out of the JSX so the Axe and Brush tabs can each render their own
     instance without duplicating ~100 lines of layout. */
  const renderUpgradeRow = ({type,icon,label,level:lv,max,ups,stat,statV}) => {
    const nl=lv+1;
    const nu=nl<=max?ups[nl]:null;
    const maxed=lv>=max;
    const afford=nu&&canAfford(nu.cost);
    return (
      <div key={type} className="overflow-hidden" style={card}>
        {/* Row header — icon + name + level pip strip */}
        <div className="px-[17px] py-[15px] flex justify-between items-center" style={{ borderBottom:`1px solid ${t.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[22px]"
              style={{
                background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,
                border:`1px solid ${t.borderHi}`,
                boxShadow:`inset 0 1px 0 rgba(255,255,255,.05)`,
              }}>
              {type==="shovel"?<PickaxeIcon level={lv} size={32}/>:icon}
            </div>
            <div>
              <div className="font-bold text-[15px] -tracking-[0.2px]" style={{ ...FR, color:t.text }}>{label}</div>
              <div className="text-[11px]" style={mu}>{ups[lv]?.label??`Lv.${lv} Base`}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-extrabold text-[22px] -tracking-[1px] leading-none" style={{ ...FR, color:t.accent }}>Lv.{lv}</div>
            <div className="flex gap-[3px] mt-[5px] justify-end">
              {Array.from({length:max},(_,i)=>(
                <div key={i} className="w-2.5 h-1 rounded-sm" style={{ background:i<lv?t.accent:t.faint, boxShadow:i<lv?`0 0 4px ${t.accent}66`:"none" }}/>
              ))}
            </div>
          </div>
        </div>

        {/* Row body — durability (shovel only) + cost recipe + forge button */}
        <div className="px-[17px] py-[13px]">
          {type==="shovel"&&(()=>{
            const durPct=Math.round((shovelDur/maxDur)*100);
            const durColor=durPct>50?t.success:durPct>20?t.accent:t.danger;
            return (
              <div className="mb-3 px-3 py-2.5 rounded-lg" style={{ background:t.surfaceHi, border:`1px solid ${t.border}` }}>
                <div className="flex justify-between items-center mb-1.5 text-[11px]" style={F}>
                  <span className="uppercase tracking-[1.5px] font-bold" style={{ color:t.muted }}>Durability</span>
                  <span className="font-extrabold tabular-nums" style={{ color:durColor }}>{shovelDur} / {maxDur}</span>
                </div>
                <div className="h-1.5 rounded-[3px] overflow-hidden" style={{ background:t.faint, border:`1px solid ${t.border}` }}>
                  <div className="h-full transition-[width] duration-[400ms]" style={{ width:`${durPct}%`, background:`linear-gradient(to right,${durColor}88,${durColor})`, boxShadow:`0 0 6px ${durColor}66` }}/>
                </div>
                {shovelDur<maxDur&&(
                  <button
                    onClick={()=>{ setTab("tavern"); setTavernView("repair"); }}
                    className="mt-2 w-full py-[7px] rounded-[7px] text-[10px] font-bold uppercase tracking-[2px] cursor-pointer"
                    style={{ ...F, border:`1px solid ${t.border}`, background:"transparent", color:t.textDim }}>
                    ⚒ Repair in Tavern
                  </button>
                )}
              </div>
            );
          })()}

          <div className="flex justify-between mb-2.5 text-xs items-baseline" style={F}>
            <span className="tracking-[0.5px]" style={{ color:t.muted }}>{stat}</span>
            <span className="font-bold text-sm italic" style={{ ...FR, color:t.text }}>{statV(lv)}</span>
          </div>

          {maxed?(
            <div className="text-center text-[13px] font-extrabold py-2 uppercase tracking-[3px]" style={{ ...F, color:t.accent }}>✦ Fully Forged</div>
          ):(
            nu?(
              <>
                <div className="text-xs mb-2.5 font-medium" style={{ ...F, color:t.textDim }}>
                  <span style={{ color:t.muted }}>→</span> {nu.label}
                  <span className="font-normal ml-1.5 italic" style={{ color:t.muted }}>· {nu.desc}</span>
                </div>
                <div className="flex gap-1.5 mb-[11px] flex-wrap">
                  {(nu.cost||[]).map(({m:mi,n},ci)=>{
                    const mt=METALS[mi];
                    const have=sacrificialCoins.filter(c=>c.metalIdx===mi).length;
                    const ok=have>=n;
                    return (
                      <div key={ci} className="flex items-center gap-1.5 px-[11px] py-1.5 rounded-[7px]"
                        style={{
                          background:ok?`${mt.dark}44`:t.surfaceHi,
                          border:`1px solid ${ok?mt.eng+"66":t.border}`,
                        }}>
                        <div className="w-[7px] h-[7px] rounded-sm" style={{ background:ok?mt.hl:t.muted, boxShadow:ok?`0 0 4px ${mt.hl}88`:"none" }}/>
                        <span className="text-xs font-bold tabular-nums" style={{ ...F, color:ok?mt.hl:t.muted }}>{n}× {mt.name}</span>
                        <span className="text-[10px] font-semibold opacity-80" style={{ ...F, color:ok?t.success:t.muted }}>({have})</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={()=>forgeUp(type)}
                  disabled={!afford}
                  className="w-full py-[11px] rounded-[10px] text-[13px] font-extrabold uppercase tracking-[2px] transition-all duration-150"
                  style={{
                    ...F,
                    border:`1px solid ${afford?t.accentDim:t.border}`,
                    cursor:afford?"pointer":"not-allowed",
                    background:afford?(isDark?"linear-gradient(135deg,#2a1e08,#604a14)":"linear-gradient(135deg,#ede0b0,#d4a830)"):t.surfaceHi,
                    color:afford?(isDark?t.accent:t.accentInk):t.muted,
                    boxShadow:afford?`0 4px 12px ${t.accent}22`:"none",
                  }}>
                  {afford?"⚒ Forge · +200 XP":"Missing materials"}
                </button>
              </>
            ):(
              <div className="text-xs py-2 text-center italic" style={mu}>Forge to unlock upgrades</div>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fadein">
      {/* Tab picker — Axe / Brush */}
      <div className="flex gap-1.5 p-1 rounded-[10px] mb-3.5"
           style={{ background:E.bgPanel, border:`1px solid ${E.border}` }}>
        {[["axe","⚒","Axe"],["brush","🖌","Brush"]].map(([id,ic,lbl])=>{
          const active=forgeView===id;
          return (
            <button key={id}
              onClick={()=>setForgeView(id)}
              className="flex-1 py-2 rounded-md border-none cursor-pointer text-[11px] font-bold uppercase tracking-[1.5px] transition-all flex items-center justify-center gap-1.5"
              style={{
                ...F,
                background:active?`linear-gradient(135deg,${E.violet},${E.cyan})`:"transparent",
                color:active?"#08051c":E.muted,
                boxShadow: active ? `0 0 16px ${E.violet}88` : "none",
              }}>
              <span style={{ fontSize:16, color:active?"#08051c":E.cyan }}>{ic}</span>{lbl}
            </button>
          );
        })}
      </div>

      {/* Available coins ledger — same content as before, shown on both
          tabs since it's relevant to both upgrade paths. */}
      {coins.length>0&&(
        <div className="px-3.5 py-[11px] mb-3.5 flex gap-3 flex-wrap items-center" style={card}>
          <span className="text-[10px]" style={microLabel}>Available</span>
          {METALS.map((m,i)=>{
            const have=sacrificialCoins.filter(c=>c.metalIdx===i).length;
            const lockedCnt=coins.filter(c=>c.metalIdx===i&&c.locked).length;
            return (have>0||lockedCnt>0)&&(
              <div key={i} className="flex items-center gap-[5px]">
                <div className="w-2 h-2 rounded-sm" style={{ background:m.hl, boxShadow:`0 0 4px ${m.hl}66` }}/>
                <span className="text-[11px] font-bold tabular-nums" style={{ ...F, color:m.hl }}>
                  {have}
                  {lockedCnt>0&&<span className="font-medium text-[10px]" style={{ color:t.muted }}> +{lockedCnt}🔒</span>}
                  <span className="font-medium ml-0.5" style={{ color:t.muted }}>×</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── AXE VIEW ──────────────────────────────────────────────────
          Eldritch panel with empty Charm + Wrap slots + the centred axe
          (using PickaxeIcon which exists in the project), followed by the
          shovel upgrade row reusing the existing forge-cost mechanic. */}
      {forgeView==="axe"&&(
        <div className="animate-fadein flex flex-col gap-4">
          <div className="flex flex-col items-center gap-5 py-8" style={eldritchPanelStyle}>
            <div style={{...FR, fontSize:22, color:E.violetHi, letterSpacing:".5px"}}>The Axe</div>
            <div style={{...F, fontSize:11, color:E.muted, letterSpacing:1.5, textTransform:"uppercase", textAlign:"center", maxWidth:280}}>
              Channel charms · bind sigils · ascend your tool
            </div>

            <div className="flex flex-col items-center gap-3 mt-1">
              {/* Charm slot — empty */}
              <div className="flex flex-col items-center gap-1.5">
                <div style={{...F, fontSize:10, color:E.cyan, letterSpacing:2, textTransform:"uppercase"}}>Charm</div>
                <div style={{
                  width:72, height:72, borderRadius:"50%",
                  border:`2px dashed ${E.border}`,
                  background:`radial-gradient(circle, ${E.violet}22, transparent 70%)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:E.muted, fontSize:26,
                }}>+</div>
              </div>

              {/* Axe centre */}
              <div style={{
                padding:18, borderRadius:14,
                background:`radial-gradient(circle, ${E.violet}33, transparent 70%)`,
                filter:`drop-shadow(0 0 18px ${E.cyan}66)`,
              }}>
                <PickaxeIcon size={110} color={E.cyan} dur={shovelDur} maxDur={maxDur}/>
              </div>

              {/* Wrap slot — empty */}
              <div className="flex flex-col items-center gap-1.5">
                <div style={{...F, fontSize:10, color:E.cyan, letterSpacing:2, textTransform:"uppercase"}}>Handle Wrap</div>
                <div style={{
                  width:72, height:32, borderRadius:6,
                  border:`2px dashed ${E.border}`,
                  background:`linear-gradient(90deg, ${E.violet}22, transparent, ${E.violet}22)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:E.muted, fontSize:24,
                }}>+</div>
              </div>
            </div>

            <div className="px-5 py-3 mt-2 rounded-md text-center"
                 style={{ background:"rgba(20,12,40,.6)", border:`1px solid ${E.border}`, maxWidth:320 }}>
              <div style={{...FR, fontSize:13, color:E.violetHi, marginBottom:6}}>Slots — Coming Soon</div>
              <div style={{...F, fontSize:11, color:E.muted, lineHeight:1.6}}>
                Charms slot into the axehead for passive effects. Handle wraps add active or conditional bonuses.
              </div>
            </div>
          </div>

          {/* Axe upgrade row */}
          {renderUpgradeRow(shovelConfig)}
        </div>
      )}

      {/* ─── BRUSH VIEW ─────────────────────────────────────────────────
          Mirrors the axe view: cosmic eldritch panel up top with the brush
          framed in glow, followed by the brush upgrade row from the
          original forge layout. Brush has no slots planned yet, so it just
          shows the brush with its current bristle/handle stats. */}
      {forgeView==="brush"&&(
        <div className="animate-fadein flex flex-col gap-4">
          <div className="flex flex-col items-center gap-5 py-8" style={eldritchPanelStyle}>
            <div style={{...FR, fontSize:22, color:E.violetHi, letterSpacing:".5px"}}>The Brush</div>
            <div style={{...F, fontSize:11, color:E.muted, letterSpacing:1.5, textTransform:"uppercase", textAlign:"center", maxWidth:280}}>
              Sweep dust · reveal shimmer · awaken metal
            </div>

            {/* Brush centre — emoji stand-in until a custom pixel-art
                brush icon ships. Same glow framing as the axe so the
                two tabs feel like a matched pair. */}
            <div style={{
              padding:18, borderRadius:14,
              background:`radial-gradient(circle, ${E.violet}33, transparent 70%)`,
              filter:`drop-shadow(0 0 18px ${E.cyan}66)`,
              fontSize:88, lineHeight:1,
            }}>
              🖌️
            </div>

            {/* Current brush label */}
            <div className="text-center">
              <div style={{...FR, fontSize:16, color:E.ink, letterSpacing:".3px"}}>
                {BRUSH_UPS[brushLevel]?.label ?? "Rough Brush"}
              </div>
              <div style={{...F, fontSize:11, color:E.muted, letterSpacing:1.5, textTransform:"uppercase", marginTop:4}}>
                {Math.round((BRUSH_UPS[brushLevel]?.shinyChance??0.01)*100)}% shiny chance
              </div>
            </div>

            <div className="px-5 py-3 mt-2 rounded-md text-center"
                 style={{ background:"rgba(20,12,40,.6)", border:`1px solid ${E.border}`, maxWidth:320 }}>
              <div style={{...FR, fontSize:13, color:E.violetHi, marginBottom:6}}>The Brush Awakens</div>
              <div style={{...F, fontSize:11, color:E.muted, lineHeight:1.6}}>
                Forge to higher bristles for greater shiny chance. The Void Brush at the top of the path catches shimmer no mortal hand could.
              </div>
            </div>
          </div>

          {/* Brush upgrade row */}
          {renderUpgradeRow(brushConfig)}
        </div>
      )}
    </div>
  );
}
