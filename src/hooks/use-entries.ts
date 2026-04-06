import { fetchApi } from "@/lib/api/client";
import {
  createEntryRequestSchema,
  createEntryResponseSchema,
  getEntriesResponseSchema,
  getEntryByIdResponseSchema,
} from "@/lib/api/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

export function useEntries() {
  return useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      const result = await fetchApi("/api/entries", getEntriesResponseSchema);
      return result.data || [];
    },
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof createEntryRequestSchema>) => {
      return fetchApi("/api/entries", createEntryResponseSchema, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
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
    queryKey: ["entry", entryId],
    enabled,
    queryFn: async () => {
      if (!entryId) return null;
      const result = await fetchApi(
        `/api/entries/${entryId}`,
        getEntryByIdResponseSchema,
      );
      return result.data ?? null;
    },
  });
}
