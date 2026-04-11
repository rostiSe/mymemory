/**
 * Stable-enough id for optimistic list placeholders (before the server returns a row).
 * Prefer `crypto.randomUUID` when available.
 */
export function newOptimisticRowId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
