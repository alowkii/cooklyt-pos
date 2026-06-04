import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Users, ChefHat, Star,
  AlertTriangle, CalendarClock, ShoppingBag, Clock, Leaf,
  CreditCard, Banknote, Smartphone, BarChart2, ArrowRight,
  Flame, UserCheck, UserPlus,
} from 'lucide-react';
import { useDailyReport, useCollection } from '../hooks/useReports';
import { useTables }                     from '../hooks/useTables';
import { useActiveOrders, useKitchenQueue } from '../hooks/useOrders';
import { useReviews }                    from '../hooks/useReviews';
import { useUsers }                      from '../hooks/useUsers';
import { useLowStock }                   from '../hooks/useIngredients';
import { useReservations }               from '../hooks/useReservations';
import { useWasteLogs }                  from '../hooks/useWaste';
import { useSettings }                   from '../hooks/useSettings';
import { useCurrency }                   from '../context/CurrencyContext';
import { useAuth }                       from '../hooks/useAuth';
import { useTimezone }                   from '../context/TimezoneContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function minutesToLabel(mins) {
  if (!mins && mins !== 0) return '—';
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${Math.round(mins)} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function timeAgo(dateStr) {
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function pctChange(now, prev) {
  if (!prev || prev === 0) return null;
  return ((now - prev) / prev) * 100;
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function SectionHead({ title, to }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--mute)' }}>
        {title}
      </h2>
      {to && (
        <Link to={to} className="flex items-center gap-1" style={{ fontSize: 11.5, color: 'var(--mute)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
        >
          See all <ArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

function Card({ children, style, to }) {
  const base = {
    border: '1px solid var(--line)',
    borderRadius: 8,
    background: 'var(--paper)',
    padding: '14px 16px',
    ...style,
  };
  if (to) return (
    <Link to={to} style={{ ...base, display: 'block', textDecoration: 'none' }}>
      {children}
    </Link>
  );
  return <div style={base}>{children}</div>;
}

function KpiCard({ label, value, sub, subColor, Icon, iconColor, to }) {
  const inner = (
    <div style={{
      border: '1px solid var(--line)', borderRadius: 8,
      background: 'var(--paper)', padding: '14px 16px',
    }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)' }}>
          {label}
        </span>
        {Icon && <Icon size={14} style={{ color: iconColor || 'var(--mute-2)', flexShrink: 0, marginTop: 1 }} />}
      </div>
      <div className="mono num" style={{
        fontSize: typeof value === 'string' && value.length > 9 ? 16 : 22,
        fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1,
        color: 'var(--ink)', marginBottom: sub ? 6 : 0,
      }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: subColor || 'var(--mute)', marginTop: 4, lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  return inner;
}

function DeltaBadge({ pct }) {
  if (pct === null || pct === undefined) return <span style={{ fontSize: 12, color: 'var(--mute)' }}>—</span>;
  const up = pct >= 0;
  const Icon = pct === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: up ? 'var(--ok)' : 'var(--bad)' }}>
      <Icon size={13} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function MicroBar({ data }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px" style={{ height: 40 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${(v / max) * 100}%`,
          background: 'var(--accent)', opacity: 0.75,
          borderRadius: 1, minHeight: 2,
        }} />
      ))}
    </div>
  );
}

function StarRow({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={11} style={{ color: s <= Math.round(rating) ? 'var(--warn)' : 'var(--line-2)', fill: s <= Math.round(rating) ? 'var(--warn)' : 'none' }} />
      ))}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Overview() {
  const { iana, todayLocal } = useTimezone();
  const today     = todayLocal();
  const yesterday = shiftDate(today, -1);
  const weekAgo   = shiftDate(today, -6);

  const { isAdmin }             = useAuth();
  const { format, symbol }      = useCurrency();
  const { data: settings }      = useSettings();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: report }        = useDailyReport(today);
  const { data: prevReport }    = useDailyReport(yesterday);
  const { data: tables = [] }   = useTables();
  const { data: queue  = [] }   = useKitchenQueue();
  const { data: orders }        = useActiveOrders();
  const { data: reviews = [] }  = useReviews({ from: weekAgo, to: today, enabled: isAdmin });
  const { data: users   = [] }  = useUsers();
  const { data: lowStock = [] } = useLowStock();
  const { data: reservations = [] } = useReservations(today);
  const { data: wasteLogs = [] }    = useWasteLogs(today, today);
  const { data: collection }        = useCollection(today, today);

  const activeOrders = orders?.data ?? [];

  // ── Today's summary ───────────────────────────────────────────────────────
  const revenue       = report?.summary?.total_revenue    ?? null;
  const orderCount    = report?.summary?.total_orders      ?? null;
  const cancelled     = report?.summary?.cancelled_orders  ?? null;
  const returning     = report?.summary?.returning_orders  ?? null;
  const newCust       = report?.summary?.new_orders        ?? null;
  const avgServe      = report?.summary?.avg_serve_minutes ?? null;
  const avgOrder      = (revenue && orderCount) ? revenue / orderCount : null;
  const topItem       = report?.topItems?.[0] ?? null;

  // ── Yesterday comparison ──────────────────────────────────────────────────
  const prevRevenue   = prevReport?.summary?.total_revenue ?? null;
  const prevOrders    = prevReport?.summary?.total_orders  ?? null;
  const revPct        = pctChange(revenue, prevRevenue);
  const ordPct        = pctChange(orderCount, prevOrders);

  // ── Hourly bars ───────────────────────────────────────────────────────────
  const hourlyData = (() => {
    if (!report?.hourly?.length) return null;
    const map = {};
    report.hourly.forEach((r) => { map[parseInt(r.hour ?? r.label, 10)] = parseFloat(r.revenue); });
    return Array.from({ length: 18 }, (_, i) => map[6 + i] ?? 0);
  })();

  // ── Staff ─────────────────────────────────────────────────────────────────
  const staffPresent  = users.filter((u) => u.is_present).length;
  const staffTotal    = users.filter((u) => u.role !== 'kitchen' || true).length;

  // ── Reservations ─────────────────────────────────────────────────────────
  const pendingRes    = reservations.filter((r) => r.status === 'pending' || r.status === 'confirmed');
  const seatedRes     = reservations.filter((r) => r.status === 'seated');

  // ── Kitchen / queue ───────────────────────────────────────────────────────
  const now           = Date.now();
  const activeItems   = queue.filter((i) => i.status !== 'served' && i.status !== 'cancelled');
  const avgQueueMins  = activeItems.length
    ? Math.round(activeItems.reduce((s, i) => s + (now - new Date(i.order_created_at)) / 60_000, 0) / activeItems.length)
    : null;
  const mostDelayed   = activeItems.reduce((worst, item) => {
    const age = now - new Date(item.order_created_at);
    return !worst || age > (now - new Date(worst.order_created_at)) ? item : worst;
  }, null);

  // ── Waste ─────────────────────────────────────────────────────────────────
  const wasteCost     = wasteLogs.reduce((s, w) => s + parseFloat(w.total_cost ?? 0), 0);
  const wasteItems    = wasteLogs.length;

  // ── Payment split ─────────────────────────────────────────────────────────
  const byMethod      = collection?.byMethod ?? [];
  const cashAmt       = byMethod.find((m) => m.method === 'cash')?.amount   ?? 0;
  const upiAmt        = byMethod.find((m) => m.method === 'mobile')?.amount ?? 0;
  const cardAmt       = byMethod.find((m) => m.method === 'card')?.amount   ?? 0;
  const totalColl     = cashAmt + upiAmt + cardAmt;
  const pct           = (v) => totalColl > 0 ? Math.round((v / totalColl) * 100) : 0;

  // ── Daily target ──────────────────────────────────────────────────────────
  const target        = parseFloat(settings?.daily_revenue_target) || null;
  const targetPct     = (target && revenue) ? Math.min(100, Math.round((revenue / target) * 100)) : null;

  // ── Tables ────────────────────────────────────────────────────────────────
  const occupiedTables    = tables.filter((t) => t.status === 'occupied');
  const longestOccupied   = (() => {
    const byTable = {};
    activeOrders.forEach((o) => {
      if (!o.table_number || o.status === 'served') return;
      if (!byTable[o.table_number] || new Date(o.created_at) < new Date(byTable[o.table_number].created_at)) {
        byTable[o.table_number] = o;
      }
    });
    const entries = Object.values(byTable);
    if (!entries.length) return null;
    return entries.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b);
  })();
  const walkInOrders = Math.max(0, (orderCount ?? 0) - seatedRes.length);

  // ── Recent reviews ────────────────────────────────────────────────────────
  const recentReviews = reviews.slice(0, 3);
  const avgRating     = reviews.length
    ? (reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length).toFixed(1)
    : null;

  const today_label = new Date().toLocaleDateString('en-US', {
    timeZone: iana, weekday: 'long', day: 'numeric', month: 'short',
  });

  const STATUS_DOT = { available: 'var(--ok)', occupied: 'var(--bad)', reserved: 'var(--warn)', cleaning: 'var(--info)' };

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.015em', color: 'var(--ink)' }}>
          Overview
        </h1>
        <span style={{ fontSize: 12, color: 'var(--mute)' }}>{today_label}</span>
      </div>

      {/* ── Today's Performance ──────────────────────────────────────────── */}
      {isAdmin && (
        <div>
          <SectionHead title="Today's Performance" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard
              label="Revenue"
              value={revenue !== null ? format(revenue) : '—'}
              sub={revPct !== null ? <DeltaBadge pct={revPct} /> : 'vs yesterday'}
              Icon={TrendingUp}
              iconColor="var(--ok)"
            />
            <KpiCard
              label="Orders"
              value={orderCount ?? '—'}
              sub={ordPct !== null ? <DeltaBadge pct={ordPct} /> : undefined}
              Icon={ShoppingBag}
            />
            <KpiCard
              label="Avg Order Value"
              value={avgOrder !== null ? format(avgOrder) : '—'}
              sub={orderCount ? `from ${orderCount} orders` : undefined}
              Icon={BarChart2}
            />
            <KpiCard
              label="Top Item"
              value={topItem?.name ?? '—'}
              sub={topItem ? `×${topItem.total_sold} sold` : undefined}
              Icon={Flame}
              iconColor="var(--warn)"
            />
            <KpiCard
              label="Cancelled"
              value={cancelled ?? '—'}
              sub={cancelled > 0 ? 'orders voided' : 'none today'}
              subColor={cancelled > 0 ? 'var(--bad)' : 'var(--ok)'}
              Icon={AlertTriangle}
              iconColor={cancelled > 0 ? 'var(--bad)' : 'var(--mute-2)'}
            />
          </div>
        </div>
      )}

      {/* ── Financial ────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div>
          <SectionHead title="Financial" to="/reports" />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">

            {/* Today vs Yesterday */}
            <Card>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Today vs Yesterday
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Revenue',  now: revenue,    prev: prevRevenue, fmt: format },
                  { label: 'Orders',   now: orderCount, prev: prevOrders,  fmt: (v) => v },
                ].map(({ label, now: n, prev: p, fmt }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="mono num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{n !== null ? fmt(n) : '—'}</span>
                      <DeltaBadge pct={pctChange(n, p)} />
                    </div>
                  </div>
                ))}
              </div>
              {hourlyData && (
                <div className="mt-4">
                  <MicroBar data={hourlyData} />
                  <div className="flex justify-between mt-1" style={{ fontSize: 9.5, color: 'var(--mute-2)' }}>
                    {['6', '9', '12', '15', '18', '21', '24'].map((h) => <span key={h} className="mono">{h}</span>)}
                  </div>
                </div>
              )}
            </Card>

            {/* Payment split */}
            <Card>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Payment Method Split
              </p>
              {totalColl === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--mute)' }}>No collections yet</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Cash',   amt: cashAmt, Icon: Banknote,    color: 'var(--ok)' },
                    { label: 'Card',   amt: cardAmt, Icon: CreditCard,  color: 'var(--info)' },
                    { label: 'UPI',    amt: upiAmt,  Icon: Smartphone,  color: 'var(--warn)' },
                  ].map(({ label, amt, Icon, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--ink)' }}>
                          <Icon size={13} style={{ color }} /> {label}
                        </span>
                        <span className="mono num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                          {format(amt)} <span style={{ fontSize: 10.5, color: 'var(--mute)', fontWeight: 400 }}>({pct(amt)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--paper-2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct(amt)}%`, background: color, borderRadius: 2, transition: 'width .3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Daily target */}
            <Card>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Daily Target
              </p>
              {!target ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.5 }}>No target set.</p>
                  <Link to="/settings" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                    Set in Settings →
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="mono num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>
                      {targetPct}%
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--mute)' }}>
                      {format(revenue ?? 0)} / {format(target)}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--paper-2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${targetPct}%`,
                      background: targetPct >= 100 ? 'var(--ok)' : targetPct >= 70 ? 'var(--warn)' : 'var(--accent)',
                      borderRadius: 4, transition: 'width .4s',
                    }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--mute)', marginTop: 8 }}>
                    {targetPct >= 100
                      ? '🎯 Target reached!'
                      : `${format(target - (revenue ?? 0))} to go`}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Staff & Operations ───────────────────────────────────────────── */}
      {isAdmin && (
        <div>
          <SectionHead title="Staff & Operations" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

            {/* Staff clocked in */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck size={14} style={{ color: 'var(--ok)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Staff On-Site</span>
              </div>
              <div className="mono num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                {staffPresent}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--mute)', marginLeft: 4 }}>/ {staffTotal}</span>
              </div>
              {users.filter((u) => u.is_present).slice(0, 4).map((u) => (
                <div key={u.id} className="flex items-center gap-2 mt-2">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: 'var(--ink)', truncate: true }}>{u.name || u.email}</span>
                  <span style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'capitalize' }}>{u.role}</span>
                </div>
              ))}
              {staffPresent > 4 && <p style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>+{staffPresent - 4} more</p>}
            </Card>

            {/* Low stock */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: lowStock.length > 0 ? 'var(--bad)' : 'var(--mute-2)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Stock Alerts</span>
              </div>
              {lowStock.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ok)' }}>All stock levels OK</p>
              ) : (
                <>
                  <div className="mono num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--bad)', lineHeight: 1, marginBottom: 8 }}>
                    {lowStock.length}
                  </div>
                  <div className="space-y-1.5">
                    {lowStock.slice(0, 4).map((i) => (
                      <div key={i.id} className="flex items-center justify-between">
                        <span style={{ fontSize: 12, color: 'var(--ink)' }} className="truncate">{i.name}</span>
                        <span style={{ fontSize: 11, color: i.stock_on_hand <= 0 ? 'var(--bad)' : 'var(--warn)', fontWeight: 600, flexShrink: 0, marginLeft: 4 }}>
                          {i.stock_on_hand <= 0 ? 'Out' : `${i.stock_on_hand} ${i.unit}`}
                        </span>
                      </div>
                    ))}
                    {lowStock.length > 4 && <p style={{ fontSize: 11, color: 'var(--mute)' }}>+{lowStock.length - 4} more</p>}
                  </div>
                </>
              )}
            </Card>

            {/* Reservations */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock size={14} style={{ color: 'var(--info)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Reservations Today</span>
              </div>
              <div className="mono num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 8 }}>
                {pendingRes.length}
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--mute)', marginLeft: 4 }}>pending</span>
              </div>
              {pendingRes.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink)' }}>{r.guest_name || r.name || 'Guest'}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--mute)' }} className="mono">
                    {r.reservation_time ? r.reservation_time.slice(0, 5) : '—'}
                  </span>
                </div>
              ))}
              {pendingRes.length === 0 && <p style={{ fontSize: 12, color: 'var(--mute)' }}>No pending reservations</p>}
            </Card>
          </div>
        </div>
      )}

      {/* ── Kitchen ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Kitchen" to="/orders" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Queue Size"
            value={activeItems.length}
            sub={activeItems.length > 0 ? 'items pending' : 'kitchen clear'}
            subColor={activeItems.length > 5 ? 'var(--warn)' : 'var(--mute)'}
            Icon={ChefHat}
            iconColor={activeItems.length > 5 ? 'var(--warn)' : 'var(--mute-2)'}
          />
          <KpiCard
            label="Avg Ticket Time"
            value={avgQueueMins !== null ? minutesToLabel(avgQueueMins) : '—'}
            sub="active orders"
            Icon={Clock}
            iconColor={avgQueueMins > 20 ? 'var(--bad)' : avgQueueMins > 10 ? 'var(--warn)' : 'var(--mute-2)'}
          />
          <KpiCard
            label="Most Delayed"
            value={mostDelayed ? mostDelayed.item_name : '—'}
            sub={mostDelayed ? `Table ${mostDelayed.table_number || '—'} · ${timeAgo(mostDelayed.order_created_at)}` : 'nothing delayed'}
            subColor={mostDelayed ? 'var(--bad)' : 'var(--mute)'}
            Icon={AlertTriangle}
            iconColor={mostDelayed ? 'var(--bad)' : 'var(--mute-2)'}
          />
          {isAdmin && (
            <KpiCard
              label="Waste Today"
              value={wasteCost > 0 ? format(wasteCost) : `${wasteItems} logs`}
              sub={wasteCost > 0 ? `${wasteItems} log${wasteItems !== 1 ? 's' : ''}` : 'no waste logged'}
              Icon={Leaf}
              iconColor={wasteCost > 0 ? 'var(--warn)' : 'var(--mute-2)'}
              to="/waste"
            />
          )}
        </div>
      </div>

      {/* ── Customer Insights ────────────────────────────────────────────── */}
      {isAdmin && (
        <div>
          <SectionHead title="Customer Insights" to="/reviews" />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">

            {/* New vs returning */}
            <Card>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                New vs Returning Today
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'New',       value: newCust,    Icon: UserPlus,  color: 'var(--info)' },
                  { label: 'Returning', value: returning,  Icon: UserCheck, color: 'var(--ok)'  },
                ].map(({ label, value, Icon, color }) => (
                  <div key={label}>
                    <Icon size={14} style={{ color, marginBottom: 4 }} />
                    <div className="mono num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                      {value ?? '—'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
              {(newCust || returning) && newCust + returning > 0 && (
                <div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--paper-2)', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ height: '100%', width: `${Math.round((returning / (newCust + returning)) * 100)}%`, background: 'var(--ok)', borderRadius: '3px 0 0 3px' }} />
                    <div style={{ height: '100%', flex: 1, background: 'var(--info)' }} />
                  </div>
                  <div className="flex justify-between mt-1.5" style={{ fontSize: 10.5, color: 'var(--mute)' }}>
                    <span style={{ color: 'var(--ok)' }}>Returning {Math.round((returning / (newCust + returning)) * 100)}%</span>
                    <span style={{ color: 'var(--info)' }}>New {Math.round((newCust / (newCust + returning)) * 100)}%</span>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>Avg serve time</span>
                <span className="mono num" style={{ fontSize: 13, fontWeight: 600, color: avgServe > 30 ? 'var(--bad)' : 'var(--ink)' }}>
                  {avgServe !== null ? minutesToLabel(avgServe) : '—'}
                </span>
              </div>
            </Card>

            {/* Recent reviews */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Recent Feedback
                </p>
                {avgRating && (
                  <div className="flex items-center gap-1.5">
                    <StarRow rating={parseFloat(avgRating)} />
                    <span className="mono num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{avgRating}</span>
                  </div>
                )}
              </div>
              {recentReviews.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--mute)' }}>No reviews this week</p>
              ) : (
                <div className="space-y-3">
                  {recentReviews.map((r) => (
                    <div key={r.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                      <div className="flex items-center justify-between mb-1">
                        <StarRow rating={r.overall_rating} />
                        <span style={{ fontSize: 11, color: 'var(--mute)' }}>{timeAgo(r.created_at)}</span>
                      </div>
                      {r.comment && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink)', lineHeight: 1.45 }} className="line-clamp-2">
                          "{r.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Tables ───────────────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Tables" to="/tables" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">

          {/* Table grid */}
          <div className="lg:col-span-2">
            <Card style={{ padding: '14px 16px' }}>
              {/* Summary row */}
              <div className="flex flex-wrap gap-3 mb-3">
                {[
                  { label: 'Occupied', count: tables.filter(t => t.status === 'occupied').length,  color: 'var(--bad)' },
                  { label: 'Available', count: tables.filter(t => t.status === 'available').length, color: 'var(--ok)' },
                  { label: 'Reserved',  count: tables.filter(t => t.status === 'reserved').length,  color: 'var(--warn)' },
                  { label: 'Cleaning',  count: tables.filter(t => t.status === 'cleaning').length,  color: 'var(--info)' },
                ].filter(s => s.count > 0).map(({ label, count, color }) => (
                  <span key={label} className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--mute)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {label} · {count}
                  </span>
                ))}
              </div>
              {tables.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--mute)' }}>No tables configured</p>
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}>
                  {[...tables].sort((a, b) => a.number - b.number).map((t) => (
                    <div key={t.id} className="flex flex-col items-center justify-center rounded-[6px] py-2"
                      style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
                      <span className="mono num font-bold" style={{ fontSize: 15, lineHeight: 1, color: 'var(--ink)' }}>{t.number}</span>
                      <span className="inline-block rounded-full mt-1" style={{ width: 5, height: 5, background: STATUS_DOT[t.status] ?? 'var(--mute-2)' }} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Table stats */}
          <div className="space-y-3">
            <KpiCard
              label="Longest Occupied"
              value={longestOccupied ? `T${longestOccupied.table_number}` : '—'}
              sub={longestOccupied ? `since ${timeAgo(longestOccupied.created_at)}` : 'no occupied tables'}
              subColor={longestOccupied && (Date.now() - new Date(longestOccupied.created_at)) > 90 * 60_000 ? 'var(--bad)' : 'var(--mute)'}
              Icon={Clock}
            />
            {isAdmin && (
              <KpiCard
                label="Reservations vs Walk-ins"
                value={`${seatedRes.length} : ${walkInOrders}`}
                sub={`${seatedRes.length} res · ${walkInOrders} walk-in`}
                Icon={Users}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Active Tickets ───────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Active Tickets" to="/orders" />
        <Card>
          {activeOrders.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--mute)' }}>Kitchen is clear.</p>
          ) : (
            activeOrders.slice(0, 8).map((order) => {
              const label = order.channel === 'dining'
                ? `Table ${order.table_number}`
                : order.customer_ref || (order.channel === 'takeaway' ? 'Takeaway' : 'Delivery');
              const st = order.status;
              const dotColor = { received: 'var(--mute-2)', preparing: 'var(--warn)', ready: 'var(--info)', served: 'var(--ok)' }[st] ?? 'var(--mute-2)';
              const minsOld = Math.floor((now - new Date(order.created_at)) / 60_000);
              return (
                <div key={order.id} className="flex items-center gap-3 py-2"
                  style={{ borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                  <span style={{ flex: 1, color: 'var(--ink)' }}>{label}</span>
                  <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--ink-2)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                    {st[0].toUpperCase() + st.slice(1)}
                  </span>
                  <span className="mono num" style={{
                    fontSize: 11.5,
                    color: minsOld >= 20 ? 'var(--bad)' : minsOld >= 10 ? 'var(--warn)' : 'var(--mute)',
                  }}>
                    {timeAgo(order.created_at)}
                  </span>
                </div>
              );
            })
          )}
          {activeOrders.length > 8 && (
            <Link to="/orders" style={{ fontSize: 12, color: 'var(--mute)', textDecoration: 'none', display: 'block', paddingTop: 8 }}>
              +{activeOrders.length - 8} more → Orders page
            </Link>
          )}
        </Card>
      </div>

    </div>
  );
}
