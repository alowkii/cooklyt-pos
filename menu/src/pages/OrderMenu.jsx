import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, Minus, ShoppingCart, CheckCircle, AlertCircle,
  X, ClipboardList, Utensils, Receipt,
} from 'lucide-react';

const STATUS_CONFIG = {
  received:  { label: 'Order received', color: 'var(--warn)', canCancel: true  },
  preparing: { label: 'Being prepared', color: 'var(--info)', canCancel: false },
  ready:     { label: 'Ready to serve', color: 'var(--ok)',   canCancel: false },
  served:    { label: 'Served',         color: 'var(--mute-2)', canCancel: false },
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
  const [activeOrders,    setActiveOrders]    = useState([]);
  const [cancelling,      setCancelling]      = useState(null);
  const [billRequesting,  setBillRequesting]  = useState(false);
  const BILL_COOLDOWN_MS = 5 * 60 * 1000;
  const billKey = `bill_requested_at_${tableId}`;
  const storedAt = parseInt(localStorage.getItem(billKey) || '0', 10);
  const remaining = BILL_COOLDOWN_MS - (Date.now() - storedAt);
  const [billDone, setBillDone] = useState(remaining > 0);

  const catRefs = useRef({});

  // Restore bill cooldown across page refreshes
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => { localStorage.removeItem(billKey); setBillDone(false); }, remaining);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v) => {
    if (!tableInfo?.currency) return String(v);
    const { symbol, rate, decimals } = tableInfo.currency;
    return `${symbol}${(parseFloat(v) * rate).toFixed(decimals)}`;
  };

  const fetchOrders = useCallback(async (tid) => {
    try {
      const res = await fetch(`/api/public/orders/table/${tid}`);
      if (res.ok) setActiveOrders(await res.json());
    } catch { /* silent */ }
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

  async function requestBill() {
    setBillRequesting(true);
    try {
      const res = await fetch('/api/public/request-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem(billKey, String(Date.now()));
      setBillDone(true);
      showToast('Staff has been notified. Your bill is on the way!');
      setTimeout(() => { localStorage.removeItem(billKey); setBillDone(false); }, BILL_COOLDOWN_MS);
    } catch {
      showToast('Could not send request. Please ask staff directly.');
    } finally {
      setBillRequesting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--paper-2)' }}>
        <p style={{ fontSize: 13, color: 'var(--mute)' }}>Loading menu…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center p-8" style={{ background: 'var(--paper-2)' }}>
        <div className="text-center">
          <AlertCircle size={40} style={{ color: 'var(--bad)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--mute)' }}>{loadError}</p>
        </div>
      </div>
    );
  }

  // ── Cart sheet ───────────────────────────────────────────────────────────────
  const CartSheet = showCart && (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,10,10,.45)' }}
        onClick={() => setShowCart(false)}
      />
      <div className="relative flex flex-col" style={{
        maxHeight: '80vh',
        background: 'var(--paper)',
        borderRadius: '16px 16px 0 0',
      }}>
        {/* Sheet header */}
        <div className="flex items-center justify-between" style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Your order
          </h2>
          <button
            onClick={() => setShowCart(false)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 0, color: 'var(--mute)', cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px' }}>
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: 0 }} className="truncate">
                    {item.name}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 1 }}>
                    {fmt(item.price)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeQty(item.id, -1)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: '1px solid var(--line-2)', background: 'var(--paper)',
                      color: 'var(--ink)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <Minus size={13} />
                  </button>
                  <span style={{ width: 20, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {cart[item.id]}
                  </span>
                  <button
                    onClick={() => changeQty(item.id, 1)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: 0, background: 'var(--ink)', color: 'var(--accent-on)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <span style={{ width: 56, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {fmt(item.price * cart[item.id])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sheet footer */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px' }}>
          <div className="flex justify-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Subtotal</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fmt(cartTotal)}</span>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.5 }}>
            Taxes &amp; charges applied at checkout by staff.
          </p>
          <button
            onClick={placeOrder}
            disabled={submitting || cartCount === 0}
            style={{
              width: '100%', borderRadius: 10, padding: '14px 0',
              background: 'var(--ink)', color: 'var(--accent-on)',
              border: 0, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              opacity: (submitting || cartCount === 0) ? 0.55 : 1,
            }}
          >
            {submitting ? 'Placing order…' : `Place Order · ${fmt(cartTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Orders tab ───────────────────────────────────────────────────────────────
  const OrdersTab = (
    <div className="flex-1 overflow-y-auto" style={{ padding: '14px 16px', paddingBottom: 24 }}>
      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={36} style={{ color: 'var(--mute-2)', marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'var(--mute)' }}>No active orders yet.</p>
          <p style={{ fontSize: 12, color: 'var(--mute-2)', marginTop: 4 }}>
            Your orders will appear here after you place them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeOrders.map((order) => {
            const s     = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
            const token = order.id.slice(-6).toUpperCase();
            const total = (order.items || []).reduce((sum, i) => sum + i.price * i.quantity, 0);
            return (
              <div key={order.id} style={{
                border: '1px solid var(--line-2)',
                borderRadius: 10,
                background: 'var(--paper)',
                overflow: 'hidden',
              }}>
                {/* Order header */}
                <div className="flex items-center justify-between" style={{
                  padding: '11px 14px',
                  borderBottom: '1px solid var(--line)',
                }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>#{token}</span>
                    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 11.5, fontWeight: 500, color: s.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      {s.label}
                    </span>
                  </div>
                  {s.canCancel && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      disabled={cancelling === order.id}
                      style={{
                        borderRadius: 6,
                        border: '1px solid rgba(179,55,43,.22)',
                        padding: '3px 10px',
                        fontSize: 11.5, fontWeight: 500,
                        color: 'var(--bad)',
                        background: 'transparent',
                        cursor: 'pointer', fontFamily: 'inherit',
                        opacity: cancelling === order.id ? 0.4 : 1,
                      }}
                    >
                      {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>

                {/* Order items */}
                <div style={{ padding: '11px 14px' }} className="space-y-1.5">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between" style={{ fontSize: 13 }}>
                      <span style={{ color: 'var(--ink)' }}>
                        {item.name}
                        <span style={{ color: 'var(--mute)', marginLeft: 6 }}>× {item.quantity}</span>
                      </span>
                      <span style={{ color: 'var(--mute)' }}>{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {total > 0 && (
                    <div className="flex justify-between" style={{
                      borderTop: '1px solid var(--line)',
                      paddingTop: 8, marginTop: 4,
                      fontSize: 13, fontWeight: 600,
                    }}>
                      <span style={{ color: 'var(--mute)' }}>Subtotal</span>
                      <span style={{ color: 'var(--ink)' }}>{fmt(total)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Bill */}
      {activeOrders.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            borderRadius: 10,
            border: '1px solid var(--line-2)',
            background: 'var(--paper)',
            padding: '14px 16px',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              Ready to pay?
            </p>
            <p style={{ fontSize: 12, color: 'var(--mute)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Notify staff to bring your bill. Taxes &amp; charges will be applied at checkout.
            </p>
            <button
              onClick={requestBill}
              disabled={billRequesting || billDone}
              style={{
                width: '100%', borderRadius: 8, padding: '12px 0',
                border: billDone ? '1.5px solid var(--ok)' : '1.5px solid var(--ink)',
                background: billDone ? 'rgba(31,138,91,.06)' : 'transparent',
                color: billDone ? 'var(--ok)' : 'var(--ink)',
                fontSize: 14, fontWeight: 600,
                cursor: billRequesting || billDone ? 'default' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: billRequesting ? 0.6 : 1,
                transition: 'all .15s',
              }}
            >
              <Receipt size={16} />
              {billRequesting ? 'Requesting…' : billDone ? 'Bill requested ✓' : 'Request Bill'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Menu tab ─────────────────────────────────────────────────────────────────
  const MenuTab = (
    <>
      {/* Category pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper)',
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => catRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{
                flexShrink: 0, borderRadius: 20,
                border: '1px solid var(--line-2)',
                padding: '4px 12px',
                fontSize: 12, fontWeight: 600, color: 'var(--mute)',
                background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 100 }}>
        {categories.map((cat) => (
          <div key={cat}>
            {/* Sticky category label */}
            <div
              ref={(el) => { catRefs.current[cat] = el; }}
              style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'var(--paper-2)',
                padding: '6px 16px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--mute)' }}>
                {cat}
              </span>
            </div>

            {/* Items */}
            {items.filter((i) => i.category === cat).map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4"
                  style={{
                    background: 'var(--paper)',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, margin: 0 }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 3 }}>
                      {fmt(item.price)}
                    </p>
                  </div>

                  {qty > 0 ? (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => changeQty(item.id, -1)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          border: '2px solid var(--ink)', background: 'transparent',
                          color: 'var(--ink)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ width: 20, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          border: 0, background: 'var(--ink)', color: 'var(--accent-on)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: '2px solid var(--ink)', background: 'transparent',
                        color: 'var(--ink)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-20 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>
            Menu is empty. Please ask staff for assistance.
          </div>
        )}
      </div>
    </>
  );

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--paper-2)' }}>
      {CartSheet}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center gap-2.5" style={{
          background: 'var(--ink)', color: 'var(--accent-on)',
          padding: '12px 16px', borderRadius: 10,
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px -8px rgba(10,10,10,.5)',
        }}>
          <CheckCircle size={15} style={{ flexShrink: 0, color: 'var(--ok)' }} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'var(--ink)', padding: '20px 16px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            fontSize: 10, fontWeight: 600, color: 'rgba(250,250,248,.5)',
            textTransform: 'uppercase', letterSpacing: '.12em', margin: '0 0 3px',
          }}>
            {tableInfo?.restaurant_name}
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-on)', margin: 0, lineHeight: 1.2 }}>
            Table {tableInfo?.table_number}
          </h1>
        </div>
        <svg width="28" height="28" viewBox="0 0 200 200" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                fill="none" stroke="rgba(250,250,248,0.7)" strokeWidth="15.6" strokeLinecap="round"/>
          <circle cx="100" cy="100" r="10.8" fill="#b06a3b"/>
        </svg>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {tab === 'menu' ? MenuTab : OrdersTab}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && tab === 'menu' && (
        <div style={{ position: 'absolute', bottom: 64, left: 16, right: 16, zIndex: 20 }}>
          <button
            onClick={() => setShowCart(true)}
            className="flex w-full items-center gap-3"
            style={{
              background: 'var(--ink)', color: 'var(--accent-on)',
              border: 0, borderRadius: 14, padding: '14px 18px',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 28px -8px rgba(10,10,10,.5)',
            }}
          >
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(250,250,248,.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {cartCount}
            </span>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600 }}>View cart</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(cartTotal)}</span>
            <ShoppingCart size={17} />
          </button>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="flex" style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        {[
          { id: 'menu',   label: 'Menu',      Icon: Utensils,      badge: 0 },
          { id: 'orders', label: 'My Orders', Icon: ClipboardList, badge: activeOrders.length },
        ].map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="relative flex flex-1 flex-col items-center"
            style={{
              gap: 3, padding: '10px 0',
              fontSize: 11.5, fontWeight: 600,
              color: tab === id ? 'var(--ink)' : 'var(--mute-2)',
              background: 'transparent', border: 0,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'color .1s',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} />
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -8,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--ink)', color: 'var(--accent-on)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700,
                }}>
                  {badge}
                </span>
              )}
            </div>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
