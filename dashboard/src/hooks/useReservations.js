import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useReservations(date) {
  return useQuery({
    queryKey: ['reservations', date],
    queryFn: async () => {
      const { data } = await api.get('/reservations', { params: date ? { date } : {} });
      return data;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateReservation() {
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/reservations', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useUpdateReservation() {
  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.patch(`/reservations/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useDeleteReservation() {
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/reservations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useSeatReservation() {
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/reservations/${id}/seat`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useCancelReservation() {
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/reservations/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useNoShowReservation() {
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/reservations/${id}/no-show`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}
