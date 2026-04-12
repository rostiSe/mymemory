import { useEffect, useState } from "react";

/**
 * Returns the latest `value` after it has been stable for `delayMs`.
 * Useful for search / API triggers without debouncing inside data hooks.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): [T] {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return [debounced];
}
