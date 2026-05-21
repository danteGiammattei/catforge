import { useEffect } from "react";

/* Debounced effect — runs `fn` after `delay` ms once `deps` settle.
 * Used for things like debounced search input. The dep-array linter is
 * disabled because the dep list is intentionally caller-controlled. */
export function useDebouncedEffect(fn, deps, delay) {
  useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
