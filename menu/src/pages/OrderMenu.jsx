import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, Minus, ShoppingCart, CheckCircle, AlertCircle,
  X, ClipboardList, Utensils, Receipt, SlidersHorizontal,
} from 'lucide-react';

const STATUS_CONFIG = {
  received:  { label: 'Order received', color: 'var(--warn)', canCancel: true  },
  preparing: { label: 'Being prepared', color: 'var(--info)', canCancel: false },
  ready:     { label: 'Ready to serve', color: 'var(--ok)',   canCancel: false },
  served:    { label: 'Served',         color: 'var(--mute-2)', canCancel: false },
};

export default function OrderMenu() {
  const { tableId } = useParams();

  const [loading,        setLoading]        = useState(true);
  const [loadError,      setLoadError]      = useState('');
  const [tableInfo,      setTableInfo]      = useState(null);
  const [items,          setItems]          = useState([]);
  const [cart,           setCart]           = useState([]);   // array of cart lines
  const [tab,            setTab]            = useState('menu');
  const [showCart,       setShowCart]       = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [toast,          setToast]          = useState('');
  const [activeOrders,   setActiveOrders]   = useState([]);
  const [cancelling,     setCancelling]     = useState(null);
  const [billRequesting, setBillRequesting] = useState(false);

  // Customization modal
  const [custModal,  setCustModal]  = useState(null); // null | menuItem
  const [selections, setSelections] = useState({});   // { [groupIndex]: [label, ...] }
  const [custNotes,  setCustNotes]  = useState('');

  // Per-line note editing in cart (Set of _key values whose textarea is open)
  const [openNoteKeys, setOpenNoteKeys] = useState(new Set());

  // Inline note below menu item row (only one item at a time)
  const [inlineNoteItemId, setInlineNoteItemId] = useState(null);

  const BILL_COOLDOWN_MS = 5 * 60 * 1000;
  const billKey  = `bill_requested_at_${tableId}`;
  const storedAt = parseInt(localStorage.getItem(billKey) || '0', 10);
  const remaining = BILL_COOLDOWN_MS - (Date.now() - storedAt);
  const [billDone, setBillDone] = useState(remaining > 0);

  const catRefs = useRef({});

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => { localStorage.removeItem(billKey); setBillDone(false); }, remaining);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v) => {
    if (!tableInfo?.currency) return String(v);
    const { symbol, decimals } = tableInfo.currency;
    return `${symbol}${parseFloat(v).toFixed(decimals)}`;
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
  const cartCount  = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal  = cart.reduce((s, l) => s + (parseFloat(l.item.price) + l.extraPrice) * l.quantity, 0);

  function itemCartQty(itemId) {
    return cart.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.quantity, 0);
  }

  function computeExtraPrice(item, sels) {
    let extra = 0;
    (item.customization_groups || []).forEach((group, gi) => {
      (sels[gi] || []).forEach((lbl) => {
        const opt = (group.options || []).find((o) => o.label === lbl);
        if (opt) extra += parseFloat(opt.priceAdd || 0);
      });
    });
    return extra;
  }

  // ── Cart mutation helpers ────────────────────────────────────────────────────

  function addSimple(item) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.itemId === item.id && Object.keys(l.selections).length === 0);
      if (idx >= 0) return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { _key: Math.random(), itemId: item.id, item, quantity: 1, selections: {}, notes: '', extraPrice: 0 }];
    });
  }

  function removeSimple(itemId) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.itemId === itemId && Object.keys(l.selections).length === 0);
      if (idx < 0) return prev;
      const line = prev[idx];
      if (line.quantity <= 1) return prev.filter((_, i) => i !== idx);
      return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity - 1 } : l);
    });
  }

  function changeLineQty(key, delta) {
    setCart((prev) => {
      const line = prev.find((l) => l._key === key);
      if (!line) return prev;
      if (delta < 0 && line.quantity <= 1) return prev.filter((l) => l._key !== key);
      return prev.map((l) => l._key === key ? { ...l, quantity: l.quantity + delta } : l);
    });
  }

  function updateLineNote(key, val) {
    setCart((prev) => prev.map((l) => l._key === key ? { ...l, notes: val } : l));
  }

  function toggleNoteOpen(key) {
    setOpenNoteKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Updates the notes field on a simple (no-customization) cart line
  function updateSimpleItemNote(itemId, text) {
    setCart((prev) =>
      prev.map((l) =>
        l.itemId === itemId && Object.keys(l.selections).length === 0
          ? { ...l, notes: text }
          : l,
      ),
    );
  }

  // Auto-close inline note when the item is removed from cart
  useEffect(() => {
    if (!inlineNoteItemId) return;
    const stillInCart = cart.some(
      (l) => l.itemId === inlineNoteItemId && Object.keys(l.selections).length === 0,
    );
    if (!stillInCart) setInlineNoteItemId(null);
  }, [cart, inlineNoteItemId]);

  // ── Customization modal helpers ──────────────────────────────────────────────

  function openCustomization(item) {
    const defaults = {};
    (item.customization_groups || []).forEach((group, gi) => {
      const defs = (group.options || []).filter((o) => o.isDefault).map((o) => o.label);
      if (defs.length) defaults[gi] = defs;
    });
    setSelections(defaults);
    setCustNotes('');
    setCustModal(item);
  }

  function toggleOption(gi, label, isSingle) {
    setSelections((prev) => {
      const cur = prev[gi] || [];
      if (isSingle) return { ...prev, [gi]: [label] };
      const has = cur.includes(label);
      return { ...prev, [gi]: has ? cur.filter((l) => l !== label) : [...cur, label] };
    });
  }

  const custReady = custModal
    ? (custModal.customization_groups || []).every((g, i) => !g.required || (selections[i]?.length > 0))
    : true;

  function confirmCustomization() {
    if (!custReady) return;
    const item = custModal;
    const extraPrice = computeExtraPrice(item, selections);
    const selJson = JSON.stringify(selections);
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id && JSON.stringify(l.selections) === selJson);
      if (existing) return prev.map((l) => l === existing ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { _key: Math.random(), itemId: item.id, item, quantity: 1, selections: { ...selections }, notes: custNotes, extraPrice }];
    });
    setCustModal(null);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

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
          items: cart.map((line) => ({
            menuItemId: line.itemId,
            quantity:   line.quantity,
            notes:      line.notes || null,
            customizations: line.selections,
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to place order.');
      }
      setCart([]);
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

  // ── Loading / error screens ──────────────────────────────────────────────────

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

  // ── Customization modal ──────────────────────────────────────────────────────

  const CustModal = custModal && (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,10,10,.5)' }}
        onClick={() => setCustModal(null)}
      />
      <div className="relative flex flex-col" style={{
        maxHeight: '92vh',
        background: 'var(--paper)',
        borderRadius: '16px 16px 0 0',
      }}>
        {/* Header */}
        <div className="flex items-start justify-between" style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--line)',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {custModal.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--mute)', margin: '3px 0 0' }}>
              {fmt(custModal.price)}
              {computeExtraPrice(custModal, selections) > 0 && (
                <span style={{ color: 'var(--ink)' }}>
                  {' '}+ {fmt(computeExtraPrice(custModal, selections))} extras
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setCustModal(null)}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 0, color: 'var(--mute)', cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Groups + notes */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 16px 4px' }}>
          {(custModal.customization_groups || []).map((group, gi) => (
            <div key={gi} style={{ marginBottom: 22 }}>
              <div className="flex items-baseline gap-2 mb-3">
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  {group.name}
                </p>
                <span style={{ fontSize: 11, color: group.required ? 'var(--bad)' : 'var(--mute)' }}>
                  {group.required ? 'Required' : 'Optional'} · {group.type === 'single' ? 'pick one' : 'pick any'}
                </span>
              </div>
              <div className="space-y-2">
                {(group.options || []).map((opt) => {
                  const isSingle = group.type === 'single';
                  const picked   = (selections[gi] || []).includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => toggleOption(gi, opt.label, isSingle)}
                      className="flex w-full items-center justify-between"
                      style={{
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: picked ? '2px solid var(--ink)' : '1px solid var(--line-2)',
                        background: picked ? 'var(--paper-2)' : 'transparent',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'border-color .1s, background .1s',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{
                          width: 18, height: 18, flexShrink: 0,
                          borderRadius: isSingle ? '50%' : 4,
                          border: picked
                            ? (isSingle ? '5px solid var(--ink)' : 'none')
                            : '1.5px solid var(--line-2)',
                          background: picked && !isSingle ? 'var(--ink)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .1s',
                        }}>
                          {picked && !isSingle && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="var(--paper)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: picked ? 500 : 400 }}>
                          {opt.label}
                        </span>
                      </div>
                      {parseFloat(opt.priceAdd || 0) > 0 && (
                        <span style={{ fontSize: 13, color: 'var(--mute)', flexShrink: 0 }}>
                          +{fmt(opt.priceAdd)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)', marginBottom: 6 }}>
              Special instructions (optional)
            </p>
            <textarea
              value={custNotes}
              onChange={(e) => setCustNotes(e.target.value)}
              placeholder="e.g. No onions, extra sauce…"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                borderRadius: 8,
                border: '1px solid var(--line-2)',
                background: 'var(--paper-2)',
                color: 'var(--ink)', fontSize: 13,
                padding: '10px 12px',
                fontFamily: 'inherit', resize: 'none',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Add button */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
          <button
            onClick={confirmCustomization}
            disabled={!custReady}
            style={{
              width: '100%', borderRadius: 10, padding: '14px 0',
              background: 'var(--ink)', color: 'var(--accent-on)',
              border: 0, fontSize: 14, fontWeight: 700,
              cursor: custReady ? 'pointer' : 'default', fontFamily: 'inherit',
              opacity: custReady ? 1 : 0.45,
              transition: 'opacity .15s',
            }}
          >
            {custReady
              ? `Add to order · ${fmt(parseFloat(custModal.price) + computeExtraPrice(custModal, selections))}`
              : 'Select required options to continue'
            }
          </button>
        </div>
      </div>
    </div>
  );

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
        {/* Header */}
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

        {/* Cart lines */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px' }}>
          <div className="space-y-4">
            {cart.map((line) => {
              const unitPrice  = parseFloat(line.item.price) + line.extraPrice;
              const selSummary = Object.values(line.selections).flat().join(', ');
              return (
                <div key={line._key} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: 0 }} className="truncate">
                      {line.item.name}
                    </p>
                    {selSummary && (
                      <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 1, lineHeight: 1.4 }}>
                        {selSummary}
                      </p>
                    )}
                    {/* Inline note editor */}
                    {openNoteKeys.has(line._key) ? (
                      <textarea
                        autoFocus
                        value={line.notes}
                        onChange={(e) => updateLineNote(line._key, e.target.value)}
                        onBlur={() => { if (!line.notes) toggleNoteOpen(line._key); }}
                        placeholder="e.g. No onions, extra sauce…"
                        rows={2}
                        style={{
                          marginTop: 6, width: '100%', boxSizing: 'border-box',
                          borderRadius: 7, border: '1px solid var(--line-2)',
                          background: 'var(--paper-2)', color: 'var(--ink)',
                          fontSize: 12, padding: '7px 10px',
                          fontFamily: 'inherit', resize: 'none', outline: 'none',
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => toggleNoteOpen(line._key)}
                        style={{
                          marginTop: 4, background: 'none', border: 'none',
                          padding: 0, cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'inherit', display: 'block',
                        }}
                      >
                        {line.notes
                          ? <span style={{ fontSize: 11.5, color: 'var(--mute)', fontStyle: 'italic' }}>{line.notes}</span>
                          : <span style={{ fontSize: 11.5, color: 'var(--mute-2)' }}>+ Add note</span>
                        }
                      </button>
                    )}
                    <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 4 }}>
                      {fmt(unitPrice)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => changeLineQty(line._key, -1)}
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
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => changeLineQty(line._key, 1)}
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
                  <span style={{
                    width: 56, textAlign: 'right', flexShrink: 0,
                    fontSize: 13, fontWeight: 600, color: 'var(--ink)', paddingTop: 2,
                  }}>
                    {fmt(unitPrice * line.quantity)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
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
                <div style={{ padding: '11px 14px' }} className="space-y-1.5">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ fontSize: 13 }}>
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--ink)' }}>
                          {item.name}
                          <span style={{ color: 'var(--mute)', marginLeft: 6 }}>× {item.quantity}</span>
                        </span>
                        <span style={{ color: 'var(--mute)' }}>{fmt(item.price * item.quantity)}</span>
                      </div>
                      {item.notes && (
                        <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2, fontStyle: 'italic' }}>
                          {item.notes}
                        </p>
                      )}
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

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 100 }}>
        {categories.map((cat) => (
          <div key={cat}>
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

            {items.filter((i) => i.category === cat).map((item) => {
              const hasCustom = (item.customization_groups || []).length > 0;
              const qty       = itemCartQty(item.id);
              const simpleQty = cart.find((l) => l.itemId === item.id && Object.keys(l.selections).length === 0)?.quantity || 0;

              const inlineOpen = inlineNoteItemId === item.id;
              const simpleNote = cart.find(
                (l) => l.itemId === item.id && Object.keys(l.selections).length === 0,
              )?.notes || '';

              return (
                <div
                  key={item.id}
                  style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}
                >
                  {/* Item row */}
                  <div className="flex items-start gap-4" style={{ padding: '14px 16px' }}>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, margin: 0 }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 3 }}>
                        {fmt(item.price)}
                      </p>
                      {hasCustom && (
                        <p className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>
                          <SlidersHorizontal size={10} /> Customizable
                        </p>
                      )}
                      {/* Show note preview below item name when inline note is closed */}
                      {!hasCustom && !inlineOpen && simpleNote && (
                        <p
                          style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 3, fontStyle: 'italic', cursor: 'pointer' }}
                          onClick={() => setInlineNoteItemId(item.id)}
                        >
                          {simpleNote}
                        </p>
                      )}
                    </div>

                    {hasCustom ? (
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        {qty > 0 && (
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', minWidth: 18, textAlign: 'center' }}>
                            {qty}
                          </span>
                        )}
                        <button
                          onClick={() => openCustomization(item)}
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            border: '2px solid var(--ink)', background: 'transparent',
                            color: 'var(--ink)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    ) : simpleQty > 0 ? (
                      <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                        <button
                          onClick={() => removeSimple(item.id)}
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
                          {simpleQty}
                        </span>
                        <button
                          onClick={() => { addSimple(item); setInlineNoteItemId(item.id); }}
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
                        onClick={() => { addSimple(item); setInlineNoteItemId(item.id); }}
                        style={{
                          width: 36, height: 36, borderRadius: '50%',
                          border: '2px solid var(--ink)', background: 'transparent',
                          color: 'var(--ink)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>

                  {/* Inline note — only for simple items */}
                  {!hasCustom && inlineOpen && (
                    <div style={{ padding: '0 16px 14px' }}>
                      <textarea
                        autoFocus
                        value={simpleNote}
                        onChange={(e) => updateSimpleItemNote(item.id, e.target.value)}
                        placeholder="e.g. No onions, extra sauce…"
                        rows={2}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          borderRadius: 8, border: '1px solid var(--line-2)',
                          background: 'var(--paper-2)', color: 'var(--ink)',
                          fontSize: 13, padding: '9px 12px',
                          fontFamily: 'inherit', resize: 'none', outline: 'none',
                        }}
                      />
                      <div className="flex justify-end" style={{ marginTop: 6 }}>
                        <button
                          onClick={() => setInlineNoteItemId(null)}
                          style={{
                            fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', padding: '4px 8px',
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
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
      {CustModal}
      {CartSheet}

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
        <div style={{ position: 'fixed', bottom: 70, left: 16, right: 16, zIndex: 40 }}>
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
