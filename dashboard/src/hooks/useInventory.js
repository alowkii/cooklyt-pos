import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useInventoryTransactions({ ingredientId, type, from, to, limit } = {}) {
  return useQuery({
    queryKey: ['inventory-transactions', ingredientId, type, from, to, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ingredientId) params.set('ingredientId', ingredientId);
      if (type)         params.set('type', type);
      if (from)         params.set('from', from);
      if (to)           params.set('to', to);
      if (limit)        params.set('limit', limit);
      const { data } = await api.get(`/inventory/transactions?${params}`);
      return data;
    },
  });
}

export function useWasteReport(from, to) {
  return useQuery({
    queryKey: ['waste-report', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to', to);
      const { data } = await api.get(`/inventory/waste-report?${params}`);
      return data;
    },
  });
}

export function useRecordAdjustment() {
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/inventory/adjustment', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
  });
}
