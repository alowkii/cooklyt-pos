import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, Minus, ShoppingCart, CheckCircle, AlertCircle,
  X, Clock, ChefHat, Utensils, ClipboardList,
} from 'lucide-react';

const STATUS_CONFIG = {
  received:  { label: 'Order received', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   canCancel: true  },
  preparing: { label: 'Being prepared', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400',    canCancel: false },
  ready:     { label: 'Ready to serve', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', canCancel: false },
  served:    { label: 'Served',         bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-300',   canCancel: false },
};

export default function OrderMenu() {
  const { tableId } = useParams();

  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [tableInfo,    setTableInfo]    = useState(null);
  const [items,        setItems]        = useState([]);
  const [cart,         setCart]         = useState({});
  const [tab,          setTab]          = useState('menu');
  const [showCart,     setShowCart]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState('');
  const [activeOrders, setActiveOrders] = useState([]);
  const [cancelling,   setCancelling]   = useState(null);

  const catRefs = useRef({});

  const fmt = (v) => {
    if (!tableInfo?.currency) return String(v);
    const { symbol, rate, decimals } = tableInfo.currency;
    return `${symbol}${(parseFloat(v) * rate).toFixed(decimals)}`;
  };

  const fetchOrders = useCallback(async (tid) => {
    try {
      const res = await fetch(`/api/public/orders/table/${tid}`);
      if (res.ok) setActiveOrders(await res.json());
    } catch { /* silent — polling */ }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const tr = await fetch(`/api/public/table/${tableId}`);
        if (!tr.ok) throw new Error('Table not found. Please ask staff for help.');
        const table = await tr.json();
        setTableInfo(table);

        const [mr] = await Promise.all([
          fetch(`/api/public/menu/${table.restaurant_id}`),
          fetchOrders(tableId),
        ]);
        if (!mr.ok) throw new Error('Failed to load menu.');
        setItems(await mr.json());
      } catch (e) {
        setLoadError(e.message || 'Could not load menu. Please ask staff for help.');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(() => fetchOrders(tableId), 12000);
    return () => clearInterval(interval);
  }, [tableId, fetchOrders]);

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const cartItems  = items.filter((i) => (cart[i.id] || 0) > 0);
  const cartCount  = Object.values(cart).reduce((s, v) => s + v, 0);
  const cartTotal  = cartItems.reduce((s, i) => s + i.price * (cart[i.id] || 0), 0);

  function changeQty(id, delta) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function placeOrder() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          items: cartItems.map((i) => ({ menuItemId: i.id, quantity: cart[i.id] })),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to place order.');
      }
      setCart({});
      setShowCart(false);
      await fetchOrders(tableId);
      showToast('Order placed! Kitchen has been notified.');
      setTab('orders');
    } catch (e) {
      showToast(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOrder(orderId) {
    setCancelling(orderId);
    try {
      const res = await fetch(`/api/public/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Could not cancel order.');
      }
      await fetchOrders(tableId);
      showToast('Order cancelled.');
    } catch (e) {
      showToast(e.message);
    } finally {
      setCancelling(null);
    }
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-3 text-5xl">🍽️</div>
          <p className="text-sm text-slate-400">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white p-8">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-slate-600">{loadError}</p>
        </div>
      </div>
    );
  }

  // ── Cart Sheet ───────────────────────────────────────────────────────────────
  const CartSheet = showCart && (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
      <div className="relative flex max-h-[80vh] flex-col rounded-t-2xl bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Your order</h2>
          <button onClick={() => setShowCart(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-400">{fmt(item.price)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeQty(item.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center text-sm font-bold">{cart[item.id]}</span>
                <button
                  onClick={() => changeQty(item.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white"
                >
                  <Plus size={13} />
                </button>
              </div>
              <span className="w-14 text-right text-sm font-semibold text-slate-800">
                {fmt(item.price * cart[item.id])}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold text-slate-700">Subtotal</span>
            <span className="font-bold text-slate-900">{fmt(cartTotal)}</span>
          </div>
          <p className="mb-4 text-xs text-slate-400">Taxes & charges applied at checkout by staff.</p>
          <button
            onClick={placeOrder}
            disabled={submitting || cartCount === 0}
            className="w-full rounded-xl bg-indigo-600 py-4 text-sm font-bold text-white disabled:opacity-60 active:bg-indigo-700"
          >
            {submitting ? 'Placing order…' : `Place Order · ${fmt(cartTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Orders Tab ───────────────────────────────────────────────────────────────
  const OrdersTab = (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={40} className="mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">No active orders yet.</p>
          <p className="text-xs text-slate-300 mt-1">Your orders will appear here after you place them.</p>
        </div>
      ) : (
        activeOrders.map((order) => {
          const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
          const token = order.id.slice(-6).toUpperCase();
          const total = (order.items || []).reduce((sum, i) => sum + i.price * i.quantity, 0);
          return (
            <div key={order.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">#{token}</span>
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
                {s.canCancel && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    disabled={cancelling === order.id}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-500 disabled:opacity-40 active:bg-red-50"
                  >
                    {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {item.name}
                      <span className="ml-1.5 text-slate-400">× {item.quantity}</span>
                    </span>
                    <span className="text-slate-500">{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
                {total > 0 && (
                  <div className="flex justify-between border-t border-slate-50 pt-2 text-sm font-semibold">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="text-slate-800">{fmt(total)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ── Menu Tab ─────────────────────────────────────────────────────────────────
  const MenuTab = (
    <>
      {/* Category pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none border-b border-slate-100 bg-white">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => catRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 active:bg-indigo-50"
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto pb-32">
        {categories.map((cat) => (
          <div key={cat}>
            <div
              ref={(el) => { catRefs.current[cat] = el; }}
              className="sticky top-0 z-10 bg-slate-50 px-4 py-2"
            >
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{cat}</span>
            </div>
            <div className="space-y-px">
              {items.filter((i) => i.category === cat).map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-white px-4 py-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{item.name}</p>
                      <p className="mt-0.5 text-sm font-medium text-indigo-600">{fmt(item.price)}</p>
                    </div>
                    {qty > 0 ? (
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => changeQty(item.id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 text-indigo-600 active:bg-indigo-50"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-slate-800">{qty}</span>
                        <button
                          onClick={() => changeQty(item.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white active:bg-indigo-700"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-indigo-600 text-indigo-600 active:bg-indigo-50"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-20 text-center text-sm text-slate-400">
            Menu is empty. Please ask staff for assistance.
          </div>
        )}
      </div>
    </>
  );

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {CartSheet}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle size={16} className="shrink-0 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-indigo-700 px-4 pt-5 pb-4 text-white shadow">
        <p className="text-xs font-medium text-indigo-300 uppercase tracking-widest mb-0.5">
          {tableInfo?.restaurant_name}
        </p>
        <h1 className="text-xl font-bold leading-tight">Table {tableInfo?.table_number}</h1>
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {tab === 'menu' ? MenuTab : OrdersTab}
      </div>

      {/* Cart button */}
      {cartCount > 0 && tab === 'menu' && (
        <div className="absolute bottom-16 left-4 right-4 z-20">
          <button
            onClick={() => setShowCart(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-indigo-600 px-5 py-4 text-white shadow-xl active:bg-indigo-700"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
              {cartCount}
            </div>
            <span className="flex-1 text-left text-sm font-semibold">View cart</span>
            <span className="text-sm font-bold">{fmt(cartTotal)}</span>
            <ShoppingCart size={18} />
          </button>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="flex border-t border-slate-200 bg-white">
        <button
          onClick={() => setTab('menu')}
          className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors ${
            tab === 'menu' ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <Utensils size={20} />
          Menu
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors ${
            tab === 'orders' ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <ClipboardList size={20} />
            {activeOrders.length > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                {activeOrders.length}
              </span>
            )}
          </div>
          My Orders
        </button>
      </div>
    </div>
  );
}
