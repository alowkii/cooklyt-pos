import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useWasteLogs(from, to) {
  return useQuery({
    queryKey: ['waste', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to', to);
      const { data } = await api.get(`/waste?${params}`);
      return data;
    },
  });
}

export function useLogWaste() {
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/waste', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}
