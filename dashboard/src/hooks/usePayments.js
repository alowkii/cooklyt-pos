import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useBill(orderId, { itemIds = null, waiveServiceCharge = false } = {}) {
  const key = itemIds?.length ? itemIds.join(',') : null;
  return useQuery({
    queryKey: ['bill', orderId, key, waiveServiceCharge],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (itemIds?.length) params.set('itemIds', itemIds.join(','));
      if (waiveServiceCharge) params.set('waive', 'true');
      const query = params.toString() ? `?${params}` : '';
      const { data } = await api.get(`/payments/${orderId}/bill${query}`);
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
    mutationFn: async ({ orderId, method, tenders, amountTendered, waiveServiceCharge }) => {
      const body = tenders ? { tenders } : { method };
      if (!tenders && amountTendered !== undefined) body.amountTendered = parseFloat(amountTendered);
      if (waiveServiceCharge) body.waiveServiceCharge = true;
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
    mutationFn: async ({ orderId, splits, waiveServiceCharge }) => {
      const { data } = await api.post(`/payments/${orderId}/split`, { splits, waiveServiceCharge });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}
