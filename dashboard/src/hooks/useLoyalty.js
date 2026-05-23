import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useLoyaltyCustomers(search = '') {
  return useQuery({
    queryKey: ['loyalty-customers', search],
    queryFn: () =>
      api.get('/loyalty/customers', { params: search ? { search } : {} }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useLoyaltyCustomer(id) {
  return useQuery({
    queryKey: ['loyalty-customer', id],
    queryFn: () => api.get(`/loyalty/customers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useLoyaltyTransactions(id) {
  return useQuery({
    queryKey: ['loyalty-transactions', id],
    queryFn: () => api.get(`/loyalty/customers/${id}/transactions`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useLookupLoyaltyCustomer() {
  return useMutation({
    mutationFn: (phone) =>
      api.get('/loyalty/customers/lookup', { params: { phone } }).then((r) => r.data),
  });
}

export function useCreateLoyaltyCustomer() {
  return useMutation({
    mutationFn: (body) => api.post('/loyalty/customers', body).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] }),
  });
}

export function useAdjustPoints(customerId) {
  return useMutation({
    mutationFn: ({ points, description }) =>
      api.patch(`/loyalty/customers/${customerId}/adjust`, { points, description }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions', customerId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] });
    },
  });
}

export function useApplyLoyalty(orderId) {
  return useMutation({
    mutationFn: ({ phone, pointsToRedeem }) =>
      api.patch(`/orders/${orderId}/loyalty`, { phone, pointsToRedeem }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
  });
}

export function useRemoveLoyalty(orderId) {
  return useMutation({
    mutationFn: () => api.delete(`/orders/${orderId}/loyalty`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
  });
}
