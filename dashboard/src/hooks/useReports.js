import { useQuery } from '@tanstack/react-query';
import { db } from '../db';
import api from '../api/client';

export function useDailyReport(date) {
  const dateStr = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['reports', 'daily', dateStr],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/reports/daily?date=${dateStr}`);
        await db.reports.put({ date: dateStr, ...data, cached_at: Date.now() });
        return data;
      } catch {
        const cached = await db.reports.get(dateStr);
        if (cached) return cached;
        throw new Error('Report unavailable offline — no cached data for this date');
      }
    },
  });
}