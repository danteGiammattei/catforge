import { useState, useRef, useEffect, useCallback } from "react";
import { useGame } from "../lib/GameContext.js";
import { mkCoin, newSeed, lvl } from "../lib/coin.js";
import { rollOreMetal } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import CatSprite, { CAT_FRAMES } from "../components/CatSprite.jsx";

/* ─── IDLE FIELD ───────────────────────────────────────────────────────────
 * Cats & Soup-style cosy idle layout. Pastel green grass, several stations
 * dotted around, each with a cat working at it. Tap a station to start a
 * mining cycle — cat goes "working", a coin pops out at the end and gets
 * persisted to the player's vault.
 *
 * Each STATION is a circular island on the grass with:
 *   - a station "fixture" (mine pile, cauldron, anvil etc.)
 *   - a cat sprite that animates between idle ↔ working
 *   - a banner above it showing its level + cycle progress
 *
 * The cycle is driven entirely by walltime stored in fieldState so it
 * survives reloads. Each station has a `nextReadyAt` timestamp; when
 * Date.now() >= nextReadyAt the station shows a "ready" pulse and the
 * player taps to claim. Tapping rolls a coin, persists it, and schedules
 * the next ready time. So even closing the tab is fine — the timer
 * already elapsed, the player just claims when they come back.
 * ────────────────────────────────────────────────────────────────────── */

// One full cycle of "working" before the coin is ready. Short for the demo.
const CYCLE_MS = 6000;
// Visual mining state duration when actively claiming
const PRESENT_MS = 1200;

// Pastel palette inspired by Cats & Soup — bright green grass, cream banners
const P = {
  skyTop:     "#bee8da",
  skyBottom:  "#dff2d6",
  grassTop:   "#a8d99c",
  grassMid:   "#8fc784",
  grassDark:  "#7ab36e",
  grassDot:   "#6a9e5d",
  pathSoil:   "#c6a878",
  pathStone:  "#dec99e",
  cream:      "#fff8e7",
  banner:     "#fef3d9",
  bannerEdge: "#c9a86a",
  text:       "#4a3a26",
  textMute:   "#7a6850",
  accent:     "#e88a4f",
  shadow:     "rgba(80,60,30,0.18)",
};

// Default station layout — positions are in % of viewport, so it scales
// across phone/desktop. Each station spawns a coin family weighted by metalBias.
const DEFAULT_STATIONS = [
  {
    id: "mine",
    name: "Copper Mine",
    icon: "⛏",
    x: 30, y: 36,
    // Bias roll toward lower-tier metals — this is the starter station.
    metalBias: 0,
  },
  {
    id: "forge",
    name: "Iron Forge",
    icon: "🔥",
    x: 68, y: 50,
    metalBias: 2,
  },
  {
    id: "bench",
    name: "Workbench",
    icon: "🛠",
    x: 40, y: 70,
    metalBias: 1,
  },
];

export default function IdleField() {
  const { xp, coins, commitCoin, fieldState, setFieldState } = useGame();
  const playerLevel = lvl(xp);

  // Initialise stations on first mount if fieldState is empty.
  // Stations live in fieldState so they persist across reloads.
  const stations = fieldState?.stations || DEFAULT_STATIONS.map(s => ({
    ...s, level: 1, nextReadyAt: Date.now() + CYCLE_MS,
  }));
  useEffect(() => {
    if (!fieldState?.stations) {
      setFieldState(prev => ({
        ...prev,
        stations: DEFAULT_STATIONS.map(s => ({
          ...s, level: 1, nextReadyAt: Date.now() + CYCLE_MS,
        })),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render every 250ms so progress bars + ready states update visually.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Per-station "presenting" state — the brief flourish after claiming
  // where a coin floats up and into the recent tray.
  const [presenting, setPresenting] = useState({}); // { stationId: {coin, until} }
  const presentTimers = useRef({});

  const claimStation = useCallback((stationId) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;
    if (Date.now() < station.nextReadyAt) return;

    // Roll a coin: metal weighted around station.metalBias ± 1.
    const bias = station.metalBias || 0;
    const rolled = rollOreMetal(Math.random());
    // Bias the result: blend the random roll toward station.metalBias.
    const metalIdx = Math.max(0, Math.min(8, Math.round((rolled + bias * 2) / 3)));
    const coin = mkCoin(newSeed(), playerLevel, metalIdx);

    // Persist to vault.
    commitCoin(coin, station.id);

    // Show presenting flourish.
    setPresenting(p => ({ ...p, [stationId]: { coin, until: Date.now() + PRESENT_MS } }));
    clearTimeout(presentTimers.current[stationId]);
    presentTimers.current[stationId] = setTimeout(() => {
      setPresenting(p => { const n = { ...p }; delete n[stationId]; return n; });
    }, PRESENT_MS);

    // Reset next-ready timer.
    setFieldState(prev => ({
      ...prev,
      stations: (prev?.stations || stations).map(s =>
        s.id === stationId ? { ...s, nextReadyAt: Date.now() + CYCLE_MS } : s
      ),
    }));
  }, [stations, playerLevel, commitCoin, setFieldState]);

  // Recent coins panel — pull the last 5 from coins[] which is already
  // ordered newest-first.
  const recentCoins = coins.slice(0, 5);

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      // Sky → grass split. The horizon sits at ~22% so most of the view
      // is grass — gives that overhead "looking down at a meadow" feel.
      background: `linear-gradient(180deg, ${P.skyTop} 0%, ${P.skyBottom} 18%, ${P.grassTop} 22%, ${P.grassMid} 60%, ${P.grassDark} 100%)`,
    }}>

      {/* Grass texture — repeating soft dots simulating grass tufts */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle, ${P.grassDot} 1.2px, transparent 1.5px)`,
        backgroundSize: "18px 18px",
        opacity: 0.35,
        mixBlendMode: "multiply",
        pointerEvents: "none",
      }}/>

      {/* Soft cloud band at the top for a bit of depth */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "20%",
        background: `linear-gradient(180deg, rgba(255,255,255,0.4), transparent)`,
        pointerEvents: "none",
      }}/>

      {/* ── STATIONS ── */}
      {stations.map(station => {
        const now = Date.now();
        const ready = now >= station.nextReadyAt;
        const cycleStart = station.nextReadyAt - CYCLE_MS;
        const progress = ready ? 1 : Math.max(0, (now - cycleStart) / CYCLE_MS);
        const pres = presenting[station.id];
        return (
          <Station
            key={station.id}
            station={station}
            ready={ready}
            progress={progress}
            presentingCoin={pres?.coin}
            onClaim={() => claimStation(station.id)}
          />
        );
      })}

      {/* ── RECENT FINDS TRAY (bottom) ── */}
      <div style={{
        position: "absolute", left: "50%", bottom: 14,
        transform: "translateX(-50%)",
        display: "flex", gap: 8, padding: "8px 14px",
        background: "rgba(255,255,255,0.78)",
        border: `2px solid ${P.bannerEdge}`,
        borderRadius: 14,
        boxShadow: `0 4px 16px ${P.shadow}`,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        minWidth: 220, justifyContent: "center", alignItems: "center",
      }}>
        <div style={{
          fontFamily: "'Fraunces',serif", fontWeight: 800,
          fontSize: 12, color: P.textMute, letterSpacing: 0.5,
          marginRight: 4,
        }}>RECENT</div>
        {recentCoins.length === 0
          ? <div style={{ fontFamily: "'Fraunces',serif", fontStyle: "italic",
                          fontSize: 12, color: P.textMute }}>no coins yet</div>
          : recentCoins.map(c => (
              <div key={c.id} style={{
                width: 32, height: 32, borderRadius: "50%",
                boxShadow: `0 2px 4px ${P.shadow}`,
                background: "rgba(255,255,255,0.5)",
              }}>
                <CoinCanvas coin={c} size={32}/>
              </div>
            ))
        }
      </div>

      {/* Level + coin count, top-right pill */}
      <div style={{
        position: "absolute", top: 14, right: 14,
        background: P.banner, border: `2px solid ${P.bannerEdge}`,
        borderRadius: 18, padding: "6px 14px",
        fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 13,
        color: P.text, letterSpacing: 0.3,
        boxShadow: `0 3px 10px ${P.shadow}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span>Lv {playerLevel}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{coins.length} {coins.length === 1 ? "coin" : "coins"}</span>
      </div>
    </div>
  );
}

/* ─── STATION ─────────────────────────────────────────────────────────────
 * A single dirt island with a workstation fixture, a cat, a level banner,
 * and a "ready to claim" pulse. Layout is pseudo-3D using transforms — the
 * island itself is an oval (perspective foreshortening) and the cat/icon
 * sit on top with a slight Y-offset for a sense of standing on it. */
function Station({ station, ready, progress, presentingCoin, onClaim }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={ready ? onClaim : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        left: `${station.x}%`, top: `${station.y}%`,
        transform: "translate(-50%, -50%)",
        width: 130, height: 110,
        cursor: ready ? "pointer" : "default",
        transition: "transform .15s ease",
        ...(hover && ready ? { transform: "translate(-50%, -52%) scale(1.03)" } : {}),
      }}
    >
      {/* Dirt island — oval beneath the station */}
      <div style={{
        position: "absolute", left: "50%", bottom: 8,
        transform: "translateX(-50%)",
        width: 110, height: 48,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at 50% 35%, ${P.pathStone}, ${P.pathSoil})`,
        boxShadow: `inset 0 -4px 8px ${P.shadow}, 0 4px 12px ${P.shadow}`,
      }}/>

      {/* Ready-pulse ring (only when station is ready to claim) */}
      {ready && (
        <div style={{
          position: "absolute", left: "50%", bottom: 8,
          transform: "translateX(-50%)",
          width: 120, height: 56,
          borderRadius: "50%",
          border: `3px solid ${P.accent}`,
          opacity: 0.7,
          animation: "stationPulse 1.4s ease-in-out infinite",
          pointerEvents: "none",
        }}/>
      )}

      {/* Cat sprite — sits on the left of the island */}
      <div style={{
        position: "absolute", left: 14, bottom: 18,
        filter: `drop-shadow(0 2px 2px ${P.shadow})`,
      }}>
        <CatSprite
          frames={ready ? CAT_FRAMES.idle : CAT_FRAMES.working}
          size={40}
          fps={ready ? 3 : 6}
        />
      </div>

      {/* Station icon — sits on the right of the island */}
      <div style={{
        position: "absolute", right: 16, bottom: 24,
        width: 38, height: 38,
        borderRadius: 9,
        background: `linear-gradient(160deg, ${P.cream}, ${P.banner})`,
        border: `2px solid ${P.bannerEdge}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, lineHeight: 1,
        boxShadow: `0 3px 8px ${P.shadow}`,
        filter: ready ? "saturate(1.1)" : "saturate(0.85) brightness(0.96)",
        transition: "filter .3s",
      }}>{station.icon}</div>

      {/* Level banner above the station */}
      <div style={{
        position: "absolute", top: -6, left: "50%",
        transform: "translateX(-50%)",
        background: P.banner, border: `2px solid ${P.bannerEdge}`,
        borderRadius: 7,
        padding: "3px 10px",
        fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 11,
        color: P.text, letterSpacing: 0.5, whiteSpace: "nowrap",
        boxShadow: `0 2px 5px ${P.shadow}`,
      }}>
        LV. {station.level || 1}
      </div>

      {/* Progress bar at the bottom of the island */}
      {!ready && (
        <div style={{
          position: "absolute", left: "50%", bottom: 0,
          transform: "translateX(-50%)",
          width: 70, height: 5,
          background: "rgba(255,255,255,0.6)",
          border: `1px solid ${P.bannerEdge}`,
          borderRadius: 3, overflow: "hidden",
        }}>
          <div style={{
            width: `${progress * 100}%`, height: "100%",
            background: `linear-gradient(to right, ${P.accent}, #ffb84d)`,
            transition: "width .25s linear",
          }}/>
        </div>
      )}

      {/* Presenting coin pop — floats up and fades after claim */}
      {presentingCoin && (
        <div style={{
          position: "absolute", left: "50%", top: 8,
          transform: "translateX(-50%)",
          animation: "coinPop 1.2s cubic-bezier(.2,.7,.3,1) forwards",
          pointerEvents: "none",
        }}>
          <CoinCanvas coin={presentingCoin} size={36}/>
        </div>
      )}
    </div>
  );
}
