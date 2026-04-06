import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api/client';
import { 
  getSpacesResponseSchema, 
  createSpaceRequestSchema, 
  createSpaceResponseSchema 
} from '@/lib/api/contracts';
import { z } from 'zod';

export function useSpaces() {
  return useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const result = await fetchApi('/api/spaces', getSpacesResponseSchema);
      return result.data || [];
    },
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof createSpaceRequestSchema>) => {
      return fetchApi('/api/spaces', createSpaceResponseSchema, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}
