import { orpc } from "@/lib/orpc";
import type { appContract } from "@mymemory/shared";
import type { InferContractRouterOutputs } from "@orpc/contract";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

const spacesListKey = orpc.spaces.list.queryKey({ input: undefined });
const spaceSuggestionsKey = orpc.spaces.listSuggestions.queryKey({
  input: undefined,
});

type SpaceListRow = InferContractRouterOutputs<
  typeof appContract
>["spaces"]["list"][number];
type SuggestionRow = InferContractRouterOutputs<
  typeof appContract
>["spaces"]["listSuggestions"][number];

function invalidateSpacesDomain(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: spacesListKey });
  void queryClient.invalidateQueries({ queryKey: spaceSuggestionsKey });
}

function spaceRowFromServer(
  row: InferContractRouterOutputs<typeof appContract>["spaces"]["approveSuggestion"],
  entryCount: number,
): SpaceListRow {
  return {
    ...row,
    description: row.description ?? undefined,
    centroidVector: row.centroidVector ?? undefined,
    entryCount,
  };
}

export function useSpaces() {
  return useQuery(orpc.spaces.list.queryOptions({ input: undefined }));
}

export function useSpace(id: string | undefined) {
  return useQuery({
    ...orpc.spaces.getById.queryOptions({
      input: { id: id ?? "" },
    }),
    enabled: typeof id === "string" && id.length > 0,
  });
}

export function useSpaceSuggestions() {
  return useQuery(orpc.spaces.listSuggestions.queryOptions({ input: undefined }));
}

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.spaces.create.mutationOptions(),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: spacesListKey });
      const previousSpaces = queryClient.getQueryData<SpaceListRow[]>(spacesListKey);
      const userId = previousSpaces?.[0]?.userId;
      if (!userId) {
        return { previousSpaces, optimisticId: undefined as string | undefined };
      }
      const optimisticId = crypto.randomUUID();
      const now = new Date();
      const optimisticRow: SpaceListRow = {
        id: optimisticId,
        userId,
        name: input.name,
        description: input.description ?? undefined,
        centroidVector: undefined,
        createdAt: now,
        updatedAt: now,
        entryCount: 0,
      };
      queryClient.setQueryData<SpaceListRow[]>(spacesListKey, (old) => [
        ...(old ?? []),
        optimisticRow,
      ]);
      return { previousSpaces, optimisticId };
    },
    onSuccess: (newSpace, _input, context) => {
      const resolved = spaceRowFromServer(newSpace, 0);
      queryClient.setQueryData<SpaceListRow[]>(spacesListKey, (old) => {
        if (!old?.length) return [resolved];
        if (context?.optimisticId) {
          return old.map((s) =>
            s.id === context.optimisticId ? resolved : s,
          );
        }
        if (old.some((s) => s.id === resolved.id)) {
          return old.map((s) => (s.id === resolved.id ? resolved : s));
        }
        return [...old, resolved];
      });
    },
    onError: (_err, _input, context) => {
      if (context?.previousSpaces !== undefined) {
        queryClient.setQueryData(spacesListKey, context.previousSpaces);
      }
      invalidateSpacesDomain(queryClient);
    },
  });
}

export function useApproveSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.spaces.approveSuggestion.mutationOptions(),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: spaceSuggestionsKey });
      await queryClient.cancelQueries({ queryKey: spacesListKey });

      const previousSuggestions = queryClient.getQueryData<SuggestionRow[]>(
        spaceSuggestionsKey,
      );
      const previousSpaces = queryClient.getQueryData<SpaceListRow[]>(spacesListKey);
      const suggestionRow = previousSuggestions?.find(
        (s) => s.id === variables.suggestionId,
      );
      const resolvedSpaceName =
        variables.spaceName ?? suggestionRow?.suggestedName ?? "Space";

      queryClient.setQueryData<SuggestionRow[]>(
        spaceSuggestionsKey,
        (old) => old?.filter((s) => s.id !== variables.suggestionId) ?? [],
      );

      const targetExistingSpaceId =
        variables.spaceId
        ?? (variables.spaceName ? undefined : suggestionRow?.suggestedSpaceId ?? undefined);

      let optimisticSpaceId: string | undefined;

      if (targetExistingSpaceId) {
        queryClient.setQueryData<SpaceListRow[]>(spacesListKey, (old) =>
          old?.map((s) =>
            s.id === targetExistingSpaceId
              ? { ...s, entryCount: s.entryCount + 1 }
              : s,
          ) ?? [],
        );
      } else {
        const userId = previousSpaces?.[0]?.userId;
        if (userId) {
          optimisticSpaceId = crypto.randomUUID();
          const now = new Date();
          const optimisticRow: SpaceListRow = {
            id: optimisticSpaceId,
            userId,
            name: resolvedSpaceName,
            description: undefined,
            centroidVector: undefined,
            createdAt: now,
            updatedAt: now,
            entryCount: 1,
          };
          queryClient.setQueryData<SpaceListRow[]>(spacesListKey, (old) => [
            optimisticRow,
            ...(old ?? []),
          ]);
        }
      }

      return {
        previousSuggestions,
        previousSpaces,
        optimisticSpaceId,
        targetExistingSpaceId,
      };
    },
    onSuccess: (newSpace, _variables, context) => {
      if (context?.targetExistingSpaceId) {
        // Assigned to existing space — optimistic count bump already applied. Sync server fields.
        queryClient.setQueryData<SpaceListRow[]>(spacesListKey, (old) =>
          old?.map((s) =>
            s.id === newSpace.id
              ? {
                  ...s,
                  name: newSpace.name,
                  description: newSpace.description ?? undefined,
                  centroidVector: newSpace.centroidVector ?? undefined,
                  updatedAt: newSpace.updatedAt,
                }
              : s,
          ) ?? [],
        );
        return;
      }

      const resolved = spaceRowFromServer(newSpace, 1);
      queryClient.setQueryData<SpaceListRow[]>(spacesListKey, (old) => {
        if (!old?.length) return [resolved];
        const withoutTemp = context?.optimisticSpaceId
          ? old.filter((s) => s.id !== context.optimisticSpaceId)
          : old;
        const deduped = withoutTemp.filter((s) => s.id !== resolved.id);
        return [resolved, ...deduped];
      });
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSuggestions !== undefined) {
        queryClient.setQueryData(spaceSuggestionsKey, context.previousSuggestions);
      }
      if (context?.previousSpaces !== undefined) {
        queryClient.setQueryData(spacesListKey, context.previousSpaces);
      } else {
        invalidateSpacesDomain(queryClient);
      }
    },
  });
}

export function useRejectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.spaces.rejectSuggestion.mutationOptions(),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: spaceSuggestionsKey });
      const previousSuggestions = queryClient.getQueryData<SuggestionRow[]>(
        spaceSuggestionsKey,
      );
      queryClient.setQueryData<SuggestionRow[]>(
        spaceSuggestionsKey,
        (old) => old?.filter((s) => s.id !== variables.suggestionId) ?? [],
      );
      return { previousSuggestions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSuggestions !== undefined) {
        queryClient.setQueryData(spaceSuggestionsKey, context.previousSuggestions);
      } else {
        invalidateSpacesDomain(queryClient);
      }
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.spaces.delete.mutationOptions(),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: spacesListKey });
      const previousSpaces = queryClient.getQueryData<SpaceListRow[]>(spacesListKey);
      queryClient.setQueryData<SpaceListRow[]>(
        spacesListKey,
        (old) => old?.filter((s) => s.id !== variables.id) ?? [],
      );
      return { previousSpaces };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSpaces !== undefined) {
        queryClient.setQueryData(spacesListKey, context.previousSpaces);
      } else {
        invalidateSpacesDomain(queryClient);
      }
    },
  });
}
