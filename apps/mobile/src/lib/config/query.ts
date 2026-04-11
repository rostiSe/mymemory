/**
 * TanStack Query tuning for entry reads (async AI ingest + client-driven cache updates).
 * @see docs/mobile/sync-and-cache.md
 */

/** Feed/detail stay relatively fresh while ingest and navigation refetches run without Realtime. */
export const ENTRY_QUERIES_STALE_TIME_MS = 15_000;

/** Poll entry detail while `processedStatus` is pending/processing until ingest completes. */
export const ENTRY_DETAIL_PROCESSING_REFETCH_INTERVAL_MS = 3_000;
