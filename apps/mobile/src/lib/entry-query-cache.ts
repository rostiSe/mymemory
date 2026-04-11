import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { EntryRow } from "@/features/entry/types";
import { orpc } from "@/lib/orpc";

type EntryListPage = {
  items: EntryRow[];
  nextCursor: string | null;
};

/**
 * Patches feed + detail caches after a successful `ai.ingest` so the UI shows
 * summary/processed fields without waiting for a refetch.
 */
export function applySuccessfulIngestToCache(
  qc: QueryClient,
  entryId: string,
  data: EntryRow,
): void {
  qc.setQueriesData(
    { queryKey: orpc.entries.list.key() },
    (old: InfiniteData<EntryListPage> | undefined) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === entryId ? { ...item, ...data } : item,
          ),
        })),
      };
    },
  );

  qc.setQueryData(
    orpc.entries.getById.queryKey({ input: { id: entryId } }),
    data,
  );
}

/** Broad invalidation when ingest fails or state is unknown. */
export function invalidateAllEntryQueries(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: orpc.entries.key() });
}
