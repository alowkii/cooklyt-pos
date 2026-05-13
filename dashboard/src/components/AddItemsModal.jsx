import { useState, useMemo } from 'react';
import { X, Plus, Minus, ShoppingBag, ChevronRight, ChevronDown, Star, CheckCircle } from 'lucide-react';
import { useMenuItems, usePopularMenuItems } from '../hooks/useMenu';
import { useAddItems } from '../hooks/useOrders';
import { useCurrency } from '../context/CurrencyContext';

function MenuRow({ item, qty, onAdd, onRemove, format }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
        <p className="text-xs text-slate-400">{format(item.price)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {qty > 0 && (
          <button onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors">
            <Minus size={14} />
          </button>
        )}
        {qty > 0 && (
          <span className="w-5 text-center text-sm font-semibold text-slate-800">{qty}</span>
        )}
        <button onClick={onAdd}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default function AddItemsModal({ order, orderTitle, onClose }) {
  const { data: menuItems = [] } = useMenuItems();
  const { data: popular  = [] } = usePopularMenuItems();
  const addItems                 = useAddItems();
  const { format }               = useCurrency();

  const [quantities,     setQty]        = useState({});
  const [notes,          setNotes]      = useState({});
  const [error,          setError]      = useState('');
  const [done,           setDone]       = useState(false);
  const [openCategories, setOpenCats]   = useState(new Set());
  const [mobileTab,      setMobileTab]  = useState('menu');

  const grouped = useMemo(() =>
    menuItems
      .filter((m) => m.available)
      .reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {}),
    [menuItems],
  );

  const cartItems = useMemo(
    () => menuItems.filter((m) => (quantities[m.id] ?? 0) > 0),
    [menuItems, quantities],
  );

  const total = useMemo(
    () => cartItems.reduce((s, m) => s + m.price * (quantities[m.id] ?? 0), 0),
    [cartItems, quantities],
  );

  function changeQty(id, delta) {
    setQty((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit() {
    setError('');
    if (cartItems.length === 0) { setError('Add at least one item.'); return; }
    const items = cartItems.map((m) => ({
      menuItemId: m.id,
      quantity:   quantities[m.id],
      notes:      notes[m.id] || undefined,
    }));
    try {
      await addItems.mutateAsync({ orderId: order.id, items });
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to add items');
    }
  }

  const cartCount = cartItems.reduce((s, m) => s + (quantities[m.id] ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full flex-col bg-white shadow-xl
        h-[100dvh] rounded-none
        sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Add Items</h2>
            <p className="text-xs text-slate-400">{orderTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 text-xs font-medium overflow-hidden sm:hidden">
              <button onClick={() => setMobileTab('menu')}
                className={`px-3 py-1.5 transition-colors ${mobileTab === 'menu' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
                Menu
              </button>
              <button onClick={() => setMobileTab('cart')}
                className={`relative px-3 py-1.5 transition-colors ${mobileTab === 'cart' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
                Cart
                {cartCount > 0 && (
                  <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{cartCount}</span>
                )}
              </button>
            </div>
            <button onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <CheckCircle size={40} className="text-emerald-500" />
            <p className="text-base font-semibold text-slate-800">Items sent to kitchen</p>
            <p className="text-sm text-slate-400">Order status reset to Received</p>
            <button onClick={onClose} className="btn-primary mt-2 px-8">Done</button>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Menu */}
              <div className={`flex-1 overflow-y-auto px-4 py-4 sm:px-6 ${mobileTab === 'cart' ? 'hidden sm:block' : ''}`}>
                {Object.keys(grouped).length === 0 ? (
                  <p className="text-sm text-slate-400">No menu items available</p>
                ) : (
                  <>
                    {popular.length > 0 && (
                      <div className="mb-5">
                        <div className="mb-2 flex items-center gap-1.5">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Best Sellers</p>
                        </div>
                        <div className="space-y-1">
                          {popular.map((item) => (
                            <MenuRow key={item.id} item={item} qty={quantities[item.id] ?? 0}
                              onAdd={() => changeQty(item.id, 1)} onRemove={() => changeQty(item.id, -1)} format={format} />
                          ))}
                        </div>
                      </div>
                    )}
                    {Object.entries(grouped).map(([category, items]) => {
                      const isOpen = openCategories.has(category);
                      return (
                        <div key={category} className="mb-2">
                          <button
                            onClick={() => setOpenCats((prev) => {
                              const next = new Set(prev);
                              isOpen ? next.delete(category) : next.add(category);
                              return next;
                            })}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {category} <span className="font-normal normal-case text-slate-400">({items.length})</span>
                            </p>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="mt-0.5 space-y-1">
                              {items.map((item) => (
                                <MenuRow key={item.id} item={item} qty={quantities[item.id] ?? 0}
                                  onAdd={() => changeQty(item.id, 1)} onRemove={() => changeQty(item.id, -1)} format={format} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Cart */}
              <div className={`overflow-y-auto border-slate-100 bg-slate-50 px-4 py-4
                w-full border-t sm:w-64 sm:shrink-0 sm:border-l sm:border-t-0
                ${mobileTab === 'menu' ? 'hidden sm:block' : ''}`}>
                <div className="mb-3 flex items-center gap-2">
                  <ShoppingBag size={14} className="text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    New items ({cartItems.length})
                  </p>
                </div>
                {cartItems.length === 0 ? (
                  <p className="text-xs text-slate-400">No items yet — add from the menu</p>
                ) : (
                  <ul className="space-y-3">
                    {cartItems.map((item) => (
                      <li key={item.id} className="text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-700">
                            <span className="font-medium">{quantities[item.id]}×</span> {item.name}
                          </span>
                          <span className="shrink-0 text-slate-500">{format(item.price * quantities[item.id])}</span>
                        </div>
                        <input type="text" placeholder="Notes…"
                          value={notes[item.id] ?? ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                          className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      </li>
                    ))}
                  </ul>
                )}
                {cartItems.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>Total</span>
                      <span>{format(total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 px-4 py-4 sm:px-6">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <div className="flex items-center justify-between gap-3">
                <button onClick={onClose} className="btn-secondary">Cancel</button>
                <button onClick={handleSubmit} disabled={addItems.isPending || cartItems.length === 0}
                  className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
                  <ChevronRight size={15} />
                  {addItems.isPending ? 'Sending…' : `Send to Kitchen${cartCount > 0 ? ` (${cartCount})` : ''}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
