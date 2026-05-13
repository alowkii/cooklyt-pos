import { TrendingUp, ShoppingBag, Users, ChefHat } from 'lucide-react';
import { useDailyReport } from '../hooks/useReports';
import { useTables } from '../hooks/useTables';
import { useActiveOrders, useKitchenQueue } from '../hooks/useOrders';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../hooks/useAuth';

const TABLE_DOT = {
  available: 'var(--ok)',
  occupied:  'var(--bad)',
  reserved:  'var(--warn)',
  cleaning:  'var(--info)',
};

function valueFontSize(str) {
  const len = str.length;
  if (len <= 6)  return 28;
  if (len <= 8)  return 24;
  if (len <= 10) return 20;
  if (len <= 13) return 17;
  return 14;
}

function Stat({ label, value, hint }) {
  return (
    <div style={{
      padding: '18px 20px',
      border: '1px solid var(--line)',
      borderRadius: 6,
      background: 'var(--paper)',
    }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '.08em', color: 'var(--mute)', marginBottom: 8,
      }}>
        {label}
      </div>
      <div className="mono num" style={{
        fontSize: valueFontSize(String(value ?? '')),
        fontWeight: 600,
        letterSpacing: '-.02em', lineHeight: 1, color: 'var(--ink)',
      }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function MicroBar({ data }) {
  const max = Math.max(...data, 1);
  return (
    <div
      className="flex items-end gap-px"
      style={{ height: 48 }}
    >
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: 'var(--ink)',
            opacity: 0.8,
            borderRadius: 1,
            minHeight: 1,
          }}
        />
      ))}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function elapsedColor(dateStr) {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (m >= 20) return 'var(--bad)';
  if (m >= 10) return 'var(--warn)';
  return 'var(--mute)';
}

export default function Overview() {
  const today = new Date().toISOString().split('T')[0];

  const { data: report }        = useDailyReport(today);
  const { data: tables = [] }   = useTables();
  const { data: orders = [] }   = useActiveOrders();
  const { data: queue  = [] }   = useKitchenQueue();
  const { format }              = useCurrency();
  const { isAdmin }             = useAuth();

  const revenue      = report?.summary?.total_revenue ?? null;
  const orderCount   = report?.summary?.total_orders  ?? null;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  const today_label = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  const hours = [2, 1, 1, 3, 8, 16, 22, 28, 24, 18, 12, 9, 14, 21, 30, 34, 28, 19];
  const active = orders.filter((o) => o.status !== 'served').slice(0, 6);

  const STATUS_DOT = { available: 'var(--ok)', occupied: 'var(--bad)', reserved: 'var(--warn)', cleaning: 'var(--info)' };

  return (
    <div className="space-y-5">
      {/* Page head */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-[22px] font-semibold m-0" style={{ letterSpacing: '-.015em', color: 'var(--ink)' }}>
          Overview
        </h1>
        <span style={{ fontSize: 12, color: 'var(--mute)' }}>Today · {today_label}</span>
      </div>

      {/* KPI row */}
      <div className={`grid grid-cols-2 gap-3 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {isAdmin && (
          <Stat
            label="Revenue Today"
            value={revenue !== null ? format(revenue) : '—'}
            hint={orderCount !== null ? `${orderCount} ticket${orderCount !== 1 ? 's' : ''}` : undefined}
          />
        )}
        <Stat
          label="Orders Today"
          value={orderCount ?? '—'}
          hint={`${active.length} still open`}
        />
        <Stat
          label="Occupied Tables"
          value={`${occupiedCount} / ${tables.length}`}
          hint="tables seated"
        />
        <Stat
          label="Kitchen Queue"
          value={queue.length}
          hint="items pending"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sales chart */}
        <div style={{
          border: '1px solid var(--line)',
          borderRadius: 6, padding: '18px 20px',
          background: 'var(--paper)',
        }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)' }}>
                Sales by hour
              </div>
              <div className="mono num" style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: 'var(--ink)' }}>
                Peak 15:00
              </div>
            </div>
            <div className="flex gap-3" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
              <span>10:00</span><span>22:00</span>
            </div>
          </div>
          <MicroBar data={hours} />
          <div className="flex justify-between mt-1.5" style={{ fontSize: 10, color: 'var(--mute)' }}>
            {['10', '12', '14', '16', '18', '20', '22'].map((h) => (
              <span key={h} className="mono num">{h}</span>
            ))}
          </div>
        </div>

        {/* Tables status */}
        <div style={{
          border: '1px solid var(--line)',
          borderRadius: 6, padding: '18px 20px',
          background: 'var(--paper)',
        }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)', marginBottom: 12 }}>
            Tables
          </div>
          {tables.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mute)' }}>No tables found</p>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}>
              {[...tables].sort((a, b) => a.number - b.number).map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col items-center justify-center rounded-[6px] py-2"
                  style={{
                    border: '1px solid var(--line-2)',
                    background: 'var(--paper)',
                  }}
                >
                  <span className="mono num font-bold" style={{ fontSize: 16, lineHeight: 1, color: 'var(--ink)' }}>
                    {t.number}
                  </span>
                  <span
                    className="inline-block rounded-full mt-1"
                    style={{ width: 5, height: 5, background: STATUS_DOT[t.status] ?? 'var(--mute-2)' }}
                    title={t.status}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active tickets */}
      <div style={{
        border: '1px solid var(--line)',
        borderRadius: 6, padding: '18px 20px',
        background: 'var(--paper)',
      }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)', marginBottom: 10 }}>
          Active tickets
        </div>
        {active.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--mute)' }}>Kitchen is clear.</p>
        ) : (
          active.map((order) => {
            const label = order.channel === 'dining'
              ? `Table ${order.table_number}`
              : order.customer_ref || (order.channel === 'takeaway' ? 'Takeaway' : 'Delivery');
            const st = order.status;
            const dotColor = { received: 'var(--mute-2)', preparing: 'var(--warn)', ready: 'var(--info)', served: 'var(--ok)' }[st] ?? 'var(--mute-2)';
            return (
              <div
                key={order.id}
                className="flex items-center gap-3 py-2"
                style={{ borderBottom: '1px solid var(--line)', fontSize: 12.5 }}
              >
                <span style={{ flex: 1, color: 'var(--ink)' }}>{label}</span>
                <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--ink-2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                  {st[0].toUpperCase() + st.slice(1)}
                </span>
                <span
                  className="mono num"
                  style={{ fontSize: 11.5, color: elapsedColor(order.created_at) }}
                >
                  {timeAgo(order.created_at)}
                </span>
              </div>
            );
          })
        )}
        {orders.length > 6 && (
          <p style={{ fontSize: 12, color: 'var(--mute)', paddingTop: 8 }}>
            +{orders.length - 6} more — see Orders page
          </p>
        )}
      </div>
    </div>
  );
}
