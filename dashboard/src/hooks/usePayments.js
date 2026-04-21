import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useBill(orderId) {
  return useQuery({
    queryKey: ['bill', orderId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/${orderId}/bill`);
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
    mutationFn: async ({ orderId, method, amountTendered }) => {
      const body = { method };
      if (amountTendered !== undefined) body.amountTendered = parseFloat(amountTendered);
      const { data } = await api.post(`/payments/${orderId}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}
