import { useState } from 'react';
import {
  Clock, ChefHat, ChevronDown, ChevronUp,
  Plus, DollarSign, Utensils, ShoppingBag, Truck, X, Printer,
} from 'lucide-react';
import { printKOT } from '../utils/printReceipt';
import { useActiveOrders, useUpdateOrderStatus, useUpdateItemStatus, useCancelPendingItems } from '../hooks/useOrders';
import { useTables } from '../hooks/useTables';
import { useAuth } from '../hooks/useAuth';
import NewOrderModal from '../components/NewOrderModal';
import AddItemsModal from '../components/AddItemsModal';
import PaymentModal from '../components/PaymentModal';

/* ── Status helpers ──────────────────────────────────────── */

const STATUS_DOT = {
  received:  'var(--mute-2)',
  preparing: 'var(--warn)',
  ready:     'var(--info)',
  served:    'var(--ok)',
};

const ITEM_DOT = {
  pending:   'var(--mute-2)',
  preparing: 'var(--warn)',
  ready:     'var(--info)',
  served:    'var(--ok)',
  cancelled: 'var(--mute-2)',
};

function StatusDot({ status, label }) {
  const dotColor = STATUS_DOT[status] ?? 'var(--mute-2)';
  const text = label ?? (status ? status[0].toUpperCase() + status.slice(1) : '');
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: dotColor, flexShrink: 0, display: 'inline-block',
      }} />
      {text}
    </span>
  );
}

function ItemStatusDot({ status }) {
  const dotColor = ITEM_DOT[status] ?? 'var(--mute-2)';
  const text = status ? status[0].toUpperCase() + status.slice(1) : '';
  const cancelled = status === 'cancelled';
  return (
    <span className="inline-flex items-center gap-1.5" style={{
      fontSize: 11.5,
      color: cancelled ? 'var(--mute-2)' : 'var(--ink-2)',
      textDecoration: cancelled ? 'line-through' : 'none',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: dotColor, flexShrink: 0, display: 'inline-block',
      }} />
      {text}
    </span>
  );
}

const NEXT_STATUS = {
  received:  'preparing',
  preparing: 'ready',
  ready:     'served',
  served:    null,
};

const NEXT_LABEL = {
  received:  'Start preparing',
  preparing: 'Mark ready',
  ready:     'Mark served',
};

const ITEM_NEXT = {
  pending:   'preparing',
  preparing: 'ready',
  ready:     'served',
  served:    null,
};

const CANCELLABLE = ['pending', 'preparing'];

const CHANNEL_ICON = {
  dining:   Utensils,
  takeaway: ShoppingBag,
  delivery: Truck,
};

function elapsed(dateStr) {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (m < 1)  return { label: 'just now', color: 'var(--mute)' };
  if (m < 10) return { label: `${m}m`,    color: 'var(--mute)' };
  if (m < 20) return { label: `${m}m`,    color: 'var(--warn)', weight: 600 };
  return       { label: `${m}m`,          color: 'var(--bad)',  weight: 600 };
}

/* ── ItemRow ─────────────────────────────────────────────── */

function ItemRow({ orderId, item, canUpdate }) {
  const updateItemStatus = useUpdateItemStatus();
  const status    = item.item_status ?? 'pending';
  const next      = ITEM_NEXT[status];
  const cancellable = CANCELLABLE.includes(status) && canUpdate;
  const busy      = updateItemStatus.isPending;
  const cancelled = status === 'cancelled';

  const custLabels = Object.entries(item.customizations || {})
    .flatMap(([, v]) => Array.isArray(v) ? v : [v]);

  return (
    <div
      className="flex items-start gap-3 py-2"
      style={{ borderBottom: '1px dashed var(--line)' }}
    >
      <span
        className="mono num shrink-0 text-[13px] w-7"
        style={{ color: 'var(--mute)', textDecoration: cancelled ? 'line-through' : 'none' }}
      >
        {item.quantity}×
      </span>

      <div className="flex-1 min-w-0">
        <span
          className="text-[13px]"
          style={{
            color: cancelled ? 'var(--mute)' : 'var(--ink)',
            textDecoration: cancelled ? 'line-through' : 'none',
          }}
        >
          {item.item_name}
          {item.notes && (
            <span className="ml-2 italic" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
              {item.notes}
            </span>
          )}
        </span>
        {custLabels.length > 0 && (
          <div className="mono mt-0.5" style={{ fontSize: 11, color: 'var(--mute)' }}>
            ↳ {custLabels.join(' · ')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => canUpdate && next && !busy && updateItemStatus.mutate({ orderId, itemId: item.order_item_id, status: next })}
          disabled={!canUpdate || !next || busy}
          title={next ? `Mark ${next}` : cancelled ? 'Cancelled' : 'Fully served'}
          style={{ background: 'transparent', border: 0, padding: 0, cursor: 'default' }}
        >
          <ItemStatusDot status={status} />
        </button>
        {cancellable && (
          <button
            onClick={() => !busy && updateItemStatus.mutate({ orderId, itemId: item.order_item_id, status: 'cancelled' })}
            disabled={busy}
            title="Cancel this item"
            className="rounded p-0.5 transition-colors"
            style={{ color: 'var(--mute-2)', background: 'transparent', border: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--bad)'; e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mute-2)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── OrderRow ────────────────────────────────────────────── */

function OrderRow({ order, table, isOpen, onToggle, canOrder, canPrepare, canAddItems, canCancel, onPay, onAddItems }) {
  const updateStatus  = useUpdateOrderStatus();
  const cancelPending = useCancelPendingItems();

  const time     = elapsed(order.created_at);
  const token    = order.id.slice(-6).toUpperCase();
  const next     = NEXT_STATUS[order.status];
  const nextLabel = NEXT_LABEL[order.status];
  const ChannelIcon = CHANNEL_ICON[order.channel] ?? Utensils;

  const orderTitle = order.channel === 'dining'
    ? `Table ${table?.number ?? '?'}`
    : order.customer_ref || (order.channel === 'takeaway' ? 'Takeaway' : 'Delivery');

  const liveItems = order.items.filter((i) => i.item_status !== 'cancelled');
  const readyCount = liveItems.filter((i) => i.item_status === 'ready' || i.item_status === 'served').length;
  const allServed  = liveItems.length > 0 && liveItems.every((i) => i.item_status === 'served');
  const summary = allServed
    ? 'All served'
    : readyCount > 0
    ? `${readyCount}/${liveItems.length} ready`
    : `${liveItems.length} item${liveItems.length !== 1 ? 's' : ''}`;

  const hasPending = order.items.some((i) => CANCELLABLE.includes(i.item_status ?? 'pending'));
  const hasServedOrReady = order.items.some((i) => i.item_status === 'ready' || i.item_status === 'served');

  const byCategory = order.items.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div>
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 text-left transition-colors duration-75"
        style={{
          minHeight: 44,
          padding: '6px 8px',
          background: isOpen ? 'var(--paper-2)' : 'transparent',
          border: 0,
          borderBottom: '1px solid var(--line)',
          cursor: 'default',
        }}
      >
        {/* Channel glyph */}
        <span className="shrink-0 flex items-center justify-center" style={{ width: 36, color: 'var(--ink)' }}>
          {order.channel === 'dining' ? (
            <span className="mono num font-bold" style={{ fontSize: 13 }}>
              T{String(table?.number ?? '?').padStart(2, '0')}
            </span>
          ) : (
            <ChannelIcon size={14} style={{ color: 'var(--mute)' }} />
          )}
        </span>

        {/* Title + summary */}
        <span className="flex-1 min-w-0">
          <span className="font-semibold" style={{ fontSize: 13, color: 'var(--ink)' }}>
            {orderTitle}
          </span>
          <span className="ml-2" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
            {summary}
          </span>
        </span>

        <StatusDot status={order.status} />

        <span
          className="mono num shrink-0"
          style={{ fontSize: 11.5, color: time.color, fontWeight: time.weight ?? 500, minWidth: 44, textAlign: 'right' }}
        >
          {time.label}
        </span>

        <span className="shrink-0" style={{ color: 'var(--mute)' }}>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div style={{ padding: '14px 8px 18px 52px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
          {/* Meta + actions */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
              <span className="mono">#{token}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {elapsed(order.created_at).label} ago
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="btn btn-sm" onClick={() => printKOT(order)}>
                <Printer size={12} /> Print KOT
              </button>
              {canAddItems && (
                <button
                  onClick={() => onAddItems({ order, orderTitle })}
                  className="btn btn-sm"
                >
                  <Plus size={12} /> Add items
                </button>
              )}
              {canCancel && hasPending && (
                <button
                  onClick={() => cancelPending.mutate(order.id)}
                  disabled={cancelPending.isPending}
                  className="btn btn-sm"
                  style={{ color: 'var(--bad)', borderColor: 'rgba(179,55,43,.22)' }}
                >
                  {hasServedOrReady ? 'Cancel remaining' : 'Cancel'}
                </button>
              )}
              {order.status === 'served' && canOrder && (
                <button
                  onClick={() => onPay({ order, tableNumber: order.channel === 'dining' ? table?.number : null })}
                  className="btn-primary btn-sm"
                >
                  <DollarSign size={12} /> Collect payment
                </button>
              )}
              {next && canOrder && (next !== 'preparing' || canPrepare) && (
                <button
                  onClick={() => updateStatus.mutate({ id: order.id, status: next })}
                  disabled={updateStatus.isPending}
                  className="btn-primary btn-sm"
                >
                  {nextLabel}
                </button>
              )}
            </div>
          </div>

          {/* Items by category */}
          {Object.entries(byCategory).map(([cat, catItems]) => (
            <div key={cat} className="mb-3">
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)', marginBottom: 4 }}>
                {cat}
              </div>
              {catItems.map((item, i) => (
                <ItemRow key={i} orderId={order.id} item={item} canUpdate={canOrder} />
              ))}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

/* ── OrdersScreen ────────────────────────────────────────── */

export default function Orders() {
  const { data: orders = [], isLoading } = useActiveOrders();
  const { data: tables = [] }            = useTables();
  const { isAdmin, user }                = useAuth();

  const canCancel   = isAdmin || user?.role === 'staff' || user?.role === 'cashier';
  const canOrder    = isAdmin || user?.role === 'staff' || user?.role === 'cashier';
  const canPrepare  = isAdmin || user?.role === 'staff';
  const canAddItems = isAdmin || user?.role === 'staff';

  const [expanded,      setExpanded]      = useState(null);
  const [showNewOrder,  setShowNewOrder]  = useState(false);
  const [filter,        setFilter]        = useState('all');
  const [payingOrder,   setPayingOrder]   = useState(null); // { order, tableNumber }
  const [addingToOrder, setAddingToOrder] = useState(null); // { order, orderTitle }

  const tableMap = Object.fromEntries(tables.map((t) => [t.id, t]));

  const counts = {
    all:      orders.length,
    kitchen:  orders.filter((o) => o.status !== 'served').length,
    dining:   orders.filter((o) => o.channel === 'dining').length,
    takeaway: orders.filter((o) => o.channel === 'takeaway').length,
    delivery: orders.filter((o) => o.channel === 'delivery').length,
  };

  const filtered = orders.filter((o) => {
    if (filter === 'all')     return true;
    if (filter === 'kitchen') return o.status !== 'served';
    return o.channel === filter;
  });

  if (isLoading) {
    return <div className="py-16 text-center text-[13px]" style={{ color: 'var(--mute)' }}>Loading orders…</div>;
  }

  return (
    <div>
      {/* Page head */}
      <div className="flex items-baseline gap-3 mb-4 flex-wrap">
        <h1 className="text-[22px] font-semibold m-0" style={{ letterSpacing: '-.015em', color: 'var(--ink)' }}>
          Orders
        </h1>
        <span style={{ fontSize: 12, color: 'var(--mute)' }}>
          {counts.kitchen} in kitchen · {counts.all} total · auto-refreshes 30s
        </span>
        <div className="ml-auto flex gap-2">
          {canOrder && (
            <button onClick={() => setShowNewOrder(true)} className="btn-primary">
              <Plus size={13} /> New order
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-4 mb-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--line)', paddingBottom: 0 }}
      >
        {[
          ['all',      'All'],
          ['kitchen',  'Kitchen'],
          ['dining',   'Dine in'],
          ['takeaway', 'Takeaway'],
          ['delivery', 'Delivery'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="btn-ghost shrink-0"
            style={{
              height: 32,
              padding: '0 2px',
              borderRadius: 0,
              marginBottom: -1,
              borderBottom: filter === k ? '1.5px solid var(--ink)' : '1.5px solid transparent',
              color: filter === k ? 'var(--ink)' : 'var(--mute)',
              fontWeight: filter === k ? 600 : 500,
            }}
          >
            {label}
            <span className="mono num ml-1.5" style={{ fontSize: 11, color: 'var(--mute-2)' }}>
              {counts[k]}
            </span>
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="grid items-center gap-3 px-2 pt-1 pb-1.5"
        style={{
          gridTemplateColumns: '44px 1fr 110px 70px 16px',
          fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em',
        }}
      >
        <span />
        <span>Order</span>
        <span>Status</span>
        <span style={{ textAlign: 'right' }}>Elapsed</span>
        <span />
      </div>

      {/* Orders list */}
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ChefHat size={32} style={{ color: 'var(--mute-2)' }} />
            <span style={{ fontSize: 13, color: 'var(--mute)' }}>Kitchen is clear</span>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              table={tableMap[order.table_id]}
              isOpen={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              canOrder={canOrder}
              canPrepare={canPrepare}
              canAddItems={canAddItems}
              canCancel={canCancel}
              onPay={setPayingOrder}
              onAddItems={setAddingToOrder}
            />
          ))
        )}
      </div>

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}
      {payingOrder && (
        <PaymentModal
          order={payingOrder.order}
          tableNumber={payingOrder.tableNumber}
          onClose={() => setPayingOrder(null)}
        />
      )}
      {addingToOrder && (
        <AddItemsModal
          order={addingToOrder.order}
          orderTitle={addingToOrder.orderTitle}
          onClose={() => setAddingToOrder(null)}
        />
      )}
    </div>
  );
}
