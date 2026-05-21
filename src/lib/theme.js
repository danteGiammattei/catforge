/* ─── THEME ───────────────────────────────────────────────────────────────
 * Two parallel theme objects driving every inline-style read of `t.<name>`
 * throughout the app. The runtime swap happens in MintForge by toggling
 * `isDark` and using whichever object matches.
 *
 * As components convert to Tailwind classes, these tokens migrate into
 * tailwind.config.js (already done for the most-used ones — see
 * tailwind.config.js → theme.colors). For now they live here for backward
 * compatibility with all the existing inline-style sites.
 * ──────────────────────────────────────────────────────────────────────── */

export const DARK = {
  bg:"#0e0a08", surface:"#1a1310", surface2:"#15100d", surfaceHi:"#241a14",
  border:"rgba(212,160,23,0.10)", borderHi:"rgba(212,160,23,0.22)",
  text:"#f3e6cf", textDim:"#c8b89a", muted:"#8a7560", faint:"#221813",
  accent:"#d4a017", accentHi:"#f0c850", accentDim:"#7a5a10", accentInk:"#1a0f04",
  oxblood:"#5a1818", oxbloodHi:"#a83040",
  nav:"rgba(14,10,8,0.88)",
  input:"#15100d", inputBorder:"rgba(212,160,23,0.18)", inputFocus:"rgba(212,160,23,0.45)",
  danger:"#d24a28", success:"#7ab85a",
  noiseOpacity:0.04,
};

export const LIGHT = {
  bg:"#f5ecd8", surface:"#fcf6e6", surface2:"#f0e6c8", surfaceHi:"#ebe0bc",
  border:"rgba(74,40,8,0.14)", borderHi:"rgba(74,40,8,0.28)",
  text:"#241608", textDim:"#4a3520", muted:"#7a6240", faint:"#ebe0bc",
  accent:"#a06800", accentHi:"#d49020", accentDim:"#6a4400", accentInk:"#fcf6e6",
  oxblood:"#7a1818", oxbloodHi:"#a83040",
  nav:"rgba(245,236,216,0.9)",
  input:"#fcf6e6", inputBorder:"rgba(74,40,8,0.2)", inputFocus:"rgba(160,104,0,0.6)",
  danger:"#a83018", success:"#4a7820",
  noiseOpacity:0.03,
};
