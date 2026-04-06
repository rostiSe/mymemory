import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api/client';
import { ingestRequestSchema, ingestResponseSchema } from '@/lib/api/contracts';
import { z } from 'zod';

export function useIngest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof ingestRequestSchema>) => {
      return fetchApi('/api/ingest', ingestResponseSchema, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['entry', variables.entryId] });
    },
  });
}
