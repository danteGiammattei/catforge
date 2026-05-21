# Tailwind Migration Playbook

This document captures the conversion patterns established during the
inline-style → Tailwind migration of MintForge. Use it when converting
remaining screens (Hunt, Forge, Profile, Shrine, Social, Tavern) and
components (BottomNav, AuthScreen, etc.).

`src/screens/Vault.jsx` is the reference implementation.

## Approach: mixed-mode

Pure Tailwind isn't worth chasing. The app has heavy theme-driven and
metal-driven dynamic styling that Tailwind can't express cleanly. Instead:

| Style category               | Approach                              |
|------------------------------|---------------------------------------|
| Static layout/spacing/typography | Tailwind utilities                |
| Theme tokens (`t.accent`, `t.surface`)| Inline `style` (for now)        |
| Per-metal/rarity colors      | Inline `style` (truly dynamic)        |
| Animations                   | Tailwind animation utilities          |
| Pseudo-elements / `:hover`   | Real CSS in `styles.css`              |

Why not convert theme tokens to `dark:` variants today? The dark mode
class is wired up (`<html class="dark">` toggles), but the existing `t`
object is still used hundreds of places. Converting all of them in one
session would be tens of thousands of tokens. Instead, we leave `t.X`
references alone and use Tailwind for everything else. A future pass can
sweep through and convert `t.X` → `text-accent dark:text-accent-dark` etc.

## Conversion cheatsheet

### Layout
```diff
- style={{display:"flex",alignItems:"center",gap:8}}
+ className="flex items-center gap-2"

- style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}
+ className="grid grid-cols-3 gap-[9px]"
```

### Typography
```diff
- style={{...F,fontSize:11,fontWeight:700,letterSpacing:1.5}}
+ className="text-[11px] font-bold tracking-[1.5px]" style={{fontFamily:"Outfit,sans-serif"}}
```
The `F`, `VT`, `FR` style objects (font-family) stay as inline `style` for
now — they're widely used and Tailwind's `font-sans/mono/display` aliases
already exist in `tailwind.config.js`, but converting requires removing
the destructured imports throughout. Defer.

### Sizes — use arbitrary values for non-standard
Tailwind has `px-2` (8px), `px-3` (12px), `px-4` (16px). For non-standard
values, use arbitrary syntax:
```diff
- style={{padding:"5px 11px"}}
+ className="px-[11px] py-[5px]"
```

### Theme-coupled colors → leave inline
```jsx
// Keep this:
style={{
  border:`1px solid ${selectMode?t.accent:t.border}`,
  background:selectMode?`${t.accent}22`:t.surface,
  color:selectMode?t.accent:t.muted,
}}
```
Don't try to convert these to Tailwind. The conditional + alpha syntax
(`${t.accent}22`) is uglier in Tailwind classes than as inline style.

### Animations
```diff
- style={{animation:"fadein .35s ease"}}
+ className="animate-fadein"
```
Animations are pre-defined in `tailwind.config.js`:
- `animate-fadein`, `animate-fadein-slow`
- `animate-slide-up`, `animate-slide-up-spring`
- `animate-scale-in-spring`, `animate-flash-in-big`
- `animate-breathe`, `animate-flicker`

For one-off animations, keep inline.

### Mixing className + style
React happily merges them:
```jsx
<div
  className="flex items-center gap-2"
  style={{ color: t.accent }}
/>
```

## Common patterns

### Active/inactive button
```jsx
<button
  className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[1.5px] transition-all duration-150"
  style={{
    fontFamily:"Outfit,sans-serif",
    border:`1px solid ${active?t.accent:t.border}`,
    background:active?`${t.accent}22`:t.surface,
    color:active?t.accent:t.muted,
  }}
>
```

### Empty-state card
```jsx
<div className="text-center px-5 py-14" style={card}>
```
The `card` style object stays inline (it's a destructured local).

### Fixed bottom action bar
```jsx
<div
  className="fixed left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] animate-fadein"
  style={{
    bottom:"calc(82px + env(safe-area-inset-bottom,0px))",
    background:t.surface,
    boxShadow:"0 8px 28px rgba(0,0,0,.5)",
    maxWidth:"calc(100vw - 24px)",
  }}
>
```
`env(safe-area-inset-bottom)` and `calc()` stay inline.

## What converting one screen looks like

In Vault, ~60% of inline-style declarations were eliminated. The remaining
40% are theme-coupled or computed (per-metal background, conditional
borders). Bundle CSS grew from 4.59 → 5.32 KB. JS stayed flat.

Time-wise: each screen takes ~10-15 minutes of careful conversion. Don't
batch — convert one, build, scan visually, then move on. Tailwind purge
will only include the classes you actually use, so unused classes have no
cost.

## Future cleanup (after all screens converted)

1. **Promote frequent inline patterns to component classes.** If
   `style={{fontFamily:"Outfit,sans-serif"}}` appears 200 times, move it
   to a `.font-ui` utility class in `styles.css`.

2. **Theme tokens → Tailwind dark: variants.** Sweep `t.accent` →
   `text-accent dark:text-accent-dark` etc. Once done, remove `t` from
   GameContext and stop passing it to components.

3. **Drop the `F`/`VT`/`FR` style objects.** Replace with
   `font-sans/mono/display` Tailwind classes everywhere.

These are all incremental wins that can happen over weeks, not in one
sprint.
