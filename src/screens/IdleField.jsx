import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useGame } from "../lib/GameContext.js";
import { mkCoin, newSeed, lvl } from "../lib/coin.js";
import { rollOreMetal } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import CatSprite from "../components/CatSprite.jsx";

/* ─── IDLE FIELD ───────────────────────────────────────────────────────────
 * Pixel-art village with proper isometric buildings, animated cats, and
 * bottom-anchored decoration that doesn't get cropped at the viewport top.
 *
 * Station behaviour:
 *  - WORKING (cycle in progress): cat plays walk_up — visually it's
 *    "wandering up to the building to do work", slow shuffle.
 *  - READY (cycle complete): cat sits at the front of the station, facing
 *    the camera. Tap the station to claim.
 *
 * Layout uses BOTTOM-relative positioning for trees/bushes so the sprite's
 * trunk anchors to a fixed offset from the bottom of the viewport — no
 * matter the screen height, the canopy extends UP into the visible area
 * rather than being cropped at the top.
 *
 * Stations persist in fieldState.stations (timers survive reloads).
 * Decor is generated once and persisted in fieldState.decor.
 * ────────────────────────────────────────────────────────────────────── */

const CYCLE_MS   = 6000;
const PRESENT_MS = 1200;
const TILE       = 64;

const P = {
  banner:     "#fef3d9",
  bannerEdge: "#8a6a3a",
  text:       "#3a2a18",
  textMute:   "#6a553a",
  accent:     "#e88a4f",
  shadow:     "rgba(40,28,14,0.35)",
  ready:      "#f6d44f",
};

// Station definitions. `art` is the sprite filename, `artW` the display
// width (height auto from intrinsic aspect ratio). `catSide` decides which
// side of the building the cat sits on so it doesn't overlap the fixture.
const DEFAULT_STATIONS = [
  {
    id: "mine", name: "Copper Mine",
    art: "/sprites/bld_windmill.png", artW: 130,
    x: 24, y: 42, catSide: "left", metalBias: 0,
  },
  {
    id: "forge", name: "Iron Forge",
    art: "/sprites/bld_forge.png", artW: 150,
    x: 72, y: 42, catSide: "right", metalBias: 2,
  },
  {
    id: "workshop", name: "Workshop",
    art: "/sprites/bld_cottage.png", artW: 160,
    x: 48, y: 74, catSide: "left", metalBias: 1,
  },
];

// Decoration scattered using BOTTOM-relative positioning so canopies extend
// upward into the visible area and never get cropped at the viewport top.
function defaultDecor() {
  return [
    // upper edge — trees with canopies near the top of the field
    { art: "/sprites/tree_a.png", x: 8,  bottom: 62, w: 72 },
    { art: "/sprites/tree_b.png", x: 92, bottom: 60, w: 80 },
    // lower edge — trees flanking the bottom
    { art: "/sprites/tree_a.png", x: 4,  bottom: 12, w: 70 },
    { art: "/sprites/tree_b.png", x: 96, bottom: 10, w: 84 },
    // bushes — shorter, less risk of cropping; scatter freely
    { art: "/sprites/bush_a.png", x: 16, bottom: 30, w: 42 },
    { art: "/sprites/bush_b.png", x: 86, bottom: 32, w: 48 },
    { art: "/sprites/bush_a.png", x: 58, bottom: 12, w: 38 },
    { art: "/sprites/bush_b.png", x: 36, bottom: 8,  w: 44 },
  ];
}

export default function IdleField() {
  const { xp, coins, commitCoin, fieldState, setFieldState } = useGame();
  const playerLevel = lvl(xp);

  // ─── Initialise stations + decor once ──────────────────────────
  const stations = fieldState?.stations || DEFAULT_STATIONS.map(s => ({
    ...s, level: 1, nextReadyAt: Date.now() + CYCLE_MS,
  }));
  const decor = useMemo(() => fieldState?.decor || defaultDecor(), [fieldState?.decor]);

  useEffect(() => {
    if (!fieldState?.stations) {
      setFieldState(prev => ({
        ...prev,
        stations: DEFAULT_STATIONS.map(s => ({
          ...s, level: 1, nextReadyAt: Date.now() + CYCLE_MS,
        })),
        decor: defaultDecor(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Tick: re-render every 250ms for progress + ready states ──
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // ─── Presenting (coin pop flourish) ─────────────────────────
  const [presenting, setPresenting] = useState({});
  const presentTimers = useRef({});

  const claimStation = useCallback((stationId) => {
    const station = stations.find(s => s.id === stationId);
    if (!station || Date.now() < station.nextReadyAt) return;

    const rolled   = rollOreMetal(Math.random());
    const bias     = station.metalBias || 0;
    const metalIdx = Math.max(0, Math.min(8, Math.round((rolled + bias * 2) / 3)));
    const coin     = mkCoin(newSeed(), playerLevel, metalIdx);

    commitCoin(coin, station.id);

    setPresenting(p => ({ ...p, [stationId]: { coin, until: Date.now() + PRESENT_MS } }));
    clearTimeout(presentTimers.current[stationId]);
    presentTimers.current[stationId] = setTimeout(() => {
      setPresenting(p => { const n = { ...p }; delete n[stationId]; return n; });
    }, PRESENT_MS);

    setFieldState(prev => ({
      ...prev,
      stations: (prev?.stations || stations).map(s =>
        s.id === stationId ? { ...s, nextReadyAt: Date.now() + CYCLE_MS } : s
      ),
    }));
  }, [stations, playerLevel, commitCoin, setFieldState]);

  const recentCoins = coins.slice(0, 5);

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      backgroundColor: "#7da353",
      backgroundImage: 'url("/sprites/grass_tile.png")',
      backgroundRepeat: "repeat",
      backgroundSize: `${TILE}px ${TILE}px`,
      imageRendering: "pixelated",
    }}>

      {/* ── DECORATION (bottom-anchored — never cropped at top) ── */}
      {decor.map((d, i) => (
        <img
          key={i}
          src={d.art}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: `${d.x}%`,
            bottom: `${d.bottom}%`,        // anchor by trunk, not by top
            transform: "translateX(-50%)",
            width: d.w, height: "auto",
            imageRendering: "pixelated",
            filter: `drop-shadow(0 3px 2px ${P.shadow})`,
            pointerEvents: "none",
          }}
        />
      ))}

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

      {/* ── RECENT FINDS (parchment tray, bottom center) ── */}
      <div style={{
        position: "absolute", left: "50%", bottom: 16,
        transform: "translateX(-50%)",
        display: "flex", gap: 10, padding: "8px 14px",
        background: P.banner,
        border: `2px solid ${P.bannerEdge}`,
        boxShadow: `0 4px 0 ${P.shadow}, inset 0 -3px 0 rgba(0,0,0,.06)`,
        borderRadius: 10,
        minWidth: 220, justifyContent: "center", alignItems: "center",
      }}>
        <div style={{
          fontFamily: "'Fraunces',serif", fontWeight: 800,
          fontSize: 12, color: P.textMute, letterSpacing: 1,
          marginRight: 4, textTransform: "uppercase",
        }}>Recent</div>
        {recentCoins.length === 0
          ? <div style={{ fontFamily: "'Fraunces',serif", fontStyle: "italic",
                          fontSize: 12, color: P.textMute }}>no coins yet</div>
          : recentCoins.map(c => (
              <div key={c.id} style={{ width: 30, height: 30 }}>
                <CoinCanvas coin={c} size={30}/>
              </div>
            ))
        }
      </div>
    </div>
  );
}

/* ─── STATION ─────────────────────────────────────────────────────────────
 * Layout (cat on left side):
 *   ┌── Lv banner ──┐
 *   │ [cat] [BUILDING SPRITE]   │
 *   │                           │
 *   │  ── progress bar ──       │
 *   └─── name label ────────────┘
 *
 * The "building base shadow" is the only stone-pad effect — kept light so
 * the building's own integrated base reads as the ground contact. */
function Station({ station, ready, progress, presentingCoin, onClaim }) {
  const [hover, setHover] = useState(false);

  const catMood = ready ? "idle" : "walk_up";
  const catFlip = station.catSide === "right";

  return (
    <div
      onClick={ready ? onClaim : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        left: `${station.x}%`, top: `${station.y}%`,
        transform: `translate(-50%, -50%) scale(${hover && ready ? 1.04 : 1})`,
        width: 200, height: 180,
        cursor: ready ? "pointer" : "default",
        transition: "transform .15s ease",
      }}
    >
      {/* Ready halo — pulses behind everything when claimable */}
      {ready && (
        <div style={{
          position: "absolute", left: "50%", bottom: 24,
          transform: "translateX(-50%)",
          width: 140, height: 36,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${P.ready}66, transparent 70%)`,
          boxShadow: `0 0 24px ${P.ready}88`,
          opacity: 0.95,
          animation: "stationPulse 1.4s ease-in-out infinite",
          pointerEvents: "none",
        }}/>
      )}

      {/* Building sprite — anchored to centre-bottom */}
      <img
        src={station.art}
        alt={station.name}
        style={{
          position: "absolute",
          left: "50%", bottom: 30,
          transform: "translateX(-50%)",
          width: station.artW, height: "auto",
          imageRendering: "pixelated",
          filter: ready
            ? `drop-shadow(0 4px 2px ${P.shadow})`
            : `drop-shadow(0 4px 2px ${P.shadow}) saturate(.9) brightness(.96)`,
          transition: "filter .3s",
          pointerEvents: "none",
        }}
      />

      {/* Cat — sits beside the building. catSide controls which side. */}
      <div style={{
        position: "absolute",
        left:  station.catSide === "left"  ? "8%"  : "auto",
        right: station.catSide === "right" ? "8%"  : "auto",
        bottom: 24,
        filter: `drop-shadow(0 2px 0 ${P.shadow})`,
      }}>
        <CatSprite mood={catMood} size={56} flip={catFlip}/>
      </div>

      {/* Parchment level banner — above building */}
      <div style={{
        position: "absolute", top: 0, left: "50%",
        transform: "translateX(-50%)",
        background: P.banner, border: `2px solid ${P.bannerEdge}`,
        padding: "2px 9px",
        fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 11,
        color: P.text, letterSpacing: 0.6, whiteSpace: "nowrap",
        boxShadow: `0 2px 0 ${P.shadow}`,
        zIndex: 5,
      }}>
        LV. {station.level || 1}
      </div>

      {/* Station name + progress at the bottom */}
      <div style={{
        position: "absolute", left: "50%", bottom: 6,
        transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        whiteSpace: "nowrap",
      }}>
        <div style={{
          fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 10,
          color: P.banner, letterSpacing: 0.8, textTransform: "uppercase",
          textShadow: `0 0 4px ${P.shadow}, 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000`,
        }}>{station.name}</div>
        {!ready && (
          <div style={{
            width: 86, height: 7,
            background: "#2c1f12",
            border: `1px solid ${P.bannerEdge}`,
            padding: 1,
            boxShadow: `0 1px 0 ${P.shadow}`,
          }}>
            <div style={{
              width: `${Math.round(progress * 100)}%`, height: "100%",
              background: `linear-gradient(to right, ${P.accent}, ${P.accent} 70%, ${P.ready})`,
              transition: "width .25s linear",
            }}/>
          </div>
        )}
      </div>

      {/* Coin pop on claim */}
      {presentingCoin && (
        <div style={{
          position: "absolute", left: "50%", top: 30,
          transform: "translateX(-50%)",
          animation: "coinPop 1.2s cubic-bezier(.2,.7,.3,1) forwards",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          <CoinCanvas coin={presentingCoin} size={36}/>
        </div>
      )}
    </div>
  );
}
