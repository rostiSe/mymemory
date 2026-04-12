import {
  entryDetailQueryKey,
  invalidateEntriesDomain,
  removeEntryRowFromCaches,
  writeEntryMutationResultToCaches,
  writeEntryRowToCaches,
} from "@/features/entry/entry-query-cache";
import type { EntryDetailRow } from "@/features/entry/types";
import { orpcClient } from "@/lib/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ToggleFieldInput = {
  id: string;
  field: "isFavorited" | "isPinned" | "isArchived";
  value: boolean;
};

type SetReviewStatusInput = {
  id: string;
  status: "unreviewed" | "kept" | "dismissed" | "remind";
};

export function useToggleEntryField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ToggleFieldInput) =>
      orpcClient.entries.toggleField(input),
    onMutate: async (input) => {
      const key = entryDetailQueryKey(input.id);
      const prev = queryClient.getQueryData<EntryDetailRow | undefined>(key);
      if (input.field === "isArchived" && input.value === true) {
        return { prev };
      }
      if (prev) {
        queryClient.setQueryData<EntryDetailRow>(key, {
          ...prev,
          [input.field]: input.value,
        });
      }
      return { prev };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(entryDetailQueryKey(input.id), ctx.prev);
      }
    },
    onSuccess: (result, variables) => {
      if (variables.field === "isArchived" && variables.value === true) {
        removeEntryRowFromCaches(queryClient, result.id);
        return;
      }
      writeEntryMutationResultToCaches(queryClient, result);
    },
  });
}

export function useSetReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetReviewStatusInput) =>
      orpcClient.entries.setReviewStatus(input),
    onMutate: async (input) => {
      const key = entryDetailQueryKey(input.id);
      const prev = queryClient.getQueryData<EntryDetailRow | undefined>(key);
      if (prev) {
        queryClient.setQueryData<EntryDetailRow>(key, {
          ...prev,
          reviewStatus: input.status,
        });
      }
      return { prev };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(entryDetailQueryKey(input.id), ctx.prev);
      }
    },
    onSuccess: (result) => {
      writeEntryMutationResultToCaches(queryClient, result);
    },
  });
}

export function useTrackRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) =>
      orpcClient.entries.trackRead(input),
    onSuccess: (result) => {
      writeEntryMutationResultToCaches(queryClient, result);
    },
  });
}

export function useRetryIngest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const resetEntry = await orpcClient.entries.retryIngest(input);
      writeEntryMutationResultToCaches(queryClient, resetEntry);
      void orpcClient.ai
        .ingest({ entryId: resetEntry.id })
        .then((result) => {
          writeEntryRowToCaches(queryClient, result.data);
        })
        .catch((err: unknown) => {
          console.error("[ai.ingest retry]", err);
          invalidateEntriesDomain(queryClient);
        });
      return resetEntry;
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) => orpcClient.entries.delete(input),
    onSuccess: (_result, input) => {
      removeEntryRowFromCaches(queryClient, input.id);
    },
  });
}
