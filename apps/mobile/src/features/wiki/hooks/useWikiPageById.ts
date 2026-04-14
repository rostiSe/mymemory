import { isUuid } from "@/features/wiki/types";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

function normalizeRouteParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function useWikiPageById(id: string | string[] | undefined) {
  const pageId = normalizeRouteParam(id);
  const enabled = Boolean(pageId?.length && isUuid(pageId));

  return useQuery({
    ...orpc.wiki.getPage.queryOptions({
      input: { id: pageId as string },
    }),
    enabled,
  });
}
