import { useState, useRef, useEffect } from "react";

/* ─── MARKS COUNTER ───────────────────────────────────────────────────────
 * Tick-animated currency readout. Detects changes vs the previous render
 * and replays marksFlash (color + text-shadow pulse). Re-keying with
 * animKey forces a remount each change, so the animation always restarts
 * cleanly even on rapid increments.
 *
 * marksCounterRef is forwarded so the scrap-flyer animation can target the
 * live counter — the +◈ arc lands precisely on this element.
 *
 * MIGRATION NOTE: First component using Tailwind utilities for structural
 * styles (font, flex layout, gap, transitions). Theme-dependent colors
 * stay on inline `style` because the app's dark/light mode is currently
 * driven by React state passing a `t` object — not by Tailwind's
 * `<html class="dark">` mechanism. Once the theme system is unified to
 * use a class on <html>, the inline style here can drop entirely. */
export default function MarksCounter({ marks, marksCounterRef, t, F }) {
  const prevRef = useRef(marks);
  const [flash,   setFlash]   = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (marks !== prevRef.current) {
      prevRef.current = marks;
      setFlash(true);
      setAnimKey(k => k + 1);
      const tm = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(tm);
    }
  }, [marks]);

  return (
    <span
      ref={marksCounterRef}
      key={animKey}
      className="inline-flex items-center gap-[3px] text-[11px] font-extrabold tracking-[0.5px] tabular-nums transition-colors duration-300"
      style={{
        // Theme-coupled values stay inline until the dark-mode mechanism is unified
        ...F,
        color: flash ? t.accentHi : t.accent,
        animation: flash ? "marksFlash .6s ease-out" : "none",
      }}>
      <span className="text-[11px] opacity-85">◈</span>
      {marks.toLocaleString()}
    </span>
  );
}
