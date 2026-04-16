import { useState, useCallback } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { useDailyReport } from '../hooks/useReports';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';

function SummaryCard({ Icon, label, value, colorClass }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

export default function Reports() {
  const { timezone, todayLocal } = useTimezone();
  const today = todayLocal();
  const [date, setDate] = useState(today);

  const { data, isLoading, isError } = useDailyReport(date);
  const { format, currency } = useCurrency();

  const revenue  = data ? parseFloat(data.summary?.total_revenue ?? 0) : null;
  const orders   = data ? parseInt(data.summary?.total_orders   ?? 0) : null;
  const avgValue = revenue && orders ? revenue / orders : 0;

  const tooltipFormatter = (v) => [format(v)];

  // Compact axis labels: ₹1.2k, ₹3.4M — stable reference so Recharts doesn't reset
  const formatTick = useCallback((v) => {
    const val = parseFloat(v) * currency.rate;
    if (val >= 1_000_000) return `${currency.symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `${currency.symbol}${(val / 1_000).toFixed(1)}k`;
    return `${currency.symbol}${val.toFixed(0)}`;
  }, [currency]);

  return (
    <div className="space-y-6">
      {/* ── Date picker ─────────────────────────────── */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Date</label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      {isLoading && (
        <div className="py-16 text-center text-sm text-slate-400">
          Loading report…
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-red-50 p-6 text-center text-sm text-red-500">
          Report unavailable — check your connection or try a different date
        </div>
      )}

      {data && (
        <>
          {/* ── Summary KPIs ────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              Icon={DollarSign}
              label="Total Revenue"
              value={revenue !== null ? format(revenue) : '—'}
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <SummaryCard
              Icon={ShoppingBag}
              label="Total Orders"
              value={orders ?? '—'}
              colorClass="bg-indigo-50 text-indigo-600"
            />
            <SummaryCard
              Icon={TrendingUp}
              label="Avg Order Value"
              value={orders ? format(avgValue) : '—'}
              colorClass="bg-amber-50 text-amber-600"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Revenue by Category ─────────────── */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">
                Revenue by Category
              </h3>
              {data.byCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    key={currency.code}
                    data={data.byCategory}
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      width={64}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                      tickFormatter={formatTick}
                    />
                    <Tooltip formatter={tooltipFormatter} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>

            {/* ── Hourly Revenue ───────────────────── */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Hourly Revenue</h3>
                <span className="text-xs text-slate-400">{timezone.label} · {timezone.offset}</span>
              </div>
              {data.hourly?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    key={currency.code}
                    data={data.hourly}
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h) => `${h}:00`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      width={64}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                      tickFormatter={formatTick}
                    />
                    <Tooltip
                      formatter={tooltipFormatter}
                      labelFormatter={(h) => `${h}:00`}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
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

          {/* ── Top Items Table ──────────────────────── */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">
              Top Selling Items
            </h3>
            {data.topItems?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Item
                      </th>
                      <th className="pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Category
                      </th>
                      <th className="pb-2 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                        Sold
                      </th>
                      <th className="pb-2 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topItems.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 font-medium text-slate-700">
                          {item.name}
                        </td>
                        <td className="py-2.5 capitalize text-slate-500">
                          {item.category}
                        </td>
                        <td className="py-2.5 text-right text-slate-600">
                          {item.total_sold}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-indigo-600">
                          {format(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No completed orders on this date
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
      No data for this date
    </div>
  );
}