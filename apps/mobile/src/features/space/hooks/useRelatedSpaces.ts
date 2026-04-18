import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function useRelatedSpaces(spaceId: string | undefined) {
  return useQuery({
    ...orpc.spaces.relatedSpaces.queryOptions({
      input: { spaceId: spaceId ?? "" },
    }),
    enabled: typeof spaceId === "string" && spaceId.length > 0,
    staleTime: 30_000,
  });
}
