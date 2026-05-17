import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Trash2, TrendingUp } from 'lucide-react';
import { useDailyReport } from '../hooks/useReports';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';

function StatCard({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '16px 20px', background: 'var(--paper)' }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', marginBottom: 6 }}>
        {label}
      </p>
      <p className="mono num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{value}</p>
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const { timezone, todayLocal } = useTimezone();
  const today = todayLocal();
  const [date, setDate] = useState(today);

  const { data, isLoading, isError } = useDailyReport(date);
  const { format, currency } = useCurrency();

  const revenue  = data ? parseFloat(data.summary?.total_revenue ?? 0) : null;
  const orders   = data ? parseInt(data.summary?.total_orders   ?? 0) : null;
  const avgValue = revenue && orders ? revenue / orders : 0;

  const tooltipFormatter = (v) => [format(v)];

  const formatTick = useCallback((v) => {
    const val = parseFloat(v);
    if (val >= 1_000_000) return `${currency.symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `${currency.symbol}${(val / 1_000).toFixed(1)}k`;
    return `${currency.symbol}${val.toFixed(0)}`;
  }, [currency]);

  return (
    <div className="space-y-5">
      {/* Date picker + quick links */}
      <div className="flex flex-wrap items-center gap-3">
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)', flexShrink: 0 }}>Date</label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="input w-full max-w-[200px]"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate('/waste')}
            className="flex items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium transition-colors duration-75"
            style={{ height: 32, border: '1px solid var(--line-2)', background: 'var(--paper)', color: 'var(--mute)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.color = 'var(--mute)'; }}
          >
            <Trash2 size={13} />
            Waste Log
          </button>
          <button
            onClick={() => navigate('/costing')}
            className="flex items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium transition-colors duration-75"
            style={{ height: 32, border: '1px solid var(--line-2)', background: 'var(--paper)', color: 'var(--mute)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.color = 'var(--mute)'; }}
          >
            <TrendingUp size={13} />
            Costing
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>
          Loading report…
        </div>
      )}

      {isError && (
        <div
          className="rounded-[8px] p-6 text-center"
          style={{ fontSize: 13, color: 'var(--bad)', background: 'rgba(179,55,43,.06)', border: '1px solid rgba(179,55,43,.15)' }}
        >
          Report unavailable — check your connection or try a different date
        </div>
      )}

      {data && (
        <>
          {/* Summary KPIs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total Revenue" value={revenue !== null ? format(revenue) : '—'} />
            <StatCard label="Total Orders"  value={orders ?? '—'} />
            <StatCard label="Avg Order Value" value={orders ? format(avgValue) : '—'} />
          </div>

          {/* Top Items Table */}
          <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Top Selling Items</p>
            </div>
            {data.topItems?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Item</th>
                      <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Category</th>
                      <th className="px-5 py-3 text-right" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Sold</th>
                      <th className="px-5 py-3 text-right" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td className="px-5 py-2.5" style={{ fontWeight: 500, color: 'var(--ink)' }}>{item.name}</td>
                        <td className="px-5 py-2.5 capitalize" style={{ color: 'var(--mute)' }}>{item.category}</td>
                        <td className="px-5 py-2.5 text-right mono num" style={{ color: 'var(--ink)' }}>{item.total_sold}</td>
                        <td className="px-5 py-2.5 text-right mono num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{format(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-4" style={{ fontSize: 13, color: 'var(--mute)' }}>
                No completed orders on this date
              </p>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Revenue by Category */}
            <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>
                Revenue by Category
              </p>
              {data.byCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    key={currency.code}
                    data={data.byCategory}
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} />
                    <YAxis
                      width={64}
                      tick={{ fontSize: 11, fill: 'var(--mute)' }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                      tickFormatter={formatTick}
                    />
                    <Tooltip
                      formatter={tooltipFormatter}
                      contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)' }}
                    />
                    <Bar dataKey="revenue" fill="var(--ink)" radius={[3, 3, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>

            {/* Hourly Revenue */}
            <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
              <div className="flex items-baseline justify-between mb-4">
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Hourly Revenue</p>
                <span style={{ fontSize: 11, color: 'var(--mute)' }}>{timezone.label} · {timezone.offset}</span>
              </div>
              {data.hourly?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    key={currency.code}
                    data={data.hourly}
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h) => `${h}:00`}
                      tick={{ fontSize: 11, fill: 'var(--mute)' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={64}
                      tick={{ fontSize: 11, fill: 'var(--mute)' }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                      tickFormatter={formatTick}
                    />
                    <Tooltip
                      formatter={tooltipFormatter}
                      labelFormatter={(h) => `${h}:00`}
                      contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--ink)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center" style={{ fontSize: 13, color: 'var(--mute)' }}>
      No data for this date
    </div>
  );
}
