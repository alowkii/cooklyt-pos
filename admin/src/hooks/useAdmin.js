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

// ── Settings ──────────────────────────────────────────────────────────────────

export function useUpdateSetting(restaurantId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }) =>
      api.patch(`/restaurants/${restaurantId}/settings`, { key, value }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants', restaurantId] }),
  });
}
