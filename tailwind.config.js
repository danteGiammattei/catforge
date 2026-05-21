/** @type {import('tailwindcss').Config}
 *
 * Theme is anchored on the existing DARK/LIGHT objects in src/lib/theme.js.
 * Names mirror the JS theme so a future inline-style → className conversion
 * is a 1-to-1 mapping (`t.accent` → `text-accent`, `t.surface` → `bg-surface`, etc).
 *
 * The dark mode is class-strategy: <html class="dark"> toggles dark variants.
 * That matches how the app already swaps themes via React state.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // Semantic colors — used everywhere. Each variant has both a light and a dark value;
      // Tailwind's `dark:` variant picks the right one. e.g. `bg-surface dark:bg-surface-dark`.
      colors: {
        // Background layers
        bg:        { DEFAULT: "#f5e6cf", dark: "#0e0a08" },
        surface:   { DEFAULT: "#ebd5b0", dark: "#1a1310" },
        "surface-hi": { DEFAULT: "#f8eccd", dark: "#241814" },
        // Text
        text:      { DEFAULT: "#3a2814", dark: "#f3e6cf" },
        "text-dim":{ DEFAULT: "#8a7560", dark: "#a89070" },
        muted:     { DEFAULT: "#8a7560", dark: "#8a7560" },
        // Accent (gold/amber across both themes)
        accent:    { DEFAULT: "#a07820", dark: "#d4a017" },
        "accent-hi":{ DEFAULT: "#c8a040", dark: "#e8c040" },
        "accent-dim":{ DEFAULT: "#8a6818", dark: "#806010" },
        "accent-ink": { DEFAULT: "#1a0a04", dark: "#1a0a04" },
        // Status
        success:   { DEFAULT: "#207040", dark: "#7cffb0" },
        danger:    { DEFAULT: "#a02020", dark: "#ff6060" },
        // Borders
        border:    { DEFAULT: "rgba(80,50,20,0.18)", dark: "rgba(212,160,23,0.10)" },
        "border-hi":{ DEFAULT: "rgba(80,50,20,0.32)", dark: "rgba(212,160,23,0.25)" },
        faint:     { DEFAULT: "#e0d0a8", dark: "#221813" },
        // Inputs
        input:     { DEFAULT: "#fff8e8", dark: "#0e0807" },
        "input-border":{ DEFAULT: "#c8b090", dark: "#3a2818" },
        // Rarity (universal across themes)
        rarity: {
          common:    "#8a7560",
          uncommon:  "#7ad888",
          rare:      "#80c0ff",
          epic:      "#c080ff",
          legendary: "#f0c850",
          mythic:    "#ff7060",
        },
      },
      fontFamily: {
        // Outfit is the UI sans; Fraunces is the headline serif; VT323 is the
        // pixel/runic monospace. Loaded via index.html <link>.
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
        mono:    ['"VT323"', 'monospace'],
      },
      // Mobile-first: explicit safe-area aware spacing for the bottom nav etc.
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
      },
      // Animation utilities — keyframes themselves stay in src/styles.css for now,
      // but exposing these as Tailwind animations means components can do
      // className="animate-fadein" instead of inline `animation: ...`.
      animation: {
        fadein:        "fadein 0.35s ease-out both",
        "fadein-slow": "fadeinSlow 0.6s ease-out both",
        "slide-up":    "slideUp 0.25s ease-out both",
        "slide-up-spring": "slideUpSpring 0.5s cubic-bezier(.34,1.56,.64,1) both",
        "scale-in-spring": "scaleInSpring 0.45s cubic-bezier(.34,1.56,.64,1) both",
        "flash-in-big": "flashInBig 0.5s cubic-bezier(.2,.8,.3,1) both",
        breathe:       "breathe 1.4s ease-in-out infinite",
        flicker:       "flicker 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
