import { orpc } from "@/lib/orpc";
import { skipToken, useQuery } from "@tanstack/react-query";

export function useSemanticSearch(query: string) {
  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2;
  return useQuery({
    ...orpc.entries.search.queryOptions({
      input: canSearch ? { query: trimmed, limit: 15 } : skipToken,
    }),
    enabled: canSearch,
    staleTime: 60_000,
  });
}
