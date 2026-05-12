import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, Plus, Minus, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';

export default function OrderMenu() {
  const { tableId } = useParams();
  const [phase, setPhase] = useState('loading'); // loading | error | menu | cart | submitting | done
  const [tableInfo, setTableInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState({}); // { [itemId]: quantity }
  const [openCats, setOpenCats] = useState(new Set());
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');

  const fmt = (v) => {
    if (!tableInfo?.currency) return String(v);
    const { symbol, rate, decimals } = tableInfo.currency;
    return `${symbol}${(parseFloat(v) * rate).toFixed(decimals)}`;
  };

  useEffect(() => {
    async function load() {
      try {
        const tr = await fetch(`/api/public/table/${tableId}`);
        if (!tr.ok) throw new Error('Table not found. Please ask staff for help.');
        const table = await tr.json();
        setTableInfo(table);

        const mr = await fetch(`/api/public/menu/${table.restaurant_id}`);
        if (!mr.ok) throw new Error('Failed to load menu.');
        const menu = await mr.json();
        setItems(menu);

        const cats = [...new Set(menu.map((i) => i.category).filter(Boolean))];
        if (cats.length > 0) setOpenCats(new Set([cats[0]]));

        setPhase('menu');
      } catch (e) {
        setError(e.message || 'Could not load menu. Please ask staff for help.');
        setPhase('error');
      }
    }
    load();
  }, [tableId]);

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const cartItems = items.filter((i) => (cart[i.id] || 0) > 0);
  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * cart[i.id], 0);

  function changeQty(id, delta) {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  function toggleCat(cat) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  async function placeOrder() {
    setPhase('submitting');
    setError('');
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
      const json = await res.json();
      setOrderId((json.orderId || '').slice(-6).toUpperCase());
      setPhase('done');
    } catch (e) {
      setError(e.message);
      setPhase('cart');
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <div className="mb-3 text-4xl">🍽️</div>
          <p className="text-sm">Loading menu…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // ── Order confirmed ──────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <CheckCircle size={64} className="mb-5 text-emerald-500" />
        <h2 className="mb-1 text-2xl font-bold text-slate-800">Order placed!</h2>
        {orderId && <p className="mb-2 text-sm text-slate-500">Order #{orderId}</p>}
        <p className="mb-8 text-center text-sm text-slate-500">
          Your order has been sent to the kitchen. Thank you!
        </p>
        <button
          onClick={() => { setCart({}); setPhase('menu'); }}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow"
        >
          Order more
        </button>
      </div>
    );
  }

  // ── Cart review ──────────────────────────────────────────────────────────────
  if (phase === 'cart' || phase === 'submitting') {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <div className="bg-white px-4 pb-3 pt-4 shadow-sm">
          <button
            onClick={() => setPhase('menu')}
            className="mb-2 text-sm font-medium text-indigo-600"
          >
            ← Back to menu
          </button>
          <h2 className="text-lg font-bold text-slate-800">Your Order</h2>
          <p className="text-xs text-slate-500">
            {tableInfo?.restaurant_name} · Table {tableInfo?.table_number}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-400">{fmt(item.price)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeQty(item.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 active:bg-slate-100"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center text-sm font-bold">{cart[item.id]}</span>
                <button
                  onClick={() => changeQty(item.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white active:bg-indigo-700"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="w-16 text-right text-sm font-semibold text-slate-800">
                {fmt(item.price * cart[item.id])}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t bg-white p-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold text-slate-700">Subtotal</span>
            <span className="font-bold text-slate-900">{fmt(cartTotal)}</span>
          </div>
          <p className="mb-4 text-xs text-slate-400">
            Taxes and service charges will be applied by staff at checkout.
          </p>
          <button
            onClick={placeOrder}
            disabled={phase === 'submitting' || cartCount === 0}
            className="w-full rounded-xl bg-indigo-600 py-4 text-sm font-bold text-white shadow-md active:bg-indigo-700 disabled:opacity-60"
          >
            {phase === 'submitting' ? 'Placing order…' : `Place Order · ${fmt(cartTotal)}`}
          </button>
        </div>
      </div>
    );
  }

  // ── Menu ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <div className="bg-indigo-700 px-4 py-5 text-white">
        <h1 className="text-lg font-bold leading-tight">{tableInfo?.restaurant_name}</h1>
        <p className="text-sm text-indigo-200">Table {tableInfo?.table_number}</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          const isOpen = openCats.has(cat);
          return (
            <div key={cat} className="border-b border-slate-200 bg-white">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => toggleCat(cat)}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {cat}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{catItems.length} items</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 space-y-2">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{item.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-indigo-600">{fmt(item.price)}</p>
                      </div>
                      {(cart[item.id] || 0) > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => changeQty(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 active:bg-slate-100"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-slate-800">
                            {cart[item.id]}
                          </span>
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
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm active:bg-indigo-700"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-400">
            Menu is empty. Please ask staff for assistance.
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4">
          <button
            onClick={() => { setError(''); setPhase('cart'); }}
            className="flex w-full items-center gap-3 rounded-2xl bg-indigo-600 px-5 py-4 text-white shadow-xl active:bg-indigo-700"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {cartCount}
            </div>
            <span className="flex-1 text-left text-sm font-semibold">View Order</span>
            <span className="text-sm font-bold">{fmt(cartTotal)}</span>
            <ShoppingCart size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
