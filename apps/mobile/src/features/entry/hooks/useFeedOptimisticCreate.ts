import type { CaptureComposerProps } from "@/features/entry/components/CaptureComposer";
import {
  type FeedPendingRow,
  type FeedRow,
  isPendingFeedRow,
} from "@/features/entry/utils/feed-rows";
import {
  type EntryListPage,
  flattenEntryListPages,
} from "@/features/entry/utils/flattenEntryListPages";
import { newOptimisticRowId } from "@/features/entry/utils/optimisticRowId";
import type { InfiniteData } from "@tanstack/react-query";
import { useCallback, useMemo, useOptimistic, useRef, useTransition } from "react";

type CreateMutation = ReturnType<
  typeof import("@/features/entry/hooks/useEntries").useCreateEntry
>;

export type UseFeedOptimisticCreateParams = {
  /** Pages from `useInfiniteQuery` (entries list). */
  infiniteData: InfiniteData<EntryListPage> | undefined;
  createMutation: CreateMutation;
  /** From the same query: true until the first page has loaded. */
  isPending: boolean;
};

export type UseFeedOptimisticCreateResult = {
  /** List data for `FlatList`, including transient skeleton row(s) while creating. */
  optimisticRows: FeedRow[];
  /** Show full-screen spinner only when there is no data yet (and no optimistic row). */
  isInitialLoading: boolean;
  /** Pass to the feed chrome (`ScreenHeader` block) → `CaptureComposer` for optimistic create. */
  captureComposerProps: CaptureComposerProps;
};

/**
 * Wires React19 `useOptimistic` + `useTransition` to the feed list and capture composer.
 * Cache writes after create use `writeEntryRowToCaches` (see `entry-query-cache.ts` checklist).
 *
 * Details:
 *
 * 1. **`optimisticRows`** — server rows plus an optional leading `{ pending: true }` row during create.
 * 2. **`optimisticSubmit`** — prepends the placeholder, runs `createMutation`; `onSuccess` on the
 *    mutation merges the new row into the infinite list cache (no list refetch — avoids pull-to-refresh UI).
 * 3. **`captureComposerProps`** — ready to pass through to `CaptureComposer` on the feed screen.
 *
 * @example
 * const { data, isPending, ...rest } = useFeedEntries();
 * const createMutation = useCreateEntry();
 * const { optimisticRows, isInitialLoading, captureComposerProps } =
 *   useFeedOptimisticCreate({ infiniteData: data, createMutation, isPending });
 */
export function useFeedOptimisticCreate({
  infiniteData,
  createMutation,
  isPending,
}: UseFeedOptimisticCreateParams): UseFeedOptimisticCreateResult {
  const [isCreateTransitionPending, startCreateTransition] = useTransition();
  /** Server id from the last successful create — used to drop the placeholder once the row is in cache. */
  const lastCreatedEntryIdRef = useRef<string | null>(null);

  const baseRows: FeedRow[] = useMemo(
    () => flattenEntryListPages(infiniteData?.pages),
    [infiniteData?.pages],
  );

  const [rawOptimisticRows, addOptimisticRow] = useOptimistic(
    baseRows,
    (current, pending: FeedPendingRow): FeedRow[] => [pending, ...current],
  );

  /**
   * `useOptimistic` can still show `[placeholder, …]` while the transition runs even after
   * `writeEntryRowToCaches` has prepended the real row → duplicate cards. Remove the leading
   * placeholder only when the next row is the entry we just created.
   */
  const optimisticRows = useMemo((): FeedRow[] => {
    const rows = rawOptimisticRows;
    const createdId = lastCreatedEntryIdRef.current;
    if (
      createdId &&
      rows.length >= 2 &&
      isPendingFeedRow(rows[0]) &&
      !isPendingFeedRow(rows[1]) &&
      rows[1].id === createdId
    ) {
      return rows.slice(1);
    }
    return rows;
  }, [rawOptimisticRows]);

  const optimisticSubmit = useCallback(
    (
      input: Parameters<CreateMutation["mutateAsync"]>[0],
      callbacks: { onSuccess: () => void; onError: (e: unknown) => void },
    ) => {
      startCreateTransition(async () => {
        lastCreatedEntryIdRef.current = null;
        addOptimisticRow({ id: newOptimisticRowId(), pending: true });
        try {
          const entry = await createMutation.mutateAsync(input);
          lastCreatedEntryIdRef.current = entry.id;
          callbacks.onSuccess();
        } catch (e) {
          lastCreatedEntryIdRef.current = null;
          callbacks.onError(e);
        }
      });
    },
    [addOptimisticRow, createMutation, startCreateTransition],
  );

  const captureComposerProps = useMemo(
    (): CaptureComposerProps => ({
      mutation: createMutation,
      optimisticSubmit,
      optimisticPending: isCreateTransitionPending,
    }),
    [createMutation, optimisticSubmit, isCreateTransitionPending],
  );

  const isInitialLoading = isPending && optimisticRows.length === 0;

  return {
    optimisticRows,
    isInitialLoading,
    captureComposerProps,
  };
}
