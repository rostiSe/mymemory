import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export function useEntries() {
  return useQuery(orpc.entries.list.queryOptions({ input: undefined }));
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.entries.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries();
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
    enabled
  });
}
