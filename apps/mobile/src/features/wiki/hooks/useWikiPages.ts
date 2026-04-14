import { isUuid } from "@/features/wiki/types";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function useWikiPages(spaceId?: string) {
  return useQuery(
    orpc.wiki.listPages.queryOptions({
      input: spaceId ? { spaceId } : {},
    }),
  );
}

export function useWikiPageVersions(pageId: string | undefined, limit = 50) {
  const enabled = typeof pageId === "string" && isUuid(pageId);

  return useQuery({
    ...orpc.wiki.getPageVersions.queryOptions({
      input: { pageId: pageId as string, limit },
    }),
    enabled,
  });
}

export function useCompilationStatus() {
  return useQuery({
    ...orpc.wiki.status.queryOptions({ input: undefined }),
    refetchInterval: (query) =>
      query.state.data?.status === "compiling" ? 3000 : false,
  });
}

export function useWikiLogs(
  runId: string | undefined,
  limit: number,
  enabled: boolean,
) {
  return useQuery({
    ...orpc.wiki.logs.queryOptions({
      input: {
        ...(runId ? { runId } : {}),
        limit,
      },
    }),
    enabled: enabled && typeof runId === "string" && runId.length > 0,
  });
}
