import { useState } from 'react';
import {
  Clock, ChefHat, ChevronDown, ChevronUp, XCircle,
  Plus, DollarSign, Utensils, ShoppingBag, Truck, X,
} from 'lucide-react';
import { useActiveOrders, useUpdateOrderStatus, useUpdateItemStatus, useCancelPendingItems } from '../hooks/useOrders';
import { useTables } from '../hooks/useTables';
import { useAuth } from '../hooks/useAuth';
import NewOrderModal from '../components/NewOrderModal';
import AddItemsModal from '../components/AddItemsModal';
import PaymentModal from '../components/PaymentModal';

const STATUS_META = {
  received:  { label: 'Received',  cls: 'bg-slate-100   text-slate-600'   },
  preparing: { label: 'Preparing', cls: 'bg-amber-100   text-amber-700'   },
  ready:     { label: 'Ready',     cls: 'bg-blue-100    text-blue-700'    },
  served:    { label: 'Served',    cls: 'bg-emerald-100 text-emerald-700' },
};

const NEXT_ACTIONS = {
  received:  [{ status: 'preparing', label: 'Start Preparing', cls: 'border-amber-200   bg-amber-50   text-amber-700   hover:bg-amber-100',   Icon: ChefHat }],
  preparing: [{ status: 'ready',     label: 'Mark Ready',      cls: 'border-blue-200    bg-blue-50    text-blue-700    hover:bg-blue-100',    Icon: ChefHat }],
  ready:     [{ status: 'served',    label: 'Mark Served',     cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100', Icon: ChefHat }],
  served:    [],
};

const CHANNEL_META = {
  dining:   { label: 'Dine In',  cls: 'bg-indigo-100 text-indigo-700', Icon: Utensils,    badgeCls: 'bg-indigo-100 text-indigo-600' },
  takeaway: { label: 'Takeaway', cls: 'bg-amber-100  text-amber-700',  Icon: ShoppingBag, badgeCls: 'bg-amber-100  text-amber-600'  },
  delivery: { label: 'Delivery', cls: 'bg-blue-100   text-blue-700',   Icon: Truck,       badgeCls: 'bg-blue-100   text-blue-600'   },
};

const ITEM_STATUS = {
  pending:   { label: 'Pending',   cls: 'bg-slate-100  text-slate-500',   dot: 'bg-slate-400',   next: 'preparing' },
  preparing: { label: 'Preparing', cls: 'bg-amber-100  text-amber-700',   dot: 'bg-amber-400',   next: 'ready'     },
  ready:     { label: 'Ready',     cls: 'bg-blue-100   text-blue-700',    dot: 'bg-blue-500',    next: 'served'    },
  served:    { label: 'Served',    cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', next: null        },
};

const CANCELLABLE = ['pending', 'preparing'];

function ItemStatusBadge({ orderId, item, canUpdate }) {
  const updateItemStatus = useUpdateItemStatus();
  const status = item.item_status ?? 'pending';
  const cfg = ITEM_STATUS[status] ?? ITEM_STATUS.pending;
  const busy = updateItemStatus.isPending;
  const canCancel = canUpdate && CANCELLABLE.includes(status);

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Advance button */}
      <button
        type="button"
        onClick={() => canUpdate && cfg.next && !busy && updateItemStatus.mutate({ orderId, itemId: item.order_item_id, status: cfg.next })}
        disabled={!canUpdate || !cfg.next || busy}
        title={cfg.next ? `Mark ${cfg.next}` : 'Fully served'}
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all
          ${cfg.cls}
          ${canUpdate && cfg.next ? 'cursor-pointer hover:brightness-95 active:scale-95' : 'cursor-default opacity-75'}
        `}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </button>

      {/* Cancel item button — only while pending or preparing */}
      {canCancel && (
        <button
          type="button"
          onClick={() => !busy && updateItemStatus.mutate({ orderId, itemId: item.order_item_id, status: 'cancelled' })}
          disabled={busy}
          title="Cancel this item"
          className="rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

function elapsed(dateStr) {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (m < 1)  return { label: 'just now', cls: 'text-slate-400' };
  if (m < 10) return { label: `${m}m`,    cls: 'text-slate-400' };
  if (m < 20) return { label: `${m}m`,    cls: 'text-amber-500 font-semibold' };
  return       { label: `${m}m`,          cls: 'text-red-500   font-semibold' };
}

export default function Orders() {
  const { data: orders = [], isLoading } = useActiveOrders();
  const { data: tables = [] }            = useTables();
  const updateStatus                     = useUpdateOrderStatus();
  const cancelPending                    = useCancelPendingItems();
  const { isAdmin, user }                = useAuth();

  const canCancel = isAdmin || user?.role === 'staff';
  const canOrder  = isAdmin || user?.role === 'staff';

  const [expanded,        setExpanded]        = useState(null);
  const [showNewOrder,    setShowNewOrder]    = useState(false);
  const [payingOrder,     setPayingOrder]     = useState(null);
  const [addingToOrder,   setAddingToOrder]   = useState(null);

  const tableMap = Object.fromEntries(tables.map((t) => [t.id, t]));

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading orders…</div>;
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {orders.length === 0
            ? 'No active orders'
            : `${orders.length} active order${orders.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="hidden text-xs text-slate-400 sm:block">auto-refreshes every 30 s</p>
          {canOrder && (
            <button
              onClick={() => setShowNewOrder(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} /> New Order
            </button>
          )}
        </div>
      </div>

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}

      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 shadow-sm">
          <ChefHat size={36} className="mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Kitchen is clear</p>
          <p className="text-xs text-slate-400">No active orders right now</p>
        </div>
      )}

      {/* ── KOT tickets ── */}
      <div className="space-y-3">
        {orders.map((order) => {
          const table   = tableMap[order.table_id];
          const isOpen  = expanded === order.id;
          const status  = STATUS_META[order.status] ?? STATUS_META.received;
          const actions = NEXT_ACTIONS[order.status] ?? [];
          const channel = CHANNEL_META[order.channel] ?? CHANNEL_META.dining;
          const ChannelIcon = channel.Icon;
          const time    = elapsed(order.created_at);
          const token   = order.id.slice(-6).toUpperCase();

          // Identify display name: table number for dining, customer_ref or channel label otherwise
          const orderTitle = order.channel === 'dining'
            ? `Table ${table?.number ?? '?'}`
            : order.customer_ref || channel.label;

          // Group items by category for KOT display
          const byCategory = order.items.reduce((acc, item) => {
            const cat = item.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
          }, {});

          return (
            <div key={order.id} className="overflow-hidden rounded-xl bg-white shadow-sm">

              {/* ── KOT header ── */}
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                {/* Channel icon badge */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${channel.badgeCls}`}>
                  {order.channel === 'dining'
                    ? <span className="text-base font-bold">{table?.number ?? '?'}</span>
                    : <ChannelIcon size={18} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-slate-800">{orderTitle}</p>
                    {/* Channel badge (hidden for dining since it's obvious from table number) */}
                    {order.channel !== 'dining' && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${channel.cls}`}>
                        {channel.label}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className={`flex items-center gap-1 ${time.cls}`}>
                      <Clock size={11} />
                      {time.label}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">
                      {(() => {
                        const total = order.items.length;
                        const ready = order.items.filter((i) => i.item_status === 'ready' || i.item_status === 'served').length;
                        const served = order.items.filter((i) => i.item_status === 'served').length;
                        if (served === total) return `All served`;
                        if (ready > 0) return `${ready}/${total} ready`;
                        return `${total} item${total !== 1 ? 's' : ''}`;
                      })()}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-[10px] text-slate-300">#{token}</span>
                  </div>
                </div>

                {isOpen
                  ? <ChevronUp size={16} className="shrink-0 text-slate-400" />
                  : <ChevronDown size={16} className="shrink-0 text-slate-400" />
                }
              </button>

              {/* ── KOT detail ── */}
              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">

                  {/* Items grouped by category */}
                  <div className="mb-4 space-y-3">
                    {Object.entries(byCategory).map(([cat, catItems]) => (
                      <div key={cat}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {cat}
                        </p>
                        <ul className="space-y-1">
                          {catItems.map((item, i) => {
                            const custLabels = Object.entries(item.customizations || {})
                              .flatMap(([, v]) => Array.isArray(v) ? v : [v]);
                            return (
                              <li key={i} className="py-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="flex-1 text-sm text-slate-800 min-w-0">
                                    <span className="mr-1.5 font-bold text-slate-900">{item.quantity}×</span>
                                    {item.item_name}
                                    {item.notes && (
                                      <span className="ml-2 text-xs italic text-slate-400">{item.notes}</span>
                                    )}
                                  </span>
                                  <ItemStatusBadge orderId={order.id} item={item} canUpdate={canOrder} />
                                </div>
                                {custLabels.length > 0 && (
                                  <p className="ml-5 text-xs text-violet-600">{custLabels.join(' · ')}</p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  {(actions.length > 0 || canCancel || canOrder) && (
                    <div className="flex gap-2 border-t border-slate-100 pt-3">
                      {actions.map(({ status: s, label, cls, Icon }) => (
                        <button
                          key={s}
                          onClick={() => updateStatus.mutate({ id: order.id, status: s })}
                          disabled={updateStatus.isPending}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${cls}`}
                        >
                          <Icon size={13} /> {label}
                        </button>
                      ))}

                      {canOrder && (
                        <button
                          onClick={() => setAddingToOrder(order)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <Plus size={13} /> Add Items
                        </button>
                      )}

                      {order.status === 'served' && canOrder && (
                        <button
                          onClick={() => setPayingOrder(order)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <DollarSign size={13} /> Collect Payment
                        </button>
                      )}

                      {canCancel && (() => {
                        const hasPending = order.items.some((i) =>
                          !i.item_status || CANCELLABLE.includes(i.item_status),
                        );
                        const hasServedOrReady = order.items.some((i) =>
                          i.item_status === 'ready' || i.item_status === 'served',
                        );
                        if (!hasPending) return null;
                        return (
                          <button
                            onClick={() => cancelPending.mutate(order.id)}
                            disabled={cancelPending.isPending}
                            title={hasServedOrReady ? 'Cancel only pending/preparing items — served items stay' : 'Cancel order'}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={13} />
                            {hasServedOrReady ? 'Cancel remaining' : 'Cancel'}
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addingToOrder && (
        <AddItemsModal
          order={addingToOrder}
          orderTitle={
            addingToOrder.channel === 'dining'
              ? `Table ${tableMap[addingToOrder.table_id]?.number ?? '?'}`
              : addingToOrder.customer_ref || CHANNEL_META[addingToOrder.channel]?.label
          }
          onClose={() => setAddingToOrder(null)}
        />
      )}

      {payingOrder && (
        <PaymentModal
          order={payingOrder}
          tableNumber={
            payingOrder.channel === 'dining'
              ? tableMap[payingOrder.table_id]?.number ?? '?'
              : payingOrder.customer_ref || CHANNEL_META[payingOrder.channel]?.label
          }
          onClose={() => setPayingOrder(null)}
        />
      )}
    </div>
  );
}
