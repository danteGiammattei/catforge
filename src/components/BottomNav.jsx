import { useState } from "react";

/* ─── BOTTOM NAV ──────────────────────────────────────────────────────────
 * Seven-tab navigation pinned to the bottom edge with safe-area padding.
 *
 * Per-tab feedback: when a tab is tapped, an animKey for that tab updates,
 * which (a) replays the .tab-active-indicator slide via key remount, and
 * (b) triggers a navPop bounce on the icon. The active tab also gets a
 * scale lift, larger icon, and bolder label for stronger visual hierarchy.
 *
 * The hunt tab shows a pulsing success dot when a hunt is in progress —
 * lets the player navigate away and remember to come back. */
export default function BottomNav({ tab, setTab, huntActive, t }) {
  const items = [
    ["profile","☉","Profile"],
    ["social", "♟","Social"],
    ["vault",  "◈","Vault"],
    ["hunt",   "⛏","Hunt"],
    ["forge",  "⚒","Forge"],
    // Shrine hidden until the altar mechanic + artefact rework lands.
    // The Shrine route + screen + state still exist, just not navigable.
    // ["shrine", "✧","Shrine"],
    ["tavern", "♢","Tavern"],
  ];
  const [animKey, setAnimKey] = useState({});
  const handleTab = (id) => {
    if (id === tab) return;
    setAnimKey(k => ({ ...k, [id]: Date.now() }));
    setTab(id);
  };
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[90] flex justify-around pt-1 px-0.5 pb-2 backdrop-blur-xl"
      style={{
        background: t.nav,
        borderTop: `1px solid ${t.border}`,
        WebkitBackdropFilter: "blur(20px)",
        paddingBottom: `calc(8px + env(safe-area-inset-bottom,0px))`,
      }}>
      {items.map(([id, icon, lbl]) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => handleTab(id)}
            className="nav-btn relative flex flex-col items-center gap-[3px] px-1.5 pt-2.5 pb-1.5 border-none cursor-pointer bg-transparent min-w-[48px] flex-1 max-w-[80px]"
            style={{
              color: active ? t.accent : t.muted,
              transform: active ? "scale(1.04)" : "scale(1)",
            }}>
            {active && <div key={animKey[id] || id} className="tab-active-indicator" style={{ color: t.accent }}/>}
            {active && <div className="absolute rounded-[10px] pointer-events-none" style={{ inset: "4px 2px", background: `${t.accent}0d` }}/>}
            <span
              className="nav-icon leading-none relative"
              style={{
                fontSize: active ? 21 : 18,
                fontFamily: "'Fraunces',serif",
                fontWeight: active ? 900 : 600,
                animation: animKey[id] ? "navPop .35s cubic-bezier(.34,1.56,.64,1) forwards" : undefined,
              }}>
              {icon}
              {id === "hunt" && huntActive && (
                <span
                  className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full animate-flicker"
                  style={{ background: t.success, boxShadow: `0 0 8px ${t.success}` }}/>
              )}
            </span>
            <span
              className="font-sans uppercase tracking-[1.2px] transition-[font-size] duration-150"
              style={{
                fontSize: active ? 9 : 8.5,
                fontWeight: active ? 800 : 600,
              }}>{lbl}</span>
          </button>
        );
      })}
    </nav>
  );
}
