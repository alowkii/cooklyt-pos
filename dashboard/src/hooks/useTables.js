import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../db';
import api from '../api/client';
import { enqueue } from '../store/syncQueue';
import { queryClient } from '../lib/queryClient';

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/tables');
        await db.restaurant_tables.bulkPut(data);
        return data;
      } catch {
        return db.restaurant_tables.orderBy('number').toArray();
      }
    },
  });
}

export function useUpdateTableStatus() {
  return useMutation({
    mutationFn: async ({ id, status }) => {
      // Optimistic local update
      await db.restaurant_tables.update(id, { status });

      if (navigator.onLine) {
        const { data } = await api.patch(`/tables/${id}/status`, { status });
        await db.restaurant_tables.put(data);
        return data;
      }
      await enqueue('tables', 'PATCH', { id, status });
      return { id, status };
    },
    onSuccess: (updatedTable) => {
      // Update the cache entry directly so the UI reflects the change instantly
      queryClient.setQueryData(['tables'], (old) => {
        if (!old) return old;
        return old.map((t) =>
          t.id === updatedTable.id ? { ...t, ...updatedTable } : t,
        );
      });
    },
  });
}

export function useCreateTable() {
  return useMutation({
    mutationFn: async (table) => {
      const { data } = await api.post('/tables', table);
      await db.restaurant_tables.put(data);
      return data;
    },
    onSuccess: (newTable) => {
      // Append to cache directly so grid updates instantly
      queryClient.setQueryData(['tables'], (old) =>
        old ? [...old, newTable].sort((a, b) => a.number - b.number) : [newTable],
      );
    },
  });
}
