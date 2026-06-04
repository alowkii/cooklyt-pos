import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useWastageReviews(status) {
  return useQuery({
    queryKey: ['wastage-reviews', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get(`/wastage-reviews${params}`);
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useResolveWastageReview() {
  return useMutation({
    mutationFn: async ({ id, ingredients }) => {
      const { data } = await api.post(`/wastage-reviews/${id}/resolve`, { ingredients });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wastage-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['waste'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

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

export function useLogWasteByMenuItem() {
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/waste/by-menu-item', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}
