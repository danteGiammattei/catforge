import { createContext, useContext } from "react";

/* ─── GAME CONTEXT ────────────────────────────────────────────────────────
 * Single context that exposes the entire game state + setters + actions.
 * The Provider lives in MintForge.jsx (it IS MintForge.jsx, essentially —
 * the main component holds all the state and wraps the screen routing in
 * <GameContext.Provider value={...}>).
 *
 * Screens use `const g = useGame()` to read whatever they need:
 *   g.coins / g.marks / g.shovelLevel  (state)
 *   g.setMarks(n) / g.setShovelLevel(n) (setters)
 *   g.sellCoin(id) / g.forgeArtefact(coins) (actions)
 *   g.t / g.isDark (theme)
 *
 * Why single context: with one Provider holding everything, any state
 * change re-renders all screens — but only the active screen is mounted at
 * a time (screens are rendered conditionally on `tab`). So in practice,
 * one screen renders per state change. Splitting context per concern
 * would be premature optimization. */
export const GameContext = createContext(null);

/* Convenience hook — throws if used outside Provider. */
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameContext.Provider>");
  return ctx;
}
