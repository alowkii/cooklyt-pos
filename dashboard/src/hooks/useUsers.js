import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users');
      return data;
    },
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: async ({ email, password, role }) => {
      const { data } = await api.post('/auth/register', { email, password, role });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/auth/users/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUserRole() {
  return useMutation({
    mutationFn: async ({ id, role }) => {
      const { data } = await api.patch(`/auth/users/${id}/role`, { role });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
