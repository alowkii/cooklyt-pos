import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Trash2, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { useDailyReport, useTrends, useItemProfitability, useStaffPerformance, useItemsTrend, useStaffTrend } from '../hooks/useReports';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';

// ── Date helpers ──────────────────────────────────────────────────────────────

function localToday(iana) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: iana }).format(new Date());
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function firstOfMonth(dateStr) {
  return dateStr.slice(0, 7) + '-01';
}

function lastOfMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

function prevMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7) + '-01';
}

function PRESETS(today) {
  const ym = today.slice(0, 7);
  const prevYm = prevMonth(today).slice(0, 7);
  return [
    { label: 'Today',       from: today,           to: today },
    { label: 'Yesterday',   from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: 'Last 7 days', from: shiftDate(today, -6), to: today },
    { label: 'Last 30 days',from: shiftDate(today, -29),to: today },
    { label: 'This month',  from: firstOfMonth(today),  to: today },
    { label: 'Last month',  from: prevYm + '-01',        to: lastOfMonth(prevYm + '-01') },
  ];
}

// Colors drawn directly from the design token palette
const SERIES_COLORS = ['#0A0A0A', '#1f8a5b', '#b3781f', '#1f5bb3', '#b3372b', '#6E6D67', '#2A2A28', '#9B9A92'];

function SeriesLegend({ names }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      {names.map((name, i) => (
        <span key={name} className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--mute)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: SERIES_COLORS[i % SERIES_COLORS.length], flexShrink: 0 }} />
          {name}
        </span>
      ))}
    </div>
  );
}

function periodLabel(period, group) {
  if (group === 'month') return period.slice(0, 7);
  if (group === 'week')  return `w/c ${period.slice(5)}`;
  return period.slice(5);
}

function pivotRows(rows, nameKey, valueKey) {
  const names = [...new Set(rows.map((r) => r[nameKey]))];
  const map = {};
  rows.forEach((r) => {
    if (!map[r.period]) map[r.period] = { period: r.period };
    map[r.period][r[nameKey]] = r[valueKey];
  });
  return { names, data: Object.values(map).sort((a, b) => a.period.localeCompare(b.period)) };
}

function GroupToggle({ group, setGroup }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 12, color: 'var(--mute)' }}>Group by</span>
      {['day', 'week', 'month'].map((g) => (
        <button
          key={g}
          onClick={() => setGroup(g)}
          className="rounded-[6px] px-3 capitalize transition-colors duration-75"
          style={{
            height: 30, fontSize: 12, fontWeight: 500,
            background: group === g ? 'var(--ink)' : 'var(--paper)',
            color:      group === g ? 'var(--paper)' : 'var(--mute)',
            border: '1px solid var(--line-2)',
          }}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────────

function KpiCard({ label, value, sub }) {
  return (
    <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '16px 20px', background: 'var(--paper)' }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', marginBottom: 6 }}>
        {label}
      </p>
      <p className="mono num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: sub ? 4 : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--mute)' }}>{sub}</p>}
    </div>
  );
}

function EmptyChart({ height = 220 }) {
  return (
    <div className="flex items-center justify-center" style={{ height, fontSize: 13, color: 'var(--mute)' }}>
      No data for this period
    </div>
  );
}

function TableHead({ cols }) {
  return (
    <thead>
      <tr style={{ borderBottom: '1px solid var(--line)' }}>
        {cols.map(({ label, align = 'left' }) => (
          <th
            key={label}
            className={`px-5 py-3 text-${align}`}
            style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', whiteSpace: 'nowrap' }}
          >
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function MarginBadge({ pct }) {
  if (pct == null) return <span style={{ fontSize: 11, color: 'var(--mute)' }}>—</span>;
  const color = pct >= 60 ? 'var(--ok)' : pct >= 35 ? '#d97706' : 'var(--bad)';
  const Icon  = pct >= 60 ? TrendingUp : pct >= 35 ? Minus : TrendingDown;
  return (
    <span className="flex items-center justify-end gap-1" style={{ fontSize: 12, fontWeight: 600, color }}>
      <Icon size={11} />
      {pct.toFixed(1)}%
    </span>
  );
}

function Spinner() {
  return (
    <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>
      Loading…
    </div>
  );
}

function ErrorMsg() {
  return (
    <div className="rounded-[8px] p-6 text-center" style={{ fontSize: 13, color: 'var(--bad)', background: 'rgba(179,55,43,.06)', border: '1px solid rgba(179,55,43,.15)' }}>
      Report unavailable — check your connection or try a different range
    </div>
  );
}

// ── Tab components ────────────────────────────────────────────────────────────

function OverviewTab({ from, to, daily }) {
  const { format, currency } = useCurrency();
  const { timezone } = useTimezone();
  const isSingleDay = from === to;

  const fmtTick = useCallback((v) => {
    const val = parseFloat(v);
    if (val >= 1_000_000) return `${currency.symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `${currency.symbol}${(val / 1_000).toFixed(1)}k`;
    return `${currency.symbol}${val.toFixed(0)}`;
  }, [currency]);

  if (!daily) return null;

  const revenue  = parseFloat(daily.summary?.total_revenue ?? 0);
  const orders   = parseInt(daily.summary?.total_orders ?? 0, 10);
  const avgValue = orders > 0 ? revenue / orders : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Revenue"        value={format(revenue)} />
        <KpiCard label="Orders"         value={orders} />
        <KpiCard label="Avg Order Value" value={orders > 0 ? format(avgValue) : '—'} />
      </div>

      {/* Top Items — only meaningful for single day; multi-day: direct to Items tab */}
      {isSingleDay ? (
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Top Selling Items</p>
          </div>
          {daily.topItems?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 13 }}>
                <TableHead cols={[{ label: 'Item' }, { label: 'Category' }, { label: 'Sold', align: 'right' }, { label: 'Revenue', align: 'right' }]} />
                <tbody>
                  {daily.topItems.map((item, i) => (
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
            <p className="px-5 py-4" style={{ fontSize: 13, color: 'var(--mute)' }}>No completed orders on this date</p>
          )}
        </div>
      ) : (
        <div className="rounded-[8px] px-5 py-4" style={{ fontSize: 13, color: 'var(--mute)', border: '1px solid var(--line-2)', background: 'var(--paper)' }}>
          Switch to the <strong style={{ color: 'var(--ink)' }}>Trends</strong> tab for the revenue chart, or <strong style={{ color: 'var(--ink)' }}>Items</strong> for a full item breakdown across this date range.
        </div>
      )}

      {isSingleDay && <div className="grid gap-5 lg:grid-cols-2">
        {/* Revenue by Category */}
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Revenue by Category</p>
          {daily.byCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily.byCategory} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} />
                <YAxis width={64} tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} axisLine={false}
                  domain={[0, (m) => Math.ceil(m * 1.2)]} tickFormatter={fmtTick} />
                <Tooltip formatter={(v) => [format(v)]} contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)' }} />
                <Bar dataKey="revenue" fill="var(--ink)" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Hourly Revenue (single day only) */}
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
          <div className="flex items-baseline justify-between mb-4">
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Hourly Revenue</p>
            {isSingleDay && <span style={{ fontSize: 11, color: 'var(--mute)' }}>{timezone.label}</span>}
          </div>
          {isSingleDay && daily.hourly?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily.hourly} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} />
                <YAxis width={64} tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} axisLine={false}
                  domain={[0, (m) => Math.ceil(m * 1.2)]} tickFormatter={fmtTick} />
                <Tooltip formatter={(v) => [format(v)]} labelFormatter={(h) => `${h}:00`} contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)' }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--ink)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center" style={{ fontSize: 13, color: 'var(--mute)' }}>
              No hourly data
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}

function TrendsTab({ from, to }) {
  const [group, setGroup] = useState('day');
  const { data, isLoading, isError } = useTrends(from, to, group);
  const { format, currency } = useCurrency();

  const fmtTick = useCallback((v) => {
    const val = parseFloat(v);
    if (val >= 1_000_000) return `${currency.symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `${currency.symbol}${(val / 1_000).toFixed(1)}k`;
    return `${currency.symbol}${val.toFixed(0)}`;
  }, [currency]);

  const totals = useMemo(() => {
    if (!data?.rows) return null;
    const revenue = data.rows.reduce((s, r) => s + r.revenue, 0);
    const orders  = data.rows.reduce((s, r) => s + r.orders, 0);
    return { revenue, orders, avg: orders > 0 ? revenue / orders : 0 };
  }, [data]);

  const periodLabel = (p) => {
    if (group === 'month') return p.slice(0, 7);
    if (group === 'week')  return `w/c ${p.slice(5)}`;
    return p.slice(5); // MM-DD
  };

  const chartData = data?.rows?.map((r) => ({ ...r, label: periodLabel(r.period) }));

  return (
    <div className="space-y-5">
      <GroupToggle group={group} setGroup={setGroup} />

      {isLoading && <Spinner />}
      {isError   && <ErrorMsg />}

      {totals && (
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Total Revenue"   value={format(totals.revenue)} />
          <KpiCard label="Total Orders"    value={totals.orders} />
          <KpiCard label="Avg Order Value" value={totals.orders > 0 ? format(totals.avg) : '—'} />
        </div>
      )}

      {chartData && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Revenue</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--mute)' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis width={64} tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} axisLine={false}
                    domain={[0, (m) => Math.ceil(m * 1.15)]} tickFormatter={fmtTick} />
                  <Tooltip formatter={(v) => [format(v), 'Revenue']} contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)' }} />
                  <Bar dataKey="revenue" fill="var(--ink)" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart height={240} />}
          </div>

          <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Orders</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--mute)' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis width={40} tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} axisLine={false}
                    domain={[0, (m) => Math.ceil(m * 1.2)]} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Orders']} contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)' }} />
                  <Line type="monotone" dataKey="orders" stroke="var(--ink)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart height={240} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemsTab({ from, to }) {
  const [view,  setView]  = useState('table');
  const [group, setGroup] = useState('day');
  const { format, currency } = useCurrency();
  const [sort, setSort] = useState('revenue');

  const { data: profData, isLoading: profLoading, isError: profError } = useItemProfitability(from, to);
  const { data: trendData, isLoading: trendLoading, isError: trendError } = useItemsTrend(
    view === 'chart' ? from : null,
    view === 'chart' ? to   : null,
    group,
  );

  const fmtTick = useCallback((v) => {
    const val = parseFloat(v);
    if (val >= 1_000_000) return `${currency.symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `${currency.symbol}${(val / 1_000).toFixed(1)}k`;
    return `${currency.symbol}${val.toFixed(0)}`;
  }, [currency]);

  const items = useMemo(() => {
    if (!profData?.items) return [];
    return [...profData.items].sort((a, b) => {
      if (sort === 'margin')   return (b.margin_pct ?? -Infinity) - (a.margin_pct ?? -Infinity);
      if (sort === 'sold')     return b.total_sold - a.total_sold;
      if (sort === 'profit')   return (b.profit ?? -Infinity) - (a.profit ?? -Infinity);
      return b.revenue - a.revenue;
    });
  }, [profData, sort]);

  const { names: itemNames, data: chartData } = useMemo(() => {
    if (!trendData?.rows) return { names: [], data: [] };
    const pivoted = pivotRows(trendData.rows, 'name', 'revenue');
    return {
      names: pivoted.names,
      data:  pivoted.data.map((r) => ({ ...r, label: periodLabel(r.period, group) })),
    };
  }, [trendData, group]);

  const SortBtn = ({ field, label }) => (
    <button
      onClick={() => setSort(field)}
      style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em',
        color: sort === field ? 'var(--ink)' : 'var(--mute)',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
        width: '100%',
      }}
    >
      {label}
      {sort === field && <ChevronDown size={10} />}
    </button>
  );

  const ViewToggle = () => (
    <div className="flex items-center gap-1">
      {['table', 'chart'].map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className="rounded-[6px] px-3 capitalize transition-colors duration-75"
          style={{
            height: 30, fontSize: 12, fontWeight: 500,
            background: view === v ? 'var(--ink)' : 'var(--paper)',
            color:      view === v ? 'var(--paper)' : 'var(--mute)',
            border: '1px solid var(--line-2)',
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ViewToggle />
        {view === 'chart' && <GroupToggle group={group} setGroup={setGroup} />}
      </div>

      {view === 'table' && (
        <>
          {profLoading && <Spinner />}
          {profError   && <ErrorMsg />}
          {!profLoading && !profError && !items.length && (
            <p style={{ fontSize: 13, color: 'var(--mute)', padding: '32px 0' }}>No sales data for this period</p>
          )}
          {items.length > 0 && (
            <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)' }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      <th className="px-5 py-3 text-left"  style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Item</th>
                      <th className="px-5 py-3 text-left"  style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Category</th>
                      <th className="px-5 py-3 text-right"><SortBtn field="sold"    label="Sold" /></th>
                      <th className="px-5 py-3 text-right"><SortBtn field="revenue" label="Revenue" /></th>
                      <th className="px-5 py-3 text-right" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Cost/Unit</th>
                      <th className="px-5 py-3 text-right"><SortBtn field="profit" label="Gross Profit" /></th>
                      <th className="px-5 py-3 text-right"><SortBtn field="margin" label="Margin" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td className="px-5 py-2.5" style={{ fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{item.name}</td>
                        <td className="px-5 py-2.5 capitalize" style={{ color: 'var(--mute)' }}>{item.category}</td>
                        <td className="px-5 py-2.5 text-right mono num" style={{ color: 'var(--ink)' }}>{item.total_sold}</td>
                        <td className="px-5 py-2.5 text-right mono num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{format(item.revenue)}</td>
                        <td className="px-5 py-2.5 text-right mono num" style={{ color: 'var(--mute)' }}>
                          {item.cost_per_unit != null ? format(item.cost_per_unit) : <span style={{ color: 'var(--mute)', fontSize: 11 }}>no recipe</span>}
                        </td>
                        <td className="px-5 py-2.5 text-right mono num" style={{ color: item.profit != null ? (item.profit >= 0 ? 'var(--ok)' : 'var(--bad)') : 'var(--mute)' }}>
                          {item.profit != null ? format(item.profit) : '—'}
                        </td>
                        <td className="px-5 py-2.5 text-right"><MarginBadge pct={item.margin_pct} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3" style={{ fontSize: 11, color: 'var(--mute)', borderTop: '1px solid var(--line)' }}>
                Cost data only shown for items linked to a recipe. Link recipes in Menu → edit item.
              </p>
            </div>
          )}
        </>
      )}

      {view === 'chart' && (
        <>
          {trendLoading && <Spinner />}
          {trendError   && <ErrorMsg />}
          {!trendLoading && !trendError && chartData.length === 0 && <EmptyChart height={280} />}
          {chartData.length > 0 && (
            <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>
                Revenue — top items
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--mute)' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis width={64} tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} axisLine={false}
                    domain={[0, (m) => Math.ceil(m * 1.15)]} tickFormatter={fmtTick} />
                  <Tooltip
                    formatter={(v, name) => [format(v), name]}
                    contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)', color: 'var(--ink)' }}
                    itemStyle={{ color: 'var(--ink)' }}
                  />
                  {itemNames.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <SeriesLegend names={itemNames} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StaffTab({ from, to }) {
  const [group, setGroup] = useState('day');
  const { data, isLoading, isError }                = useStaffPerformance(from, to);
  const { data: trendData, isLoading: trendLoading } = useStaffTrend(from, to, group);
  const { format, currency } = useCurrency();

  const fmtTick = useCallback((v) => {
    const val = parseFloat(v);
    if (val >= 1_000_000) return `${currency.symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `${currency.symbol}${(val / 1_000).toFixed(1)}k`;
    return `${currency.symbol}${val.toFixed(0)}`;
  }, [currency]);

  const { names: staffNames, data: chartData } = useMemo(() => {
    if (!trendData?.rows) return { names: [], data: [] };
    const pivoted = pivotRows(trendData.rows, 'name', 'revenue_handled');
    return {
      names: pivoted.names,
      data:  pivoted.data.map((r) => ({ ...r, label: periodLabel(r.period, group) })),
    };
  }, [trendData, group]);

  if (isLoading) return <Spinner />;
  if (isError)   return <ErrorMsg />;
  if (!data?.staff?.length) return <p style={{ fontSize: 13, color: 'var(--mute)', padding: '32px 0' }}>No staff data for this period</p>;

  const totals = data.staff.reduce((a, s) => ({
    orders:  a.orders  + s.orders_created,
    revenue: a.revenue + s.revenue_handled,
  }), { orders: 0, revenue: 0 });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Total Orders (period)"  value={totals.orders} />
        <KpiCard label="Total Revenue (period)" value={format(totals.revenue)} />
      </div>

      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)' }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <TableHead cols={[
              { label: 'Name' },
              { label: 'Role' },
              { label: 'Orders Created', align: 'right' },
              { label: 'Revenue Handled', align: 'right' },
              { label: 'Avg Order Value', align: 'right' },
            ]} />
            <tbody>
              {data.staff.map((s) => {
                const avg = s.orders_created > 0 ? s.revenue_handled / s.orders_created : 0;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="px-5 py-2.5" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      <div>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)' }}>{s.email}</div>
                    </td>
                    <td className="px-5 py-2.5 capitalize" style={{ color: 'var(--mute)', fontSize: 12 }}>{s.role}</td>
                    <td className="px-5 py-2.5 text-right mono num" style={{ color: 'var(--ink)' }}>{s.orders_created}</td>
                    <td className="px-5 py-2.5 text-right mono num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{format(s.revenue_handled)}</td>
                    <td className="px-5 py-2.5 text-right mono num" style={{ color: 'var(--mute)' }}>
                      {s.orders_created > 0 ? format(avg) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue over time — per staff member */}
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Revenue over time</p>
          <GroupToggle group={group} setGroup={setGroup} />
        </div>
        {trendLoading && <Spinner />}
        {!trendLoading && chartData.length === 0 && <EmptyChart height={240} />}
        {chartData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--mute)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis width={64} tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} axisLine={false}
                  domain={[0, (m) => Math.ceil(m * 1.15)]} tickFormatter={fmtTick} />
                <Tooltip
                  formatter={(v, name) => [format(v), name]}
                  contentStyle={{ fontSize: 12, border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--paper)', color: 'var(--ink)' }}
                  itemStyle={{ color: 'var(--ink)' }}
                />
                {staffNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <SeriesLegend names={staffNames} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Trends', 'Items', 'Staff'];

export default function Reports() {
  const navigate = useNavigate();
  const { iana } = useTimezone();
  const today = localToday(iana);

  const [from, setFrom] = useState(today);
  const [to,   setTo]   = useState(today);
  const [tab,  setTab]  = useState('Overview');
  const [showPresets, setShowPresets] = useState(false);

  const presets = PRESETS(today);
  const isSingleDay = from === to;

  function applyPreset(p) {
    setFrom(p.from);
    setTo(p.to);
    setShowPresets(false);
  }

  // For the Overview tab, we use the existing daily endpoint when single day,
  // or the trends endpoint summed for multi-day.
  const { data: dailyData, isLoading: dailyLoading, isError: dailyError } = useDailyReport(isSingleDay ? from : null);

  // Build a synthetic daily-style summary for multi-day ranges from trends data
  const { data: rangeData, isLoading: rangeLoading, isError: rangeError } = useTrends(
    !isSingleDay ? from : null,
    !isSingleDay ? to   : null,
  );

  const overviewData = useMemo(() => {
    if (isSingleDay) return dailyData;
    if (!rangeData?.rows) return null;
    const revenue = rangeData.rows.reduce((s, r) => s + r.revenue, 0);
    const orders  = rangeData.rows.reduce((s, r) => s + r.orders, 0);
    return {
      summary: { total_revenue: revenue, total_orders: orders },
      topItems: [],
      byCategory: [],
      hourly: [],
    };
  }, [isSingleDay, dailyData, rangeData]);

  const overviewLoading = isSingleDay ? dailyLoading : rangeLoading;
  const overviewError   = isSingleDay ? dailyError   : rangeError;

  return (
    <div className="space-y-5">
      {/* Date range controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {/* Dates + quick-range picker — all in one wrappable row */}
        <div className="flex flex-wrap items-center gap-2">
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)', whiteSpace: 'nowrap' }}>From</label>
          <input
            type="date" value={from} max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="input"
            style={{ width: 130, minWidth: 0 }}
          />
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)', whiteSpace: 'nowrap' }}>To</label>
          <input
            type="date" value={to} min={from} max={today}
            onChange={(e) => setTo(e.target.value)}
            className="input"
            style={{ width: 130, minWidth: 0 }}
          />

          {/* Preset picker inline with dates */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPresets((v) => !v)}
              className="flex items-center gap-1.5 rounded-[6px] px-3"
              style={{ height: 32, fontSize: 12, fontWeight: 500, border: '1px solid var(--line-2)', background: 'var(--paper)', color: 'var(--mute)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Quick range <ChevronDown size={12} />
            </button>
            {showPresets && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
                <div
                  className="absolute left-0 z-20 mt-1 py-1"
                  style={{ top: '100%', minWidth: 160, background: 'var(--paper)', border: '1px solid var(--line-2)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}
                >
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p)}
                      className="w-full px-4 py-2 text-left"
                      style={{ fontSize: 13, color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action links — left on mobile, pushed right on sm+ */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => navigate('/waste')}
            className="flex items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium transition-colors duration-75"
            style={{ height: 32, border: '1px solid var(--line-2)', background: 'var(--paper)', color: 'var(--mute)', whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.color = 'var(--mute)'; }}
          >
            <Trash2 size={13} /> Waste Log
          </button>
          <button
            onClick={() => navigate('/costing')}
            className="flex items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium transition-colors duration-75"
            style={{ height: 32, border: '1px solid var(--line-2)', background: 'var(--paper)', color: 'var(--mute)', whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.color = 'var(--mute)'; }}
          >
            <TrendingUp size={13} /> Costing
          </button>
        </div>
      </div>

      {/* Tabs — scrollable so they never clip on narrow viewports */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 13, fontWeight: 500, padding: '8px 14px', marginBottom: -1,
              flexShrink: 0, whiteSpace: 'nowrap',
              background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent',
              color: tab === t ? 'var(--ink)' : 'var(--mute)',
              cursor: 'pointer', transition: 'color 0.1s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview' && (
        overviewLoading ? <Spinner /> :
        overviewError   ? <ErrorMsg /> :
        overviewData    ? <OverviewTab from={from} to={to} daily={overviewData} /> :
        null
      )}
      {tab === 'Trends' && <TrendsTab from={from} to={to} />}
      {tab === 'Items'  && <ItemsTab  from={from} to={to} />}
      {tab === 'Staff'  && <StaffTab  from={from} to={to} />}
    </div>
  );
}
