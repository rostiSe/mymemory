import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc';

export function useIngest() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.ai.ingest.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
