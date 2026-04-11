import type { EntryRow } from "@/features/entry/types";

/** Placeholder row shown while a create mutation is in flight (skeleton in list). */
export type FeedPendingRow = { id: string; pending: true };

/** What the feed `FlatList` renders: a real entry or a transient pending row. */
export type FeedRow = EntryRow | FeedPendingRow;

export function isPendingFeedRow(item: FeedRow): item is FeedPendingRow {
  return "pending" in item && item.pending === true;
}
