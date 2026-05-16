import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useCombos() {
  return useQuery({
    queryKey: ['combos'],
    queryFn: async () => {
      const { data } = await api.get('/combos');
      return data;
    },
  });
}

export function useCreateCombo() {
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/combos', body);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['combos'] }),
  });
}

export function useUpdateCombo() {
  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.patch(`/combos/${id}`, body);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['combos'] }),
  });
}
