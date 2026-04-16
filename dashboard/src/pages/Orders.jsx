import { useState } from 'react';
import { Clock, ChefHat, ChevronDown, ChevronUp, XCircle, Plus, DollarSign } from 'lucide-react';
import { useActiveOrders, useUpdateOrderStatus } from '../hooks/useOrders';
import { useTables } from '../hooks/useTables';
import { useAuth } from '../hooks/useAuth';
import NewOrderModal from '../components/NewOrderModal';
import PaymentModal from '../components/PaymentModal';

// Status display config
const STATUS_META = {
  received:  { label: 'Received',  cls: 'bg-slate-100  text-slate-600'  },
  preparing: { label: 'Preparing', cls: 'bg-amber-100  text-amber-700'  },
  ready:     { label: 'Ready',     cls: 'bg-blue-100   text-blue-700'   },
  served:    { label: 'Served',    cls: 'bg-emerald-100 text-emerald-700' },
};

// Next-step actions per current status
// canCancel is evaluated separately based on role
const NEXT_ACTIONS = {
  received:  [{ status: 'preparing', label: 'Start Preparing', cls: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',    Icon: ChefHat  }],
  preparing: [{ status: 'ready',     label: 'Mark Ready',      cls: 'border-blue-200  bg-blue-50  text-blue-700  hover:bg-blue-100',     Icon: ChefHat  }],
  ready:     [{ status: 'served',    label: 'Mark Served',     cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100', Icon: ChefHat }],
  served:    [],
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export default function Orders() {
  const { data: orders = [], isLoading } = useActiveOrders();
  const { data: tables = [] }            = useTables();
  const updateStatus                     = useUpdateOrderStatus();
  const { isAdmin, user }                = useAuth();

  const canCancel   = isAdmin || user?.role === 'staff';
  const canOrder    = isAdmin || user?.role === 'staff';

  const [expanded,      setExpanded]      = useState(null);
  const [showNewOrder,  setShowNewOrder]  = useState(false);
  const [payingOrder,   setPayingOrder]   = useState(null);

  const tableMap = Object.fromEntries(tables.map((t) => [t.id, t]));

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading orders…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {orders.length === 0
            ? 'No active orders'
            : `${orders.length} active order${orders.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400">
            auto-refreshes every 30 s
          </p>
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

      <div className="space-y-3">
        {orders.map((order) => {
          const table   = tableMap[order.table_id];
          const isOpen  = expanded === order.id;
          const meta    = STATUS_META[order.status] ?? STATUS_META.received;
          const actions = NEXT_ACTIONS[order.status] ?? [];

          return (
            <div key={order.id} className="rounded-xl bg-white shadow-sm">
              {/* ── Header ── */}
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-700">
                  {table?.number ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">
                      Table {table?.number ?? '?'}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </span>
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    <Clock size={11} className="mr-1 inline-block" />
                    {timeAgo(order.created_at)}
                  </p>
                </div>

                {isOpen
                  ? <ChevronUp size={16} className="shrink-0 text-slate-400" />
                  : <ChevronDown size={16} className="shrink-0 text-slate-400" />
                }
              </button>

              {/* ── Expanded detail ── */}
              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <ul className="mb-4 space-y-1.5">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex items-start justify-between text-sm">
                        <span className="text-slate-700">
                          <span className="mr-1.5 font-medium">{item.quantity}×</span>
                          {item.item_name}
                        </span>
                        {item.notes && (
                          <span className="ml-2 shrink-0 text-xs text-slate-400 italic">
                            {item.notes}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {(actions.length > 0 || canCancel || (order.status === 'served' && canOrder)) && (
                    <div className="flex gap-2">
                      {actions.map(({ status, label, cls, Icon }) => (
                        <button
                          key={status}
                          onClick={() => updateStatus.mutate({ id: order.id, status })}
                          disabled={updateStatus.isPending}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${cls}`}
                        >
                          <Icon size={13} /> {label}
                        </button>
                      ))}

                      {order.status === 'served' && canOrder && (
                        <button
                          onClick={() => setPayingOrder(order)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <DollarSign size={13} /> Collect Payment
                        </button>
                      )}

                      {canCancel && order.status !== 'served' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'cancelled' })}
                          disabled={updateStatus.isPending}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={13} /> Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {payingOrder && (
        <PaymentModal
          order={payingOrder}
          tableNumber={tableMap[payingOrder.table_id]?.number ?? '?'}
          onClose={() => setPayingOrder(null)}
        />
      )}
    </div>
  );
}
