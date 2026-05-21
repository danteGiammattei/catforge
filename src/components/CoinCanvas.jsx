import { useRef, useEffect } from "react";
import { drawCoin } from "../lib/coin.js";

/* ─── COIN CANVAS ─────────────────────────────────────────────────────────
 * Renders a coin at the requested pixel size via the procedural painter
 * in lib/coin.js (disc, bevel, emblem, scratches all drawn from RNG +
 * metal palette). No image-loading path, no fallback — the same draw
 * runs everywhere (vault, brush, modal, profile) for consistent look.
 *
 * Shiny coins still get a CSS conic-gradient sheen overlay on top.
 */
export default function CoinCanvas({ coin, size }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (canvasRef.current) {
      drawCoin(canvasRef.current, coin, size);
    }
  }, [coin.seed, coin.metalIdx, coin.shiny, size]);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        style={{ imageRendering: "pixelated", display: "block", width: size, height: size }}
      />
      {coin.shiny && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(255,232,160,.55) 30deg, transparent 60deg, transparent 360deg)",
            mixBlendMode: "screen",
            animation: "shinyRotate 3.6s linear infinite",
            pointerEvents: "none",
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}
