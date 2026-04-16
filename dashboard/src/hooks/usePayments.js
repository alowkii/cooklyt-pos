import { useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '../lib/queryClient';

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
