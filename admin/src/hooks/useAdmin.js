import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

// ── Restaurants ───────────────────────────────────────────────────────────────

export function useRestaurants() {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: () => api.get('/restaurants').then((r) => r.data),
  });
}

export function useRestaurant(id) {
  return useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => api.get(`/restaurants/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => api.post('/restaurants', { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),
  });
}

export function useUpdateRestaurant(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => api.patch(`/restaurants/${id}`, { name }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurants'] });
      qc.invalidateQueries({ queryKey: ['restaurants', id] });
    },
  });
}

export function useDeleteRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/restaurants/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function useCreateUser(restaurantId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api.post(`/restaurants/${restaurantId}/users`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants', restaurantId] }),
  });
}

export function useDeleteUser(restaurantId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.delete(`/restaurants/${restaurantId}/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants', restaurantId] }),
  });
}

// ── Audit logs ────────────────────────────────────────────────────────────────

export function useAuditLogs({ restaurantId, from, to, resourceType, limit = 500 }) {
  return useQuery({
    queryKey: ['audit-logs', restaurantId, from, to, resourceType, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (restaurantId) params.set('restaurantId', restaurantId);
      if (from)         params.set('from', from);
      if (to)           params.set('to', to);
      if (resourceType) params.set('resourceType', resourceType);
      params.set('limit', limit);
      return api.get(`/audit-logs?${params}`).then((r) => r.data);
    },
    staleTime: 30_000,
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function useUpdateSetting(restaurantId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }) =>
      api.patch(`/restaurants/${restaurantId}/settings`, { key, value }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants', restaurantId] }),
  });
}
