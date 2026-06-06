import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, ChefHat, Star,
  AlertTriangle, ShoppingBag, Clock, Leaf,
  BarChart2, ArrowRight, Flame, UserCheck, UserPlus, ChevronLeft, X,
} from 'lucide-react';
import { useDailyReport, useCollection, useTrends } from '../hooks/useReports';
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
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
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

function dynFont(val, base) {
  const n = String(val ?? '').length;
  if (n <=  6) return base;
  if (n <=  9) return Math.round(base * 0.82);
  if (n <= 12) return Math.round(base * 0.70);
  return Math.round(base * 0.60);
}

// ── Chart primitives ──────────────────────────────────────────────────────────

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function HoverAreaChart({ data, labels, fmtVal, height = 150, color = 'var(--ink)' }) {
  const [hi, setHi] = useState(null);
  const ref = useRef(null);
  const lineRef = useRef(null);
  const areaRef = useRef(null);
  const prevDataRef = useRef(null);
  useEffect(() => {
    const prev = prevDataRef.current;
    prevDataRef.current = data;
    if (!prev || prev.length === 0) return;
    if (data.length === prev.length && data.every((v, i) => v === prev[i])) return;
    const line = lineRef.current;
    if (!line) return;
    const len = line.getTotalLength();
    line.style.transition = 'none';
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    line.getBoundingClientRect();
    line.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)';
    line.style.strokeDashoffset = '0';
    if (areaRef.current) {
      areaRef.current.style.opacity = '0';
      areaRef.current.style.transition = 'none';
      areaRef.current.getBoundingClientRect();
      areaRef.current.style.transition = 'opacity 0.8s ease 0.4s';
      areaRef.current.style.opacity = '1';
    }
  }, [data]);
  const padX = 6, padY = 20, W = 600;
  if (!data.length) return null;
  const max = Math.max(...data) * 1.08;
  const min = Math.min(...data) * 0.92;
  const span = max - min || 1;
  const innerW = W - padX * 2;
  const innerH = height - padY * 2;
  let pts = data.map((v, i) => [
    padX + (i / Math.max(data.length - 1, 1)) * innerW,
    padY + innerH - ((v - min) / span) * innerH,
  ]);
  if (pts.length === 1) pts = [[padX, pts[0][1]], [W - padX, pts[0][1]]];
  const pathD = smoothPath(pts);
  const areaD = `${pathD} L ${pts[pts.length - 1][0]},${height} L ${pts[0][0]},${height} Z`;
  const hp = hi != null ? pts[hi] : null;
  const leftPct = hp ? (hp[0] / W) * 100 : 0;
  const topPct  = hp ? (hp[1] / height) * 100 : 0;

  return (
    <div ref={ref} style={{ position: 'relative', cursor: 'crosshair' }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        setHi(Math.round(ratio * (data.length - 1)));
      }}
      onMouseLeave={() => setHi(null)}
    >
      <svg width="100%" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ov-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g, i) => (
          <line key={i} x1={padX} x2={W - padX} y1={padY + innerH * g} y2={padY + innerH * g}
            stroke="var(--line)" strokeWidth="1" />
        ))}
        <path ref={areaRef} d={areaD} fill="url(#ov-area-grad)" />
        <path ref={lineRef} d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hp && (
          <>
            <line x1={hp[0]} x2={hp[0]} y1={padY} y2={height - padY} stroke="var(--line-2)" strokeWidth="1" />
            <circle cx={hp[0]} cy={hp[1]} r="4.5" fill="var(--paper)" stroke={color} strokeWidth="2" />
          </>
        )}
      </svg>
      {hp && (
        <div style={{
          position: 'absolute', pointerEvents: 'none',
          left: `${leftPct}%`, top: `${topPct}%`,
          transform: 'translate(-50%, -120%)',
          background: 'var(--ink)', color: 'var(--accent-on)',
          padding: '4px 9px', borderRadius: 7, fontSize: 11, whiteSpace: 'nowrap',
          boxShadow: '0 6px 18px rgba(20,18,10,.25)', zIndex: 5,
        }}>
          <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>{fmtVal(data[hi])}</span>
          {labels?.[hi] && <span style={{ opacity: 0.6, marginLeft: 5 }}>· {labels[hi]}</span>}
        </div>
      )}
      {labels && (
        <div className="flex justify-between mono" style={{ fontSize: 10, color: 'var(--mute-2)', marginTop: 4 }}>
          {labels.map((l, i) => (
            <span key={i} style={{ visibility: l ? 'visible' : 'hidden' }}>{l || '·'}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SvgDonut({ segments, size = 110, thickness = 13, center }) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--paper-3)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const off = -acc;
          acc += len;
          return (
            <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={off} />
          );
        })}
      </svg>
      {center && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          {center}
        </div>
      )}
    </div>
  );
}

function SvgRing({ value, max = 100, size = 110, thickness = 13, color = 'var(--ink)', center }) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, (value || 0) / (max || 1));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--paper-3)" strokeWidth={thickness} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      {center && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          {center}
        </div>
      )}
    </div>
  );
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Chip({ variant = 'mute', children }) {
  const COLORS = {
    ok:   { bg: 'var(--ok-soft)',   color: 'var(--ok)'   },
    bad:  { bg: 'var(--bad-soft)',  color: 'var(--bad)'  },
    warn: { bg: 'var(--warn-soft)', color: 'var(--warn)' },
    info: { bg: 'var(--info-soft)', color: 'var(--info)' },
    mute: { bg: 'var(--paper-3)',   color: 'var(--mute)' },
  };
  const c = COLORS[variant] || COLORS.mute;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 20, padding: '0 7px', borderRadius: 5,
      fontSize: 11, fontWeight: 600, background: c.bg, color: c.color,
    }}>
      {children}
    </span>
  );
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

function StarRow({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={11} style={{
          color: s <= Math.round(rating) ? 'var(--warn)' : 'var(--line-2)',
          fill: s <= Math.round(rating) ? 'var(--warn)' : 'none',
        }} />
      ))}
    </span>
  );
}

function SectionHead({ title, to }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--label)' }}>
        {title}
      </h2>
      {to && (
        <Link to={to} className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--mute)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
        >
          See all <ArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

function RailLabel({ label, to, right }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 9 }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--label)' }}>{label}</span>
      {right || (to && (
        <Link to={to} className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--mute)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
        >
          See all <ArrowRight size={11} />
        </Link>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, subColor, Icon, iconColor, to }) {
  const inner = (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--label)' }}>
          {label}
        </span>
        {Icon && <Icon size={14} style={{ color: iconColor || 'var(--mute-2)', flexShrink: 0, marginTop: 1 }} />}
      </div>
      <div className="mono num" style={{
        fontSize: dynFont(value, 22),
        fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.2,
        color: 'var(--ink)',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: subColor || 'var(--mute)', marginTop: 'auto', paddingTop: 6, lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  return inner;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Overview() {
  const [chartRange, setChartRange] = useState('today');
  const [railOpen,   setRailOpen]   = useState(false);

  const { iana, todayLocal } = useTimezone();
  const today     = todayLocal();
  const yesterday = shiftDate(today, -1);
  const weekAgo   = shiftDate(today, -6);

  const { isAdmin }             = useAuth();
  const { format }              = useCurrency();
  const { data: settings }      = useSettings();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: report }        = useDailyReport(today);
  const { data: prevReport }    = useDailyReport(yesterday);
  const { data: tables = [] }   = useTables();
  const { data: queue  = [] }   = useKitchenQueue();
  const { data: activeOrders = [] } = useActiveOrders();
  const { data: reviews = [] }  = useReviews({ from: weekAgo, to: today, enabled: isAdmin });
  const { data: users   = [] }  = useUsers();
  const { data: lowStock = [] } = useLowStock();
  const { data: reservations = [] } = useReservations(today);
  const { data: wasteLogs = [] }    = useWasteLogs(today, today);
  const { data: collection }        = useCollection(today, today);
  const { data: weekTrendsResult }  = useTrends(weekAgo, today, 'day');
  const weekTrends = weekTrendsResult?.rows ?? [];


  // ── Today's summary ───────────────────────────────────────────────────────
  const revenue       = report?.summary?.total_revenue    ?? null;
  const orderCount    = report?.summary?.total_orders      ?? null;
  const cancelled     = report?.summary?.cancelled_orders  ?? null;
  const returning     = report?.summary?.returning_orders  ?? null;
  const newCust       = report?.summary?.new_orders        ?? null;
  const avgServe      = report?.summary?.avg_serve_minutes ?? null;
  const avgOrder      = (revenue !== null && orderCount) ? revenue / orderCount : null;
  const topItem       = report?.topItems?.[0] ?? null;

  // ── Yesterday comparison ──────────────────────────────────────────────────
  const prevRevenue   = prevReport?.summary?.total_revenue ?? null;
  const prevOrders    = prevReport?.summary?.total_orders  ?? null;
  const revPct        = pctChange(revenue, prevRevenue);
  const ordPct        = pctChange(orderCount, prevOrders);

  // ── Chart data ────────────────────────────────────────────────────────────
  const hourlyData = (() => {
    if (!report?.hourly?.length) return null;
    const map = {};
    report.hourly.forEach((r) => { map[parseInt(r.hour ?? r.label, 10)] = parseFloat(r.revenue); });
    return Array.from({ length: 18 }, (_, i) => map[6 + i] ?? 0);
  })();

  const hourlyLabels = Array.from({ length: 18 }, (_, i) => {
    const h = 6 + i;
    return i % 3 === 0 ? `${h}` : '';
  });

  const weekChartData   = weekTrends.map((r) => parseFloat(r.revenue ?? 0));
  const weekChartLabels = weekTrends.map((r) => {
    const d = new Date(r.period + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const isToday    = chartRange === 'today';
  const chartData  = isToday ? (hourlyData ?? []) : weekChartData;
  const chartLabels = isToday ? hourlyLabels : weekChartLabels;

  // ── Staff ─────────────────────────────────────────────────────────────────
  const assignedEmails = new Set(
    activeOrders.filter((o) => o.assigned_staff_email).map((o) => o.assigned_staff_email),
  );
  const staffPresent  = users.filter((u) => u.role !== 'admin' && (u.is_present || assignedEmails.has(u.email))).length;
  const staffTotal    = users.filter((u) => u.role !== 'admin').length;

  // ── Reservations ─────────────────────────────────────────────────────────
  const pendingRes    = reservations.filter((r) => r.status === 'upcoming');

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
  const targetPct     = (target !== null && revenue !== null) ? Math.min(100, Math.round((revenue / target) * 100)) : null;

  // ── Tables ────────────────────────────────────────────────────────────────
  const occupiedTables = tables.filter((t) => t.status === 'occupied');

  // ── Recent reviews ────────────────────────────────────────────────────────
  const recentReviews = reviews.slice(0, 3);
  const avgRating     = reviews.length
    ? (reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length).toFixed(1)
    : null;

  const today_label = new Date().toLocaleDateString('en-US', {
    timeZone: iana, weekday: 'long', day: 'numeric', month: 'short',
  });

  const CARD = { border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper)', padding: '18px 20px' };
  const SEC_LABEL = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--label)' };

  return (
    <div className="flex flex-col lg:flex-row -mx-5 -my-5 lg:-mx-6 lg:-my-6" style={{ alignItems: 'stretch' }}>

      {/* ── LEFT PANE ────────────────────────────────────────────────────── */}
      <div className="p-4 pb-8 lg:px-7 lg:pt-6 lg:pb-10" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Page header */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>Overview</h1>
          <span style={{ fontSize: 12, color: 'var(--mute)' }}>{today_label}</span>
          <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>
            <span className="pulse-dot" /> live
          </span>
        </div>

        {/* KPI stat strip (admin) */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: 10 }}>
            {[
              { label: 'Revenue',   value: revenue !== null ? format(revenue) : '—',       sub: revPct !== null ? <DeltaBadge pct={revPct} /> : null,                                                                  Icon: TrendingUp,    iconColor: 'var(--ok)'  },
              { label: 'Orders',    value: orderCount ?? '—',                               sub: ordPct !== null ? <DeltaBadge pct={ordPct} /> : null,                                                                  Icon: ShoppingBag                            },
              { label: 'Avg order', value: avgOrder !== null ? format(avgOrder) : '—',     sub: orderCount ? `${orderCount} orders` : null,                                                                            Icon: BarChart2                              },
              { label: 'Top item',  value: topItem?.name ?? '—',                            sub: topItem ? `×${topItem.total_sold} sold` : null,                                                                       Icon: Flame,         iconColor: 'var(--warn)' },
              { label: 'Cancelled', value: cancelled ?? '—',                                sub: cancelled !== null ? (cancelled > 0 ? 'orders voided' : 'none today') : null,                                         Icon: AlertTriangle,  iconColor: cancelled !== null && cancelled > 0 ? 'var(--bad)' : 'var(--mute-2)' },
            ].map(({ label, value, sub, Icon, iconColor }) => (
              <div key={label} style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={SEC_LABEL}>{label}</span>
                  <Icon size={13} style={{ color: iconColor || 'var(--mute-2)', flexShrink: 0 }} />
                </div>
                <div className="mono num" style={{ fontSize: dynFont(value, 22), fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.2, color: 'var(--ink)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {value}
                </div>
                {sub && <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 'auto', paddingTop: 6, lineHeight: 1.3 }}>{sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Revenue trend chart (admin) */}
        {isAdmin && (
          <div style={{ ...CARD, padding: '18px 20px 20px' }}>
            <div className="flex items-start justify-between" style={{ marginBottom: 12, gap: 12 }}>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ ...SEC_LABEL, marginBottom: 6 }}>Revenue trend</div>
                <div className="flex items-baseline gap-3" style={{ minWidth: 0 }}>
                  <span className="mono num" style={{ fontSize: dynFont(revenue !== null ? format(revenue) : '—', 28), fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {revenue !== null ? format(revenue) : '—'}
                  </span>
                  {revPct !== null && <DeltaBadge pct={revPct} />}
                </div>
              </div>
              <div style={{ display: 'flex', padding: 3, gap: 2, border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper-2)' }}>
                {[['today', 'Today'], ['week', '7 days']].map(([k, label]) => (
                  <button key={k} onClick={() => setChartRange(k)} style={{
                    height: 26, padding: '0 11px', border: 0, whiteSpace: 'nowrap',
                    background: chartRange === k ? 'var(--paper)' : 'transparent',
                    borderRadius: 6, fontSize: 11.5, fontWeight: chartRange === k ? 600 : 500,
                    color: chartRange === k ? 'var(--ink)' : 'var(--mute)',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .1s',
                    boxShadow: chartRange === k ? '0 1px 2px rgba(10,10,10,.06)' : 'none',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length >= 2
              ? <HoverAreaChart data={chartData} labels={chartLabels} fmtVal={format} />
              : <div style={{ height: 150, display: 'grid', placeItems: 'center', color: 'var(--mute)', fontSize: 13 }}>No data yet</div>
            }
          </div>
        )}

        {/* Financial row (admin) */}
        {isAdmin && (
          <div>
            <SectionHead title="Financial" to="/reports" />
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 14 }}>

              {/* Payment split */}
              <div style={CARD}>
                <div style={{ ...SEC_LABEL, marginBottom: 14 }}>Payment split</div>
                {totalColl === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--mute)' }}>No collections yet</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <SvgDonut
                      segments={[
                        { value: cashAmt, color: 'var(--ok)' },
                        { value: cardAmt, color: 'var(--info)' },
                        { value: upiAmt, color: 'var(--warn)' },
                      ]}
                      center={
                        <div>
                          <div className="mono num" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>{pct(cashAmt)}%</div>
                          <div style={{ fontSize: 9, color: 'var(--mute)', marginTop: 1 }}>cash</div>
                        </div>
                      }
                    />
                    <div className="flex flex-col gap-2.5" style={{ flex: 1 }}>
                      {[
                        { label: 'Cash', amt: cashAmt, color: 'var(--ok)'   },
                        { label: 'Card', amt: cardAmt, color: 'var(--info)'  },
                        { label: 'UPI',  amt: upiAmt,  color: 'var(--warn)'  },
                      ].map(({ label, amt, color }) => (
                        <div key={label} className="flex items-center" style={{ fontSize: 12, gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ color: 'var(--mute)' }}>{label}</span>
                          <span className="mono num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{pct(amt)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Daily target */}
              <div style={CARD}>
                <div style={{ ...SEC_LABEL, marginBottom: 10 }}>Daily target</div>
                {!target ? (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.5, marginBottom: 8 }}>No target set.</p>
                    <Link to="/settings" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Set in Settings →</Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center' }}>
                    <SvgRing
                      value={revenue ?? 0} max={target}
                      color={targetPct >= 100 ? 'var(--ok)' : targetPct >= 70 ? 'var(--warn)' : 'var(--accent)'}
                      center={
                        <div style={{ textAlign: 'center' }}>
                          <div className="mono num" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>{targetPct}%</div>
                          <div style={{ fontSize: 9.5, color: 'var(--mute)', marginTop: 2 }}>of goal</div>
                        </div>
                      }
                    />
                    <p style={{ fontSize: 11, color: 'var(--mute)', marginTop: 6, textAlign: 'center' }}>
                      {targetPct >= 100 ? '🎯 Target reached!' : `${format(target - (revenue ?? 0))} to go`}
                    </p>
                  </div>
                )}
              </div>

              {/* Today vs yesterday */}
              <div style={CARD}>
                <div style={{ ...SEC_LABEL, marginBottom: 14 }}>Today vs yesterday</div>
                <div className="flex flex-col gap-5">
                  {[
                    { k: 'Revenue', cur: revenue,    prev: prevRevenue, fmt: format },
                    { k: 'Orders',  cur: orderCount, prev: prevOrders,  fmt: (v) => v },
                  ].map(({ k, cur, prev, fmt }) => (
                    <div key={k}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--mute)' }}>{k}</span>
                        <span className="flex items-center gap-2">
                          <span className="mono num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{cur !== null ? fmt(cur) : '—'}</span>
                          <DeltaBadge pct={pctChange(cur, prev)} />
                        </span>
                      </div>
                      {[
                        { key: 'Today', w: '100%',                                                                                      bg: 'var(--ink)'    },
                        { key: 'Yest.', w: cur && prev ? `${Math.min(100, Math.round((prev / cur) * 100))}%` : '0%', bg: 'var(--mute-2)' },
                      ].map(({ key, w, bg }) => (
                        <div key={key} className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--mute-2)', width: 30, fontFamily: 'Geist Mono, monospace' }}>{key}</span>
                          <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: w, background: bg, borderRadius: 999, transition: 'width .3s' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kitchen */}
        <div>
          <SectionHead title="Kitchen" to="/orders" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            <KpiCard
              label="Queue"
              value={activeItems.length}
              sub={activeItems.length > 0 ? 'items pending' : 'kitchen clear'}
              subColor={activeItems.length > 5 ? 'var(--warn)' : 'var(--mute)'}
              Icon={ChefHat}
              iconColor={activeItems.length > 5 ? 'var(--warn)' : 'var(--mute-2)'}
            />
            <KpiCard
              label="Avg ticket time"
              value={avgQueueMins !== null ? minutesToLabel(avgQueueMins) : '—'}
              sub="active orders"
              Icon={Clock}
              iconColor={avgQueueMins > 20 ? 'var(--bad)' : avgQueueMins > 10 ? 'var(--warn)' : 'var(--mute-2)'}
            />
            <KpiCard
              label="Most delayed"
              value={mostDelayed ? mostDelayed.item_name : '—'}
              sub={mostDelayed ? `T${mostDelayed.table_number || '—'} · ${timeAgo(mostDelayed.order_created_at)}` : 'nothing delayed'}
              subColor={mostDelayed ? 'var(--bad)' : 'var(--mute)'}
              Icon={AlertTriangle}
              iconColor={mostDelayed ? 'var(--bad)' : 'var(--mute-2)'}
            />
            {isAdmin && (
              <KpiCard
                label="Waste today"
                value={wasteCost > 0 ? format(wasteCost) : `${wasteItems} logs`}
                sub={wasteCost > 0 ? `${wasteItems} log${wasteItems !== 1 ? 's' : ''}` : 'no waste logged'}
                Icon={Leaf}
                iconColor={wasteCost > 0 ? 'var(--warn)' : 'var(--mute-2)'}
                to="/waste"
              />
            )}
          </div>
        </div>

        {/* Customer insights (admin) */}
        {isAdmin && (
          <div>
            <SectionHead title="Customer insights" to="/reviews" />
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>

              {/* New vs returning */}
              <div style={CARD}>
                <div style={{ ...SEC_LABEL, marginBottom: 14 }}>New vs returning</div>
                <div className="flex gap-6 mb-4">
                  {[
                    { label: 'New',       value: newCust,   Icon: UserPlus,  color: 'var(--info)' },
                    { label: 'Returning', value: returning,  Icon: UserCheck, color: 'var(--ok)'   },
                  ].map(({ label, value, Icon, color }) => (
                    <div key={label}>
                      <Icon size={13} style={{ color, marginBottom: 4 }} />
                      <div className="mono num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{value ?? '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {(newCust || returning) && newCust + returning > 0 && (
                  <div>
                    <div style={{ height: 5, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${Math.round((returning / (newCust + returning)) * 100)}%`, height: '100%', background: 'var(--ok)', borderRadius: '999px 0 0 999px' }} />
                      <div style={{ flex: 1, height: '100%', background: 'var(--info)' }} />
                    </div>
                    <div className="flex justify-between" style={{ fontSize: 10.5, marginTop: 5 }}>
                      <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Returning {Math.round((returning / (newCust + returning)) * 100)}%</span>
                      <span style={{ color: 'var(--info)', fontWeight: 600 }}>New {Math.round((newCust / (newCust + returning)) * 100)}%</span>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--mute)' }}>Avg serve time</span>
                  <span className="mono num" style={{ fontSize: 13, fontWeight: 600, color: avgServe > 30 ? 'var(--bad)' : 'var(--ink)' }}>
                    {avgServe !== null ? minutesToLabel(avgServe) : '—'}
                  </span>
                </div>
              </div>

              {/* Recent feedback */}
              <div style={CARD}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div style={SEC_LABEL}>Recent feedback</div>
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
                  <div className="flex flex-col gap-3">
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
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT RAIL ───────────────────────────────────────────────────── */}
      {/* Sticky half-pill tab (mobile only) */}
      <button
        className={`rail-tab${railOpen ? ' rail-tab-hidden' : ''}`}
        onClick={() => setRailOpen(true)}
        aria-label="Open live ops"
      >
        <span className="pulse-dot" style={{ width: 5, height: 5 }} />
        <ChevronLeft size={11} strokeWidth={2.5} style={{ color: 'var(--ink-2)' }} />
      </button>
      <div className={`rail-overlay${railOpen ? ' rail-open' : ''}`} onClick={() => setRailOpen(false)} />
      <aside className={`rail-drawer${railOpen ? ' rail-open' : ''}`}>

        {/* Rail header */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-2)' }}>
            <span className="pulse-dot" /> Live ops
          </span>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 11, color: 'var(--mute-2)' }}>real-time</span>
            <button
              className="rail-close-btn rounded-md p-1 transition-colors"
              onClick={() => setRailOpen(false)}
              style={{ color: 'var(--mute)', background: 'transparent', border: 0, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Staff & Reservations (admin) */}
        {isAdmin && (
          <div>
            <RailLabel label="Staff & Ops" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '13px', background: 'var(--paper)' }}>
                <div style={{ ...SEC_LABEL, fontSize: 9.5 }}>Staff on-site</div>
                <div className="flex items-baseline gap-1" style={{ marginTop: 6 }}>
                  <span className="mono num" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>{staffPresent}</span>
                  <span style={{ fontSize: 12, color: 'var(--mute)' }}>/ {staffTotal}</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${staffTotal > 0 ? Math.round(staffPresent / staffTotal * 100) : 0}%`, background: 'var(--ok)', borderRadius: 999 }} />
                </div>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '13px', background: 'var(--paper)' }}>
                <div style={{ ...SEC_LABEL, fontSize: 9.5 }}>Reservations</div>
                <div className="mono num" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: 'var(--ink)', marginTop: 6 }}>{pendingRes.length}</div>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>pending today</div>
              </div>
            </div>
          </div>
        )}

        {/* Tables */}
        <div>
          <RailLabel label="Tables" to="/tables" right={
            tables.length > 0 ? (
              <span className="flex items-center gap-2.5">
                <span className="stat available" style={{ fontSize: 11 }}><span className="d" />{tables.filter(t => t.status === 'available').length}</span>
                <span className="stat occupied" style={{ fontSize: 11 }}><span className="d" />{occupiedTables.length}</span>
              </span>
            ) : null
          } />
          {tables.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--mute)' }}>No tables configured</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
              {[...tables].sort((a, b) => a.number - b.number).map((t) => (
                <div key={t.id} style={{
                  border: `1px solid ${t.status === 'occupied' ? 'rgba(179,55,43,.28)' : t.status === 'reserved' ? 'rgba(179,120,31,.28)' : 'var(--line-2)'}`,
                  borderRadius: 8, padding: '9px 6px',
                  background: t.status === 'occupied' ? 'rgba(179,55,43,.07)' : 'var(--paper)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                }}>
                  <span className="mono num" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--ink)' }}>{t.number}</span>
                  <span className={`stat ${t.status}`} style={{ fontSize: 0 }}><span className="d" /></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active tickets */}
        <div>
          <RailLabel label="Active tickets" to="/orders" right={
            <span style={{ fontSize: 11, color: 'var(--mute)' }}>{activeOrders.length} in queue</span>
          } />
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', overflow: 'hidden' }}>
            {activeOrders.length === 0 ? (
              <div style={{ padding: '12px 13px', fontSize: 12, color: 'var(--mute-2)', textAlign: 'center' }}>Kitchen is clear</div>
            ) : (
              <>
                {activeOrders.slice(0, 6).map((order, idx) => {
                  const label = order.channel === 'dining'
                    ? `Table ${order.table_number}`
                    : order.customer_ref || (order.channel === 'takeaway' ? 'Takeaway' : 'Delivery');
                  const st = order.status;
                  const barColor = { preparing: 'var(--warn)', ready: 'var(--info)', received: 'var(--mute-2)' }[st] || 'var(--mute-2)';
                  const minsOld = Math.floor((now - new Date(order.created_at)) / 60_000);
                  return (
                    <div key={order.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 13px', borderTop: idx > 0 ? '1px solid var(--line)' : 'none' }}>
                      <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, flexShrink: 0, background: barColor }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center justify-between" style={{ gap: 6 }}>
                          <span className="truncate" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
                          <span style={{ fontSize: 11, fontFamily: 'Geist Mono, monospace', color: minsOld >= 20 ? 'var(--bad)' : minsOld >= 10 ? 'var(--warn)' : 'var(--mute)' }}>
                            {timeAgo(order.created_at)}
                          </span>
                        </div>
                        <div style={{ marginTop: 5 }}>
                          <Chip variant={st === 'ready' ? 'info' : st === 'preparing' ? 'warn' : 'mute'}>
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </Chip>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeOrders.length > 6 && (
                  <Link to="/orders" style={{ display: 'block', padding: '8px 13px', fontSize: 11.5, color: 'var(--mute)', textDecoration: 'none', borderTop: '1px solid var(--line)' }}>
                    +{activeOrders.length - 6} more →
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stock alerts (admin) */}
        {isAdmin && (
          <div>
            <RailLabel label="Stock alerts" right={
              lowStock.length
                ? <Chip variant="bad">{lowStock.length} low</Chip>
                : <Chip variant="ok">all stocked</Chip>
            } />
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', padding: '4px 13px' }}>
              {lowStock.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--ok)', padding: '8px 0', margin: 0 }}>Everything in stock</p>
              ) : (
                lowStock.slice(0, 4).map((i) => (
                  <div key={i.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }} className="truncate">{i.name}</span>
                    <Chip variant={i.stock_on_hand <= 0 ? 'bad' : 'warn'}>
                      {i.stock_on_hand <= 0 ? 'Out' : `${i.stock_on_hand} ${i.unit}`}
                    </Chip>
                  </div>
                ))
              )}
              {lowStock.length > 4 && <p style={{ fontSize: 11, color: 'var(--mute)', padding: '7px 0', margin: 0 }}>+{lowStock.length - 4} more</p>}
            </div>
          </div>
        )}

        {/* Reservations (admin) */}
        {isAdmin && pendingRes.length > 0 && (
          <div>
            <RailLabel label="Upcoming reservations" to="/tables/reservations" />
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', padding: '4px 13px' }}>
              {pendingRes.slice(0, 5).map((r, idx) => (
                <div key={r.id} className="flex items-center justify-between" style={{ padding: '9px 0', borderTop: idx > 0 ? '1px solid var(--line)' : 'none' }}>
                  <span className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
                    <span className="stat reserved" style={{ fontSize: 0 }}><span className="d" /></span>
                    {r.guest_name || r.name || 'Guest'}
                  </span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
                    {r.reservation_time ? r.reservation_time.slice(0, 5) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </aside>
    </div>
  );
}
