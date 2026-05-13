import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../db';
import api from '../api/client';
import { enqueue } from '../store/syncQueue';
import { queryClient } from '../lib/queryClient';

// Kitchen queue — received, preparing, ready orders
export function useKitchenQueue() {
  return useQuery({
    queryKey: ['kitchen', 'queue'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/kitchen/queue');
        await db.kitchen.bulkPut(data);
        return data;
      } catch {
        return db.kitchen.toArray();
      }
    },
    refetchInterval: 30_000,
  });
}

// Group kitchen items into order-level summaries for the Orders page
export function useActiveOrders() {
  const { data: items = [], ...rest } = useKitchenQueue();

  const orders = Object.values(
    items.reduce((acc, item) => {
      if (!acc[item.order_id]) {
        acc[item.order_id] = {
          id:           item.order_id,
          table_id:     item.table_id,
          table_number: item.table_number,
          channel:      item.channel      || 'dining',
          customer_ref: item.customer_ref || null,
          status:       item.order_status,
          created_at:   item.order_created_at,
          items:        [],
        };
      }
      acc[item.order_id].items.push(item);
      return acc;
    }, {}),
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return { data: orders, ...rest };
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async ({ tableId, items, channel, customerRef }) => {
      const { data } = await api.post('/orders', { tableId, items, channel, customerRef });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useOrderHistory({ from, to, status, channel }) {
  return useQuery({
    queryKey: ['order-history', from, to, status, channel],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (status)  params.set('status',  status);
      if (channel) params.set('channel', channel);
      const { data } = await api.get(`/orders/history?${params}`);
      return data;
    },
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useAddItems() {
  return useMutation({
    mutationFn: async ({ orderId, items }) => {
      const { data } = await api.post(`/orders/${orderId}/items`, { items });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen'] });
    },
  });
}

export function useUpdateOrderStatus() {
  return useMutation({
    mutationFn: async ({ id, status }) => {
      if (navigator.onLine) {
        const { data } = await api.patch(`/orders/${id}/status`, { status });
        return data;
      }
      await enqueue('orders', 'PATCH', { id, status });
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
