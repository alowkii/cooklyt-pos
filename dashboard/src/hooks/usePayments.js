import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useBill(orderId, itemIds = null) {
  const key = itemIds?.length ? itemIds.join(',') : null;
  return useQuery({
    queryKey: ['bill', orderId, key],
    queryFn: async () => {
      const params = itemIds?.length ? `?itemIds=${itemIds.join(',')}` : '';
      const { data } = await api.get(`/payments/${orderId}/bill${params}`);
      return data;
    },
    enabled: !!orderId,
    staleTime: 30_000,
  });
}

export function useApplyDiscount(orderId) {
  return useMutation({
    mutationFn: async ({ discountType, discountValue }) => {
      const { data } = await api.patch(`/orders/${orderId}/discount`, { discountType, discountValue });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', orderId] });
    },
  });
}

export function useProcessPayment() {
  return useMutation({
    mutationFn: async ({ orderId, method, tenders, amountTendered }) => {
      const body = tenders ? { tenders } : { method };
      if (!tenders && amountTendered !== undefined) body.amountTendered = parseFloat(amountTendered);
      const { data } = await api.post(`/payments/${orderId}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useProcessSplitPayment() {
  return useMutation({
    mutationFn: async ({ orderId, splits }) => {
      const { data } = await api.post(`/payments/${orderId}/split`, { splits });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}
