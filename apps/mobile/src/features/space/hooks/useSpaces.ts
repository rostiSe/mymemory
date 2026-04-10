import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export function useSpaces() {
  return useQuery(orpc.spaces.list.queryOptions({ input: undefined }));
}

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.spaces.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
