import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useGame } from "../lib/GameContext.js";
import { mkCoin, newSeed, lvl } from "../lib/coin.js";
import { rollOreMetal } from "../lib/data.js";
import CoinCanvas from "../components/CoinCanvas.jsx";
import CatSprite from "../components/CatSprite.jsx";

/* ─── IDLE FIELD ───────────────────────────────────────────────────────────
 * Fully pixel-art cosy village. Tiled grass background, stone pad under
 * each station, real sprite fixtures (rock pile / barn / crate), cats
 * sitting next to them, scattered tree decoration around the edges.
 *
 * Stations operate on a wall-clock timer stored in fieldState — every
 * station has a `nextReadyAt` timestamp. While `Date.now() < nextReadyAt`
 * the station is "working" and shows a progress bar. Once ready, an
 * accent pulse appears and the player taps to claim — a coin is minted,
 * persisted via commitCoin(), and the timer resets. Idle progress works
 * even when the tab is closed because the timer is just a timestamp.
 *
 * Pixel-art rules:
 *  - All <img> sprites carry image-rendering: pixelated so they don't
 *    bilinear-smooth when scaled up.
 *  - Tiles render at 2x native resolution (32px tile → 64px display)
 *    so individual pixels are visible without dominating the layout.
 *  - Decorative elements use absolute % positioning so the layout flexes
 *    across phone widths without breaking.
 * ────────────────────────────────────────────────────────────────────── */

// One full "working" cycle before a coin is ready.
const CYCLE_MS  = 6000;
// Visual flourish duration when a coin is claimed (separate from cycle).
const PRESENT_MS = 1200;
// Tile display size (native 32 → 2x display).
const TILE = 64;

// Cosy parchment palette for UI overlays. The grass image carries the green.
const P = {
  banner:     "#fef3d9",
  bannerEdge: "#8a6a3a",
  text:       "#3a2a18",
  textMute:   "#6a553a",
  accent:     "#e88a4f",
  accentEdge: "#a85820",
  shadow:     "rgba(40,28,14,0.35)",
  ready:      "#f6d44f",
};

// Station definitions. `art` points to the sprite file used as the fixture.
// `metalBias` skews the rolled metal toward this index when the cat finishes
// a cycle — early stations roll low-tier metals, later ones higher tier.
const DEFAULT_STATIONS = [
  { id: "mine",   name: "Copper Mine",  art: "/sprites/rocks_pile.png", artW: 96, artH: 44,
    x: 28, y: 36, catFlip: false, metalBias: 0 },
  { id: "forge",  name: "Iron Forge",   art: "/sprites/house.png",      artW: 90, artH: 90,
    x: 68, y: 42, catFlip: true,  metalBias: 2 },
  { id: "bench",  name: "Workbench",    art: "/sprites/crate.png",      artW: 64, artH: 28,
    x: 44, y: 68, catFlip: false, metalBias: 1 },
];

// Decoration sprites scattered for visual interest. Placed once on init and
// kept in fieldState so the layout is consistent across reloads.
function generateDecor() {
  // Trees + bushes around the edges, with a few seeds for variation.
  // Positions in % of viewport; sizes in display px.
  return [
    { art: "/sprites/tree_a.png", x: 8,  y: 16, w: 72 },
    { art: "/sprites/tree_b.png", x: 86, y: 22, w: 84 },
    { art: "/sprites/tree_a.png", x: 92, y: 78, w: 64 },
    { art: "/sprites/tree_b.png", x: 6,  y: 84, w: 76 },
    { art: "/sprites/bush_a.png", x: 18, y: 60, w: 44 },
    { art: "/sprites/bush_b.png", x: 78, y: 70, w: 50 },
    { art: "/sprites/bush_a.png", x: 56, y: 18, w: 36 },
    { art: "/sprites/bush_b.png", x: 36, y: 88, w: 40 },
    { art: "/sprites/bush_a.png", x: 64, y: 88, w: 36 },
  ];
}

export default function IdleField() {
  const { xp, coins, commitCoin, fieldState, setFieldState } = useGame();
  const playerLevel = lvl(xp);

  // ─── Station + decor initialisation ──────────────────────────────
  // Stations live in fieldState so timers persist across reloads. We hydrate
  // defaults the first time fieldState is empty.
  const stations = fieldState?.stations || DEFAULT_STATIONS.map(s => ({
    ...s, level: 1, nextReadyAt: Date.now() + CYCLE_MS,
  }));
  const decor = useMemo(() => fieldState?.decor || generateDecor(), [fieldState?.decor]);

  useEffect(() => {
    if (!fieldState?.stations) {
      setFieldState(prev => ({
        ...prev,
        stations: DEFAULT_STATIONS.map(s => ({
          ...s, level: 1, nextReadyAt: Date.now() + CYCLE_MS,
        })),
        decor: generateDecor(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Tick: re-render every 250ms so timers/progress update ──────
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // ─── Per-station "presenting" state (coin pop on claim) ─────────
  const [presenting, setPresenting] = useState({});
  const presentTimers = useRef({});

  const claimStation = useCallback((stationId) => {
    const station = stations.find(s => s.id === stationId);
    if (!station || Date.now() < station.nextReadyAt) return;

    // Roll the metal index, biased toward this station's tier.
    const rolled = rollOreMetal(Math.random());
    const bias = station.metalBias || 0;
    const metalIdx = Math.max(0, Math.min(8, Math.round((rolled + bias * 2) / 3)));
    const coin = mkCoin(newSeed(), playerLevel, metalIdx);

    // Persist to vault (commitCoin handles state + api.tx).
    commitCoin(coin, station.id);

    // Flourish: float a coin up briefly.
    setPresenting(p => ({ ...p, [stationId]: { coin, until: Date.now() + PRESENT_MS } }));
    clearTimeout(presentTimers.current[stationId]);
    presentTimers.current[stationId] = setTimeout(() => {
      setPresenting(p => { const n = { ...p }; delete n[stationId]; return n; });
    }, PRESENT_MS);

    // Reset cycle timer.
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
      // Grass tile repeats across the entire field. Falls back to a flat
      // green if the asset 404s (cosmetic, won't break).
      backgroundColor: "#7da353",
      backgroundImage: 'url("/sprites/grass_tile.png")',
      backgroundRepeat: "repeat",
      backgroundSize: `${TILE}px ${TILE}px`,
      imageRendering: "pixelated",
    }}>

      {/* Subtle scattered grass-tuft accents — overlay the tuft tile sparsely
          using a much larger background-size so it shows up here and there
          but not on every cell. */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: 'url("/sprites/grass_tile_tuft.png")',
        backgroundRepeat: "no-repeat",
        backgroundSize: `${TILE}px ${TILE}px`,
        // Multiple tufts via a 0-size CSS gradient trick won't work; use
        // box-shadow on a child instead. For now a single bg position works.
        opacity: 0.7,
        imageRendering: "pixelated",
      }}/>

      {/* ── DECORATION (trees + bushes, behind stations) ── */}
      {decor.map((d, i) => (
        <img
          key={i}
          src={d.art}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: `${d.x}%`, top: `${d.y}%`,
            transform: "translate(-50%, -85%)",  // anchor at trunk bottom
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

      {/* ── RECENT FINDS TRAY (bottom, parchment-style) ── */}
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
 * Stone pad + fixture sprite + cat + parchment level banner. The progress
 * bar lives at the bottom of the pad; when ready, an accent halo pulses
 * to draw the eye. Tap-to-claim only fires when ready. */
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
        transform: `translate(-50%, -50%) scale(${hover && ready ? 1.04 : 1})`,
        width: 140, height: 120,
        cursor: ready ? "pointer" : "default",
        transition: "transform .15s ease",
      }}
    >
      {/* Stone pad — three repeating tiles forming an oval cluster. The
          stone_tile is 32x32 native; rendered at 56x56 for slightly larger
          pixels matching the rest of the scene. */}
      <div style={{
        position: "absolute", left: "50%", bottom: 12,
        transform: "translateX(-50%)",
        width: 112, height: 56,
        backgroundImage: 'url("/sprites/stone_tile.png")',
        backgroundRepeat: "repeat-x",
        backgroundSize: "56px 56px",
        // Soft oval mask so the pad reads as round, not a square strip.
        WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, black 60%, transparent 100%)",
        maskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, black 60%, transparent 100%)",
        imageRendering: "pixelated",
        filter: `drop-shadow(0 2px 0 ${P.shadow})`,
      }}/>

      {/* Ready halo — only when claimable */}
      {ready && (
        <div style={{
          position: "absolute", left: "50%", bottom: 8,
          transform: "translateX(-50%)",
          width: 124, height: 60,
          borderRadius: "50%",
          border: `3px solid ${P.ready}`,
          boxShadow: `0 0 16px ${P.ready}99`,
          opacity: 0.85,
          animation: "stationPulse 1.4s ease-in-out infinite",
          pointerEvents: "none",
        }}/>
      )}

      {/* Fixture sprite — anchored to the centre-bottom of the pad */}
      <img
        src={station.art}
        alt={station.name}
        style={{
          position: "absolute",
          left: "50%", bottom: 22,
          transform: "translateX(-50%)",
          width: station.artW, height: "auto",
          imageRendering: "pixelated",
          filter: ready
            ? `drop-shadow(0 3px 0 ${P.shadow})`
            : `drop-shadow(0 3px 0 ${P.shadow}) saturate(.9) brightness(.96)`,
          transition: "filter .3s",
          pointerEvents: "none",
        }}
      />

      {/* Cat — sits beside the fixture. Flipped per-station so the cat
          always faces inward toward the workstation. */}
      <div style={{
        position: "absolute",
        left: station.catFlip ? "auto" : 0,
        right: station.catFlip ? 0 : "auto",
        bottom: 14,
        filter: `drop-shadow(0 2px 0 ${P.shadow})`,
      }}>
        <CatSprite mood={ready ? "idle" : "working"} size={56} flip={station.catFlip}/>
      </div>

      {/* Parchment level banner above the station */}
      <div style={{
        position: "absolute", top: -2, left: "50%",
        transform: "translateX(-50%)",
        background: P.banner, border: `2px solid ${P.bannerEdge}`,
        padding: "2px 9px",
        fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 11,
        color: P.text, letterSpacing: 0.6, whiteSpace: "nowrap",
        boxShadow: `0 2px 0 ${P.shadow}`,
      }}>
        LV. {station.level || 1}
      </div>

      {/* Pixel-art progress bar — stepped fill, no gradients */}
      {!ready && (
        <div style={{
          position: "absolute", left: "50%", bottom: 2,
          transform: "translateX(-50%)",
          width: 72, height: 8,
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

      {/* Coin pop — floats up after claim */}
      {presentingCoin && (
        <div style={{
          position: "absolute", left: "50%", top: 6,
          transform: "translateX(-50%)",
          animation: "coinPop 1.2s cubic-bezier(.2,.7,.3,1) forwards",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          <CoinCanvas coin={presentingCoin} size={32}/>
        </div>
      )}
    </div>
  );
}
