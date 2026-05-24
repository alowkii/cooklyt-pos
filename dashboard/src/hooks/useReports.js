import { useQuery } from '@tanstack/react-query';
import { db } from '../db';
import api from '../api/client';
import { useTimezone } from '../context/TimezoneContext';

export function useDailyReport(date) {
  const { iana } = useTimezone();
  const dateStr = date || new Intl.DateTimeFormat('en-CA', { timeZone: iana }).format(new Date());

  return useQuery({
    queryKey: ['reports', 'daily', dateStr, iana],
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      try {
        const { data } = await api.get(
          `/reports/daily?date=${dateStr}&tz=${encodeURIComponent(iana)}`,
        );
        const parsed = {
          ...data,
          byCategory: data.byCategory?.map((r) => ({ ...r, revenue: parseFloat(r.revenue) })),
          hourly:     data.hourly?.map((r)     => ({ ...r, revenue: parseFloat(r.revenue) })),
          topItems:   data.topItems?.map((r)   => ({ ...r, revenue: parseFloat(r.revenue) })),
        };
        await db.reports.put({ date: dateStr, tz: iana, ...parsed, cached_at: Date.now() });
        return parsed;
      } catch {
        const cached = await db.reports.get(dateStr);
        if (cached) return cached;
        throw new Error('Report unavailable offline — no cached data for this date');
      }
    },
  });
}

export function useTrends(from, to, group = 'day') {
  const { iana } = useTimezone();
  const enabled = Boolean(from && to);
  return useQuery({
    queryKey: ['reports', 'trends', from, to, group, iana],
    staleTime: 60_000,
    enabled,
    queryFn: async () => {
      const { data } = await api.get(
        `/reports/trends?from=${from}&to=${to}&group=${group}&tz=${encodeURIComponent(iana)}`,
      );
      return data;
    },
  });
}

export function useItemProfitability(from, to) {
  const { iana } = useTimezone();
  const enabled = Boolean(from && to);
  return useQuery({
    queryKey: ['reports', 'items', from, to, iana],
    staleTime: 60_000,
    enabled,
    queryFn: async () => {
      const { data } = await api.get(
        `/reports/items?from=${from}&to=${to}&limit=100&tz=${encodeURIComponent(iana)}`,
      );
      return data;
    },
  });
}

export function useStaffPerformance(from, to) {
  const { iana } = useTimezone();
  const enabled = Boolean(from && to);
  return useQuery({
    queryKey: ['reports', 'staff', from, to, iana],
    staleTime: 60_000,
    enabled,
    queryFn: async () => {
      const { data } = await api.get(
        `/reports/staff?from=${from}&to=${to}&tz=${encodeURIComponent(iana)}`,
      );
      return data;
    },
  });
}
