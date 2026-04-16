import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 minutes — serve cache, refetch in background
      gcTime: 1000 * 60 * 60,         // 1 hour — keep in memory for offline fallback
      retry: (failureCount, error) => {
        // Never retry client errors (4xx) — only transient network failures
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});