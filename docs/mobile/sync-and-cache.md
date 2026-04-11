# Sync, cache, and UI updates

Two **different** patterns — only the first uses the entries-specific merge helpers.

## Track A — Entries infinite feed + detail (this app)

**When:** You need the **feed** (`useInfiniteQuery` on `entries.list`) and **detail** (`getById`) to update **without** refetching every page — e.g. **ingest finished**, **Share Quick** then back to main.

**Module:** [`apps/mobile/src/features/entry/entry-query-cache.ts`](../../apps/mobile/src/features/entry/entry-query-cache.ts)

- **`writeEntryRowToCaches`** — set detail + merge row into cached infinite pages (prepend / replace by id).
- **`removeEntryRowFromCaches`** — after a delete mutation (when you add deletes).
- **`invalidateEntriesDomain`** — heavy: refetch all `entries` queries; use for ingest errors or Share Quick nudge fallback.

**Flows:**

1. **Pipeline / ingest** — `useCreateEntry`: mutation + `ai.ingest` `.then` / `.catch` calls the helpers above.
2. **Share intent** — Share Quick writes cache + MMKV; main app **`useEntrySync`** on foreground runs `getById` + `writeEntryRowToCaches` or domain invalidation.

**Feed tab:** switching tabs does **not** auto-refetch the infinite list (avoids a full reload every time). Refresh manually with pull-to-refresh, or rely on creates / Share Quick / cache merges.

**MVP:** single-device, **no Supabase Realtime**. Updates = mutations + MMKV nudge + optional **detail polling** while `processedStatus` is pending (`lib/config/query.ts`), pull-to-refresh, app focus (`useSyncReactQueryAppFocus`).

## Track B — Everything else (spaces, digestions, plain lists)

**When:** A feature uses a **normal `useQuery`**, a **different list shape**, or a **one-off** “job finished → refresh this screen.”

**Do:** Use TanStack directly in that feature — no obligation to use `entry-query-cache`.

Examples:

```ts
// Patch one query when you have the new data
queryClient.setQueryData(someQueryKey, newData);

// Or refetch narrowly
void queryClient.invalidateQueries({ queryKey: someRootKey });
```

Add a small helper **next to that feature** only if the same pattern repeats.

## Shared pieces (both tracks)

- **Query client defaults:** [`apps/mobile/src/lib/query-client.ts`](../../apps/mobile/src/lib/query-client.ts)
- **Share Quick MMKV keys:** [`apps/mobile/src/constants/storage-keys.ts`](../../apps/mobile/src/constants/storage-keys.ts)
- **Cross-surface nudge:** [`useCrossSurfaceNudge`](../../apps/mobile/src/hooks/useCrossSurfaceNudge.ts) + [`useEntrySync`](../../apps/mobile/src/features/entry/hooks/useEntrySync.ts) (entries only)
- **Screen focus refetch:** [`useRefetchOnScreenFocus`](../../apps/mobile/src/hooks/useRefetchOnScreenFocus.ts)

## Web

`useCrossSurfaceNudge` no-ops on web; Share Quick is Android-only.

## Further reading

- [feed-and-entries.md](./feed-and-entries.md)
- [share-quick.md](./share-quick.md)
- [architecture.md](./architecture.md)

## Multi-device later

If you need live updates from other devices, add a targeted subscription or polling and still prefer **narrow** `setQueryData` / `invalidateQueries` where possible.
