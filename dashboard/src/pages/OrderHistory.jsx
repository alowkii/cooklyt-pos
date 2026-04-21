import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, UtensilsCrossed, ShoppingBag, Truck, Printer } from 'lucide-react';
import { useOrderHistory } from '../hooks/useOrders';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';
import api from '../api/client';
import { printReceipt } from '../utils/printReceipt';

// ── Date helpers ────────────────────────────────────────────────────────────

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1)); // Monday
  return d.toISOString().slice(0, 10);
}

function startOfMonth(dateStr) {
  return dateStr.slice(0, 7) + '-01';
}

const PRESETS = [
  { id: 'today',     label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week',      label: 'This week' },
  { id: 'month',     label: 'This month' },
  { id: 'custom',    label: 'Custom' },
];

// ── Status / channel config ──────────────────────────────────────────────────

const STATUS_COLORS = {
  paid:       'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-600',
  served:     'bg-indigo-100 text-indigo-700',
  ready:      'bg-blue-100 text-blue-700',
  preparing:  'bg-amber-100 text-amber-700',
  received:   'bg-slate-100 text-slate-600',
};

const CHANNEL_ICONS = {
  dining:   UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Truck,
};

const CHANNEL_COLORS = {
  dining:   'text-indigo-500',
  takeaway: 'text-amber-500',
  delivery: 'text-blue-500',
};

// ── Print button ─────────────────────────────────────────────────────────────

function PrintReceiptButton({ orderId, currency }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handlePrint() {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get(`/payments/${orderId}/receipt`);
      printReceipt(data, currency);
    } catch {
      setErr('Failed to load receipt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePrint}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
      >
        <Printer size={13} />
        {loading ? 'Opening…' : 'Print Receipt'}
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </span>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function OrderRow({ order, format, formatTime, currency }) {
  const [open, setOpen] = useState(false);
  const ChannelIcon = CHANNEL_ICONS[order.channel] || UtensilsCrossed;
  const token = order.id.slice(-6).toUpperCase();
  const createdBy = order.created_by_email?.split('@')[0] ?? '—';

  const displayTotal = order.status === 'paid'
    ? parseFloat(order.total_charged || 0)
    : parseFloat(order.items_total || 0);

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-slate-400">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>

        <span className="w-14 text-xs font-mono text-slate-500">{formatTime(new Date(order.created_at))}</span>

        <span className="w-16 font-mono text-xs text-slate-400">#{token}</span>

        <span className={`w-5 ${CHANNEL_COLORS[order.channel]}`}>
          <ChannelIcon size={14} />
        </span>

        <span className="flex-1 text-sm text-slate-700 truncate">
          {order.channel === 'dining'
            ? order.table_number ? `Table ${order.table_number}` : '—'
            : order.customer_ref || '—'}
        </span>

        <span className="w-28 text-xs text-slate-400 truncate hidden sm:block">{createdBy}</span>

        <span className="w-20 text-right text-xs font-medium text-slate-700">
          {order.status === 'paid' ? format(displayTotal) : '—'}
        </span>

        <span className={`w-20 text-right text-xs font-semibold rounded-full px-2 py-0.5 ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {order.status}
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-10 pb-4 pt-1 bg-slate-50 border-t border-slate-100 space-y-4">
          {/* Items */}
          <div className="space-y-1">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-slate-600">
                <span>
                  {item.name}
                  <span className="text-slate-400 ml-1">× {item.quantity}</span>
                  {item.notes && <span className="ml-2 text-xs text-slate-400 italic">{item.notes}</span>}
                </span>
                <span>{format(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Bill breakdown — only meaningful for paid orders */}
          {order.status === 'paid' && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{format(order.bill_subtotal ?? order.items_total)}</span>
              </div>
              {parseFloat(order.bill_discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>
                    Discount
                    {order.discount_type === 'percent' ? ` (${order.discount_value}%)` : ' (flat)'}
                  </span>
                  <span>−{format(order.bill_discount_amount)}</span>
                </div>
              )}
              {parseFloat(order.tax_amount) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Tax ({+(parseFloat(order.tax_rate) * 100).toFixed(4)}%)</span>
                  <span>{format(order.tax_amount)}</span>
                </div>
              )}
              {parseFloat(order.service_charge_amount) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Service charge ({+(parseFloat(order.service_charge_rate) * 100).toFixed(4)}%)</span>
                  <span>{format(order.service_charge_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-100 pt-1 mt-1">
                <span>Total charged</span>
                <span>{format(order.total_charged)}</span>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-slate-400">
                  Paid via <span className="capitalize">{order.payment_method}</span>
                </span>
                <PrintReceiptButton orderId={order.id} currency={currency} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OrderHistory() {
  const { format, currency } = useCurrency();
  const { iana, todayLocal, formatTime } = useTimezone();

  const today = todayLocal();

  const [preset,  setPreset]  = useState('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo,   setCustomTo]   = useState(today);
  const [statusFilter,  setStatusFilter]  = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  const { from, to } = useMemo(() => {
    if (preset === 'yesterday') {
      const y = shiftDate(today, -1);
      return { from: y, to: y };
    }
    if (preset === 'week')  return { from: startOfWeek(today),  to: today };
    if (preset === 'month') return { from: startOfMonth(today), to: today };
    if (preset === 'custom') return { from: customFrom, to: customTo };
    return { from: today, to: today }; // today
  }, [preset, today, customFrom, customTo]);

  const { data, isLoading, isError } = useOrderHistory({
    from,
    to,
    status:  statusFilter  || undefined,
    channel: channelFilter || undefined,
  });

  const { orders = [], stats } = data ?? {};

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── Header + filters ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Order History</h1>
          <p className="text-xs text-slate-400">{iana}</p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Date presets */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 transition-colors ${
                  preset === p.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            className="input text-xs py-1.5"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="served">Served</option>
            <option value="ready">Ready</option>
            <option value="preparing">Preparing</option>
            <option value="received">Received</option>
          </select>

          {/* Channel filter */}
          <select
            className="input text-xs py-1.5"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option value="">All channels</option>
            <option value="dining">Dining</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      {/* Custom date range */}
      {preset === 'custom' && (
        <div className="flex items-center gap-3 text-sm">
          <label className="text-slate-500">From</label>
          <input type="date" className="input text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <label className="text-slate-500">To</label>
          <input type="date" className="input text-sm" value={customTo}   onChange={(e) => setCustomTo(e.target.value)}   />
        </div>
      )}

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total orders',  value: stats.total },
            { label: 'Paid',          value: stats.paid },
            { label: 'Cancelled',     value: stats.cancelled },
            { label: 'Revenue',       value: format(stats.revenue) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span className="w-4" />
          <span className="w-14">Time</span>
          <span className="w-16">Token</span>
          <span className="w-5" />
          <span className="flex-1">Table / Ref</span>
          <span className="w-28 hidden sm:block">Staff</span>
          <span className="w-20 text-right">Total</span>
          <span className="w-20 text-right">Status</span>
        </div>

        {isLoading && (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        )}
        {isError && (
          <p className="p-8 text-center text-sm text-red-500">Failed to load orders.</p>
        )}
        {!isLoading && !isError && orders.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-400">No orders found for this period.</p>
        )}
        {!isLoading && orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            format={format}
            formatTime={formatTime}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}
