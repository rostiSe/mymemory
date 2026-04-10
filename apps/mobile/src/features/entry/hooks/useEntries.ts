import { orpc, orpcClient } from "@/lib/orpc";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const FEED_PAGE_SIZE = 10;

export function useFeedEntries() {
  return useInfiniteQuery(
    orpc.entries.list.infiniteOptions({
      input: (pageParam: string | undefined) => ({
        limit: FEED_PAGE_SIZE,
        cursor: pageParam,
      }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
  );
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
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: orpc.entries.list.key(),
          });
        })
        .catch((err: unknown) => {
          console.error("[ai.ingest]", err);
        });
      return entry;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: orpc.entries.list.key(),
      });
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
  });
}
