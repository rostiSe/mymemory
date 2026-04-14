import type { WikiCompileResult } from "@/features/wiki/types";
import { useAppToast } from "@/hooks/useAppToast";
import { orpc } from "@/lib/orpc";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

/** Rough USD estimate for input-side token cost (documentation-only; model pricing varies). */
const ESTIMATED_USD_PER_MILLION_INPUT_TOKENS = 0.15;

export type WikiCompileSummary = {
  createdCount: number;
  updatedCount: number;
  spacesProcessed: number;
  tokensLabel: string;
  costLabel: string;
  orchestratorError: string | undefined;
};

export function summarizeWikiCompileResult(
  result: WikiCompileResult,
): WikiCompileSummary {
  let createdCount = 0;
  let updatedCount = 0;
  for (const w of result.writers) {
    createdCount += w.result.pagesCreated.length;
    updatedCount += w.result.pagesUpdated.length;
  }
  const spacesProcessed = result.writers.length;
  const cost =
    (result.totalTokens / 1_000_000) * ESTIMATED_USD_PER_MILLION_INPUT_TOKENS;
  const costLabel = `~$${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}`;
  const tokensLabel =
    result.totalTokens >= 1000
      ? `~${Math.round(result.totalTokens / 100) / 10}k`
      : `${result.totalTokens}`;

  return {
    createdCount,
    updatedCount,
    spacesProcessed,
    tokensLabel,
    costLabel,
    orchestratorError: result.error,
  };
}

function invalidateWikiAndSpaces(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    predicate: (q) => {
      const head = q.queryKey[0];
      return Array.isArray(head) && head[0] === "wiki";
    },
  });
  void queryClient.invalidateQueries({
    queryKey: orpc.spaces.list.queryKey({ input: undefined }),
  });
}

export function useCompileWiki() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.wiki.compile.mutationOptions(),
    onSuccess: () => {
      invalidateWikiAndSpaces(queryClient);
    },
  });
}

export function useLintWiki() {
  const toast = useAppToast();

  return useMutation({
    ...orpc.wiki.lint.mutationOptions(),
    onError: (err) => {
      toast.error(
        "Health check failed",
        err instanceof Error ? err.message : "Request failed",
      );
    },
  });
}
