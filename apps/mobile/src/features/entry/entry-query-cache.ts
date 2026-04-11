/**
 * ## Entries feed + detail — TanStack cache helpers (entries only)
 *
 * This file is **only** for the **entries infinite feed** (`useInfiniteQuery` on `entries.list`)
 * and **`entries.getById`**. It merges a row into cached **pages** so list cards update **without**
 * refetching every page, and keeps the detail query in sync.
 *
 * **Why it exists**
 * - **Ingest / pipeline done:** `useCreateEntry` runs `ai.ingest`; on success we patch the row into
 *   the feed + detail so the UI updates immediately.
 * - **Share Quick → main app:** after share, the main surface runs `getById` and calls
 *   {@link writeEntryRowToCaches} (see `useEntrySync`).
 *
 * **Not for other features** (spaces, digestions, plain `useQuery` lists): use TanStack directly —
 * `queryClient.setQueryData`, `invalidateQueries`, or a tiny helper next to that feature.
 *
 * ### When you change contracts or ingest
 * 1. **`packages/shared`** — `entrySchema`, list output, ingest output (rebuild shared).
 * 2. **Procedure keys** — update `orpc.entries.*` usages below if routes change.
 * 3. **Merge rule** — newest-first: replace by `id` in any page, else prepend to first page.
 *    Change the private helpers below only if the feed sort semantics change.
 * 4. **Optimistic create** — `useFeedOptimisticCreate` + `CaptureComposer` if UX changes.
 *
 * Row deletes: call {@link removeEntryRowFromCaches} from the mutation `onSuccess`.
 *
 * ### Heavy invalidation
 *
 * {@link invalidateEntriesDomain} refetches all `entries` queries (bad for feed UX). Use for
 * hard failures (e.g. `ai.ingest` error) or Share Quick nudge when there is no
 * `MMKV_SHARE_ENTRY_LAST_ID` for a targeted `getById`.
 */

import type { EntryRow } from "@/features/entry/types";
import type { EntryListPage } from "@/features/entry/utils/flattenEntryListPages";
import { orpc } from "@/lib/orpc";
import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

/** TanStack key prefix for all `entries.list` queries (infinite + variants). */
export function entryListRootQueryKey(): QueryKey {
  return orpc.entries.list.key();
}

/** TanStack key for `entries.getById` for a given row id. */
export function entryDetailQueryKey(id: string): QueryKey {
  return orpc.entries.getById.queryKey({ input: { id } });
}

/** Root key for every procedure under `entries`. */
export function entriesDomainQueryKey(): QueryKey {
  return orpc.entries.key();
}

function upsertEntryRowInInfiniteListCaches(
  queryClient: QueryClient,
  listQueryKey: QueryKey,
  entry: EntryRow,
): void {
  queryClient.setQueriesData<InfiniteData<EntryListPage, unknown>>(
    { queryKey: listQueryKey },
    (old) => {
      if (!old?.pages?.length) return old;

      const id = entry.id;
      let seen = false;
      const pages = old.pages.map((page) => {
        const items = page.items.map((item) => {
          if (item.id === id) {
            seen = true;
            return entry;
          }
          return item;
        });
        return { ...page, items };
      });

      if (seen) {
        return { ...old, pages };
      }

      const [first, ...rest] = pages;
      const dedupedFirstItems = first.items.filter((i) => i.id !== id);
      return {
        ...old,
        pages: [{ ...first, items: [entry, ...dedupedFirstItems] }, ...rest],
      };
    },
  );
}

function removeEntryRowFromInfiniteListCaches(
  queryClient: QueryClient,
  listQueryKey: QueryKey,
  removedId: string,
): void {
  queryClient.setQueriesData<InfiniteData<EntryListPage, unknown>>(
    { queryKey: listQueryKey },
    (old) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.filter((i) => i.id !== removedId),
        })),
      };
    },
  );
}

/** Sets detail cache and merges the row into cached infinite list pages (no list refetch). */
export function writeEntryRowToCaches(
  queryClient: QueryClient,
  row: EntryRow,
): void {
  queryClient.setQueryData(entryDetailQueryKey(row.id), row);
  upsertEntryRowInInfiniteListCaches(
    queryClient,
    entryListRootQueryKey(),
    row,
  );
}

/** Clears detail and removes the id from cached list pages (no list refetch). */
export function removeEntryRowFromCaches(
  queryClient: QueryClient,
  id: string,
): void {
  queryClient.setQueryData(entryDetailQueryKey(id), null);
  removeEntryRowFromInfiniteListCaches(
    queryClient,
    entryListRootQueryKey(),
    id,
  );
}

/** Invalidates all `entries` queries — use sparingly; see module docblock. */
export function invalidateEntriesDomain(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: entriesDomainQueryKey() });
}
