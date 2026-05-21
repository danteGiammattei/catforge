import { useGame } from "../lib/GameContext.js";
import { coinRarity } from "../lib/coin.js";
import CoinCanvas from "../components/CoinCanvas.jsx";

/* ─── VAULT ───────────────────────────────────────────────────────────────
 * Grid of all owned coins, with metal-tier filter pills and a select-mode
 * for bulk operations. Pinned coins (manually pinned or auto-top by rarity)
 * get a metal-toned background gradient.
 *
 * Interactions:
 *  - Click          → open CoinModal
 *  - Double-tap     → toggle pin
 *  - Select mode    → multi-select for bulk-sell (skips locked)
 *
 * State + actions come entirely from GameContext; this component is a pure
 * view layer.
 *
 * STYLING NOTES (Tailwind migration):
 *  - Static layout/typography → Tailwind classes (flex, gap, font-*, etc.)
 *  - Theme-token colors      → still via inline `t.X` for now (mixed-mode)
 *  - Dynamic per-metal/rarity colors → inline style (the true variables)
 *  - One-off arbitrary values → Tailwind arbitrary syntax `text-[11px]`
 *  - Animations              → Tailwind animation utilities (animate-fadein)
 */
export default function Vault() {
  const {
    coins, filter, pinnedIds,
    selectMode, selectedIds, selectedTotal, visCoins, autoTop,
    setSelectMode, setSelectedIds, setFilter, setSelectedCoin, setTab,
    togglePin, bulkSell,
    METALS, RARITIES,
    t, F, VT, FR, mu, microLabel, sectionTitle, card, isDark,
  } = useGame();
  return (
    <div className="animate-fadein">
      {/* Header bar — title + count + select toggle */}
      <div className="flex items-baseline justify-between mb-3.5 px-0.5 gap-2">
        <div style={sectionTitle}>The Vault</div>
        <div className="flex items-center gap-2">
          <div style={microLabel}>{coins.length} {coins.length===1?"coin":"coins"}</div>
          {coins.length>0&&(
            <button
              onClick={()=>{setSelectMode(s=>!s);setSelectedIds(new Set());}}
              className="px-2.5 py-1 rounded-md cursor-pointer text-[10px] font-bold uppercase tracking-[1.5px] transition-all duration-150"
              style={{
                fontFamily:"Outfit,sans-serif",
                border:`1px solid ${selectMode?t.accent:t.border}`,
                background:selectMode?`${t.accent}22`:t.surface,
                color:selectMode?t.accent:t.muted,
              }}>
              {selectMode?"Cancel":"Select"}
            </button>
          )}
        </div>
      </div>
      {coins.length===0?(
        // Empty-state card
        <div className="text-center px-5 py-14" style={card}>
          <div className="text-[54px] mb-3.5 opacity-50" style={{filter:"drop-shadow(0 4px 8px rgba(0,0,0,.3))"}}>⛏</div>
          <div className="font-bold text-[19px] mb-2 -tracking-[0.3px]" style={{fontFamily:"'Fraunces',serif"}}>The Vault is empty</div>
          <div className="max-w-[260px] mx-auto leading-[1.55]" style={mu}>Visit the Hunt to unearth your first coin from the soil of forgotten ages.</div>
          <button
            onClick={()=>setTab("hunt")}
            className="mt-[18px] px-[26px] py-2.5 rounded-[10px] cursor-pointer text-xs font-bold uppercase tracking-[2px]"
            style={{
              fontFamily:"Outfit,sans-serif",
              border:`1px solid ${t.borderHi}`,
              background:`${t.accent}22`,
              color:t.accent,
            }}>
            Begin Hunting →
          </button>
        </div>
      ):(
        <>
          {/* Metal-tier filter pills */}
          <div className="flex gap-1.5 flex-wrap mb-3.5 items-center">
            {[[-1,"All",coins.length],...METALS.map((m,i)=>[i,m.name,coins.filter(c=>c.metalIdx===i).length]).filter(x=>x[2]>0)].map(([idx,lbl,cnt])=>{
              const active=filter===idx;
              const mt=idx>=0?METALS[idx]:null;
              return (
                <button
                  key={idx}
                  onClick={()=>setFilter(idx)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150 tracking-[0.5px]"
                  style={{
                    fontFamily:"Outfit,sans-serif",
                    border:`1px solid ${active?(mt?.eng||t.accent):t.border}`,
                    background:active?(mt?`${mt.dark}55`:t.surfaceHi):"transparent",
                    color:active?(mt?.hl||t.accent):t.muted,
                  }}>
                  {lbl}
                  <span className="ml-1 opacity-65 font-medium tabular-nums">{cnt}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] mb-2.5 italic" style={mu}>Tap to inspect · double-tap to pin</div>
          <div className="grid grid-cols-3 gap-[9px]">
            {visCoins.map(coin=>{
              const m=METALS[coin.metalIdx];
              const r=RARITIES[coinRarity(coin)];
              const pinned=pinnedIds?pinnedIds.includes(coin.id):autoTop.some(c=>c.id===coin.id);
              const isSel=selectedIds.has(coin.id);
              return (
                <div
                  key={coin.id}
                  className={`text-center cursor-pointer relative${coin.shiny?" shiny-card":""}`}
                  style={{
                    ...card,
                    padding:"13px 8px 10px",
                    border:`1px solid ${isSel?t.accent:pinned?m.eng+"66":t.border}`,
                    borderTop:`2px solid ${isSel?t.accent:r.color}`,
                    background:isSel?`${t.accent}11`:pinned?(isDark?`linear-gradient(160deg,${m.dark}30,${t.surface})`:t.surface):t.surface,
                    transition:"transform .18s, border-color .18s, background .15s",
                    boxShadow:isSel?`0 0 0 2px ${t.accent}55`:r.id>=3?`0 0 0 1px ${r.color}33`:"none",
                    opacity:selectMode&&coin.locked?0.45:1,
                  }}
                  onMouseEnter={e=>{if(!selectMode){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=m.eng;e.currentTarget.style.borderTopColor=r.color;}}}
                  onMouseLeave={e=>{if(!selectMode){e.currentTarget.style.transform="";e.currentTarget.style.borderColor=pinned?m.eng+"66":t.border;e.currentTarget.style.borderTopColor=r.color;}}}
                  onClick={e=>{
                    // Select mode: toggle selection (skips locked coins)
                    if(selectMode){
                      if(coin.locked)return;
                      setSelectedIds(prev=>{
                        const next=new Set(prev);
                        if(next.has(coin.id))next.delete(coin.id);
                        else next.add(coin.id);
                        return next;
                      });
                      return;
                    }
                    // Normal: double-tap pins, single-tap opens detail
                    const now=Date.now();
                    const last=e.currentTarget._lastTap||0;
                    if(now-last<350){
                      clearTimeout(e.currentTarget._tapT);
                      e.currentTarget._lastTap=0;
                      togglePin(coin.id);
                    }else{
                      e.currentTarget._lastTap=now;
                      const target=e.currentTarget;
                      e.currentTarget._tapT=setTimeout(()=>{
                        target._lastTap=0;
                        setSelectedCoin(coin);
                      },280);
                    }
                  }}>
                  {coin.shiny&&<div className="shiny-aura"/>}
                  {coin.metalIdx>=7&&<div className={`ambient-particles ${coin.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
                  {pinned&&!isSel&&<div className="absolute top-[7px] right-[7px] w-1.5 h-1.5 rounded-full" style={{background:m.hl,boxShadow:`0 0 6px ${m.hl}`}}/>}
                  {isSel&&<div className="absolute top-[5px] right-[5px] w-[18px] h-[18px] rounded-full text-[11px] font-black flex items-center justify-center z-[3]" style={{background:t.accent,color:t.accentInk,fontFamily:"Outfit,sans-serif",boxShadow:`0 0 8px ${t.accent}88`}}>✓</div>}
                  {coin.shiny&&<div className="absolute top-1.5 left-[7px] text-[10px]" style={{color:"#ffe060",textShadow:"0 0 6px #ffe06088"}}>✦</div>}
                  {coin.locked&&<div className="absolute bottom-1.5 right-[7px] text-[10px] opacity-85" style={{filter:"drop-shadow(0 0 4px rgba(0,0,0,.6))"}}>🔒</div>}
                  <div className="flex justify-center mb-[7px]"><CoinCanvas coin={coin} size={64}/></div>
                  <div className="text-[14px] tracking-[3px] leading-[1.1]" style={{fontFamily:"VT323,monospace",color:m.hl}}>{coin.runes}</div>
                  <div className="text-[7.5px] mt-[3px] font-bold opacity-85 uppercase tracking-[2.5px]" style={{fontFamily:"Outfit,sans-serif",color:r.color}}>{r.name}</div>
                  <div className="text-[7px] mt-[1px] opacity-45 uppercase tracking-[2.5px] font-bold" style={{fontFamily:"Outfit,sans-serif",color:m.hl}}>{m.name}{coin.shiny?" ✦":""}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {/* Bulk-sell action bar — appears when in select mode with at least one selection */}
      {selectMode&&selectedIds.size>0&&(
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] animate-fadein"
          style={{
            bottom:"calc(82px + env(safe-area-inset-bottom,0px))",
            background:t.surface,
            border:`1px solid ${t.borderHi}`,
            boxShadow:"0 8px 28px rgba(0,0,0,.5)",
            maxWidth:"calc(100vw - 24px)",
          }}>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[1.5px]" style={{fontFamily:"Outfit,sans-serif",color:t.muted}}>{selectedTotal.sellable} selected</div>
            <div className="text-[14px] font-extrabold tracking-[0.5px] tabular-nums" style={{fontFamily:"Outfit,sans-serif",color:t.accent}}>◈ {selectedTotal.total.toLocaleString()}</div>
            {selectedTotal.locked>0&&<div className="text-[9px] mt-px italic" style={mu}>{selectedTotal.locked} locked · skipped</div>}
          </div>
          <button
            onClick={()=>{if(confirm(`Sell ${selectedTotal.sellable} coin${selectedTotal.sellable===1?"":"s"} for ◈${selectedTotal.total.toLocaleString()}?`))bulkSell();}}
            disabled={selectedTotal.sellable===0}
            className="px-[18px] py-2.5 rounded-[10px] text-[12px] font-extrabold uppercase tracking-[1.5px] whitespace-nowrap"
            style={{
              fontFamily:"Outfit,sans-serif",
              border:`1px solid ${t.accent}`,
              background:`linear-gradient(135deg,${t.accentHi},${t.accent})`,
              cursor:selectedTotal.sellable?"pointer":"not-allowed",
              opacity:selectedTotal.sellable?1:0.5,
              color:t.accentInk,
            }}>
            Sell All
          </button>
        </div>
      )}
    </div>
  );
}
