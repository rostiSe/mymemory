import type { EntryRow } from "@/features/entry/types";

/** One page of the entries infinite list (matches oRPC list output shape). */
export type EntryListPage = {
  items: EntryRow[];
  nextCursor: string | null;
};

/**
 * Flattens `useInfiniteQuery` pages into a single array for list rendering.
 *
 * @example
 * const { data } = useFeedEntries();
 * const entries = useMemo(() => flattenEntryListPages(data?.pages), [data?.pages]);
 */
export function flattenEntryListPages(
  pages: EntryListPage[] | undefined,
): EntryRow[] {
  return pages?.flatMap((page) => page.items) ?? [];
}
