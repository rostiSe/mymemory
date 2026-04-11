import {
  ENTRY_DETAIL_PROCESSING_REFETCH_INTERVAL_MS,
  ENTRY_QUERIES_STALE_TIME_MS,
} from "@/lib/config/query";
import { orpc, orpcClient } from "@/lib/orpc";
import {
  invalidateEntriesDomain,
  writeEntryRowToCaches,
} from "@/features/entry/entry-query-cache";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const FEED_PAGE_SIZE = 10;

export function useFeedEntries() {
  return useInfiniteQuery({
    ...orpc.entries.list.infiniteOptions({
      input: (pageParam: string | undefined) => ({
        limit: FEED_PAGE_SIZE,
        cursor: pageParam,
      }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
    staleTime: ENTRY_QUERIES_STALE_TIME_MS,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Parameters<typeof orpcClient.entries.create>[0],
    ) => {
      const entry = await orpcClient.entries.create(input);
      void orpcClient.ai
        .ingest({ entryId: entry.id })
        .then((result) => {
          writeEntryRowToCaches(queryClient, result.data);
        })
        .catch((err: unknown) => {
          console.error("[ai.ingest]", err);
          invalidateEntriesDomain(queryClient);
        });
      return entry;
    },
    onSuccess: (entry) => {
      writeEntryRowToCaches(queryClient, entry);
    },
  });
}

function normalizeRouteParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function useEntryById(id: string | string[] | undefined) {
  const entryId = normalizeRouteParam(id);
  const enabled = Boolean(entryId?.length);

  return useQuery({
    ...orpc.entries.getById.queryOptions({ input: { id: entryId as string } }),
    enabled,
    staleTime: ENTRY_QUERIES_STALE_TIME_MS,
    refetchInterval: (query) => {
      const row = query.state.data;
      if (
        row &&
        (row.processedStatus === "pending" ||
          row.processedStatus === "processing")
      ) {
        return ENTRY_DETAIL_PROCESSING_REFETCH_INTERVAL_MS;
      }
      return false;
    },
  });
}
