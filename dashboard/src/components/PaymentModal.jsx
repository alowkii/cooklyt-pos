import { useState, useMemo } from 'react';
import {
  CreditCard, Banknote, Smartphone, CheckCircle, Tag, X,
  Printer, Split, Plus, Minus, ArrowLeft,
} from 'lucide-react';
import Modal from './Modal';
import { useBill, useApplyDiscount, useProcessPayment, useProcessSplitPayment } from '../hooks/usePayments';
import { useCurrency } from '../context/CurrencyContext';
import api from '../api/client';
import { printReceipt } from '../utils/printReceipt';

const METHODS = [
  { id: 'cash',   label: 'Cash',   Icon: Banknote   },
  { id: 'card',   label: 'Card',   Icon: CreditCard },
  { id: 'mobile', label: 'UPI',    Icon: Smartphone },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function BillRow({ label, value, format, bold, highlight }) {
  return (
    <div className={`flex justify-between text-sm ${
      bold      ? 'font-semibold text-slate-800' :
      highlight ? 'text-emerald-600' :
                  'text-slate-600'
    }`}>
      <span>{label}</span>
      <span>{format(value)}</span>
    </div>
  );
}

function MethodPicker({ value, onChange, exclude = [] }) {
  return (
    <div className="flex gap-1.5">
      {METHODS.filter((m) => !exclude.includes(m.id)).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-xs font-medium transition-colors
            ${value === id
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

function DiscountSection({ orderId, bill, format }) {
  const applyDiscount = useApplyDiscount(orderId);
  const [open,  setOpen]  = useState(false);
  const [type,  setType]  = useState('percent');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const hasDiscount = bill?.discountAmount > 0;

  async function handleApply() {
    setError('');
    const v = parseFloat(value);
    if (!value || isNaN(v) || v <= 0) { setError('Enter a valid amount'); return; }
    try {
      await applyDiscount.mutateAsync({ discountType: type, discountValue: v });
      setOpen(false); setValue('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply discount');
    }
  }

  async function handleRemove() {
    try { await applyDiscount.mutateAsync({ discountType: null, discountValue: 0 }); }
    catch (err) { setError(err.response?.data?.error || 'Failed to remove discount'); }
  }

  if (hasDiscount) {
    const label = bill.discountType === 'percent'
      ? `Discount (${bill.discountValue}%)`
      : 'Discount (flat)';
    return (
      <div className="flex justify-between items-center text-sm text-emerald-600">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span>−{format(bill.discountAmount)}</span>
          <button type="button" onClick={handleRemove} disabled={applyDiscount.isPending}
            className="text-slate-400 hover:text-red-500 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
          <Tag size={12} /> Add discount
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            {['percent', 'flat'].map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 rounded-lg border py-1 text-xs font-medium transition-colors ${
                  type === t
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {t === 'percent' ? '% Percent' : '# Flat'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" min="0" max={type === 'percent' ? 100 : undefined} step="0.01"
              value={value} onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percent' ? '10' : '5.00'}
              className="input flex-1 text-sm" autoFocus />
            <button type="button" onClick={handleApply} disabled={applyDiscount.isPending}
              className="btn-primary text-xs px-3">
              {applyDiscount.isPending ? '…' : 'Apply'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setValue(''); setError(''); }}
              className="btn-secondary text-xs px-3">
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Bill breakdown card (shared between full & split modes) ───────────────────

function BillBreakdown({ bill, billLoading, orderId, format, showDiscount = true }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1.5">
      {billLoading ? (
        <p className="text-center text-sm text-slate-400 py-2">Calculating bill…</p>
      ) : bill ? (
        <>
          {bill.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-slate-600">
              <span>{item.name} <span className="text-slate-400">× {item.quantity}</span></span>
              <span>{format(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-1.5 mt-1.5 space-y-1.5">
            <BillRow label="Subtotal" value={bill.subtotal} format={format} />
            {showDiscount && (
              <DiscountSection orderId={orderId} bill={bill} format={format} />
            )}
            {bill.taxRate > 0 && (
              <BillRow label={`Tax (${+(bill.taxRate * 100).toFixed(4)}%)`}
                value={bill.taxAmount} format={format} />
            )}
            {bill.serviceChargeRate > 0 && (
              <BillRow label={`Service charge (${+(bill.serviceChargeRate * 100).toFixed(4)}%)`}
                value={bill.serviceChargeAmount} format={format} />
            )}
            {bill.packagingFee > 0 && (
              <BillRow label="Packaging fee" value={bill.packagingFee} format={format} />
            )}
          </div>
          <div className="border-t border-slate-300 pt-2 mt-1">
            <BillRow label="Total" value={bill.total} format={format} bold />
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Helper: compute sub-total from items + full bill rates ────────────────────

function computeSubTotal(items, bill) {
  if (!items.length || !bill) return 0;
  const sub      = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalSub = bill.subtotal || 0;
  let discAmt    = 0;
  if (bill.discountType === 'percent') {
    discAmt = sub * (bill.discountValue / 100);
  } else if (bill.discountType === 'flat' && totalSub > 0) {
    discAmt = bill.discountAmount * (sub / totalSub);
  }
  const discounted   = sub - discAmt;
  const taxAndSc     = discounted * (bill.taxRate + bill.serviceChargeRate);
  const packagingFee = totalSub > 0 ? (bill.packagingFee || 0) * (sub / totalSub) : 0;
  return parseFloat((discounted + taxAndSc + packagingFee).toFixed(2));
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function PaymentModal({ order, tableNumber, onClose }) {
  const processPayment      = useProcessPayment();
  const processSplitPayment = useProcessSplitPayment();
  const { format, currency } = useCurrency();
  const { data: bill, isLoading: billLoading } = useBill(order.id);

  // Mode: 'full' = single bill | 'split' = split by items
  const [mode, setMode] = useState('full');

  // ── Full mode state
  const [method,         setMethod]         = useState('cash');
  const [splitTender,    setSplitTender]    = useState(false);
  const [tender1Amount,  setTender1Amount]  = useState('');
  const [method2,        setMethod2]        = useState('mobile');
  const [amountTendered, setAmountTendered] = useState('');

  // ── Split-by-items mode state
  // quantities: { [itemId]: number } — how many go to Bill 1 (default = item.quantity = all)
  const [quantities,   setQuantities]   = useState({});
  const [splitMethods, setSplitMethods] = useState({ 1: 'cash', 2: 'mobile' });

  // ── Shared
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');
  const [printing,   setPrinting]   = useState(false);
  const [printError, setPrintError] = useState('');

  // Computed: items per bill with partial quantities
  const bill1Items = useMemo(
    () => (bill?.items ?? [])
      .map((i) => ({ ...i, quantity: quantities[i.id] ?? i.quantity }))
      .filter((i) => i.quantity > 0),
    [bill, quantities],
  );
  const bill2Items = useMemo(
    () => (bill?.items ?? [])
      .map((i) => ({ ...i, quantity: i.quantity - (quantities[i.id] ?? i.quantity) }))
      .filter((i) => i.quantity > 0),
    [bill, quantities],
  );
  const bill1Total = useMemo(() => computeSubTotal(bill1Items, bill), [bill1Items, bill]);
  const bill2Total = useMemo(() => computeSubTotal(bill2Items, bill), [bill2Items, bill]);

  // Computed: split-tender second amount (display currency)
  const displayTotal  = bill ? parseFloat((bill.total * currency.rate).toFixed(currency.decimals ?? 2)) : 0;
  const tender1Num    = parseFloat(tender1Amount) || 0;
  const tender2Amount = parseFloat((displayTotal - tender1Num).toFixed(currency.decimals ?? 2));

  // ── Receipt printer
  async function handlePrintReceipt() {
    setPrinting(true);
    setPrintError('');
    try {
      const { data } = await api.get(`/payments/${order.id}/receipt`);
      printReceipt(data, currency);
    } catch {
      setPrintError('Could not load receipt. Try again.');
    } finally {
      setPrinting(false);
    }
  }

  // ── Full-bill submit (single or split-tender)
  async function handleFullSubmit(e) {
    e.preventDefault();
    setError('');

    let payload = { orderId: order.id };

    if (splitTender) {
      if (!tender1Amount || tender1Num <= 0) {
        setError('Enter an amount for the first payment method'); return;
      }
      if (tender2Amount <= 0) {
        setError(`First amount must be less than the total (${format(bill.total)})`); return;
      }
      payload.tenders = [
        { method,   amount: parseFloat((tender1Num / currency.rate).toFixed(4)) },
        { method: method2, amount: parseFloat((tender2Amount / currency.rate).toFixed(4)) },
      ];
    } else {
      payload.method = method;
      if (method === 'cash' && amountTendered) {
        payload.amountTendered = parseFloat(amountTendered) / currency.rate;
      }
    }

    try {
      const data = await processPayment.mutateAsync(payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Payment failed');
    }
  }

  // ── Split-by-items submit
  async function handleSplitSubmit() {
    setError('');

    if (bill2Items.length === 0) {
      setError('Move at least one item (or partial quantity) to Bill 2'); return;
    }
    if (bill1Total <= 0 || bill2Total <= 0) {
      setError('Both bills must have a positive total'); return;
    }

    const splits = [
      {
        items: bill1Items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
        tenders: [{ method: splitMethods[1], amount: parseFloat(bill1Total.toFixed(4)) }],
      },
      {
        items: bill2Items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
        tenders: [{ method: splitMethods[2], amount: parseFloat(bill2Total.toFixed(4)) }],
      },
    ];

    try {
      const data = await processSplitPayment.mutateAsync({ orderId: order.id, splits });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Payment failed');
    }
  }

  const label       = tableNumber ? `Table ${tableNumber}` : order.customer_ref || 'Order';
  const isPending   = processPayment.isPending || processSplitPayment.isPending;

  // ── Success screen
  if (result) {
    const isSplit       = !!result.splits;
    const totalCharged  = isSplit ? result.totalCharged : result.charged;
    return (
      <Modal title="Payment Complete" onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={40} className="text-emerald-500" />
          <p className="text-lg font-semibold text-slate-800">
            {format(totalCharged)} collected
          </p>

          {isSplit ? (
            <div className="w-full space-y-1">
              {result.splits.map((s, i) => (
                <p key={i} className="text-sm text-slate-500 capitalize">
                  Bill {i + 1}: {format(s.charged)} · {s.method.replace('+', ' + ')}
                </p>
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 capitalize">
                {label} · {result.method.replace('+', ' + ')}
              </p>
              {result.change > 0 && (
                <div className="w-full rounded-lg bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-700">
                    Change due: {format(result.change)}
                  </p>
                </div>
              )}
            </>
          )}

          {printError && <p className="text-xs text-red-500">{printError}</p>}
          <div className="flex gap-2 mt-2 w-full">
            <button onClick={handlePrintReceipt} disabled={printing}
              className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <Printer size={15} />
              {printing ? 'Opening…' : 'Print Receipt'}
            </button>
            <button onClick={onClose} className="btn-primary flex-1">Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Main form
  return (
    <Modal title={`Collect Payment — ${label}`} onClose={onClose}>
      <div className="space-y-5">

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
          <button
            type="button"
            onClick={() => { setMode('full'); setError(''); }}
            className={`flex-1 py-2 transition-colors ${
              mode === 'full'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Full Bill
          </button>
          <button
            type="button"
            onClick={() => { setMode('split'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
              mode === 'split'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Split size={14} />
            Split by Items
          </button>
        </div>

        {/* ══════════ FULL BILL MODE ══════════ */}
        {mode === 'full' && (
          <form onSubmit={handleFullSubmit} className="space-y-5">
            <BillBreakdown
              bill={bill} billLoading={billLoading}
              orderId={order.id} format={format}
            />

            {/* Payment method */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Payment Method
                </p>
                {!splitTender && (
                  <button
                    type="button"
                    onClick={() => { setSplitTender(true); setTender1Amount(''); }}
                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    <Plus size={12} />
                    Split payment
                  </button>
                )}
              </div>

              {!splitTender ? (
                <MethodPicker value={method} onChange={setMethod} />
              ) : (
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Split Payment</p>
                    <button type="button"
                      onClick={() => { setSplitTender(false); setTender1Amount(''); }}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-0.5">
                      <X size={12} /> Remove
                    </button>
                  </div>

                  {/* Tender 1 */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-400">First method</p>
                    <MethodPicker value={method} onChange={setMethod} exclude={[method2]} />
                    <input
                      type="number" min="0" step="0.01"
                      value={tender1Amount}
                      onChange={(e) => setTender1Amount(e.target.value)}
                      placeholder={`Amount (${currency.code})`}
                      className="input text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Tender 2 — auto amount */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-400">Second method</p>
                    <MethodPicker value={method2} onChange={setMethod2} exclude={[method]} />
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                      <span className="flex-1">Remaining</span>
                      <span className="font-semibold text-slate-700">
                        {tender1Amount && tender2Amount > 0
                          ? format(tender2Amount / currency.rate)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Amount tendered (cash only, single method) */}
            {!splitTender && method === 'cash' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Amount Tendered ({currency.code})
                  <span className="ml-1 font-normal text-slate-400">(optional — for change)</span>
                </label>
                <input
                  type="number" min="0" step="0.01"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="e.g. 500"
                  className="input"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
                <ArrowLeft size={14} /> Back to Order
              </button>
              <button type="submit" disabled={isPending || billLoading} className="btn-primary flex-1">
                {isPending ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}

        {/* ══════════ SPLIT BY ITEMS MODE ══════════ */}
        {mode === 'split' && (
          <div className="space-y-4">
            {billLoading ? (
              <p className="text-center text-sm text-slate-400 py-4">Loading items…</p>
            ) : !bill?.items?.length ? (
              <p className="text-center text-sm text-slate-400 py-4">No items found</p>
            ) : (
              <>
                {/* Item assignment table */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Assign Items to Each Bill
                  </p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {bill.items.map((item) => {
                      const qty1 = quantities[item.id] ?? item.quantity;
                      const qty2 = item.quantity - qty1;
                      const setQty1 = (n) => {
                        const clamped = Math.max(0, Math.min(item.quantity, n));
                        setQuantities((q) => ({ ...q, [item.id]: clamped }));
                      };
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                            <p className="text-xs text-slate-400">
                              {format(item.price)} × {item.quantity}
                            </p>
                          </div>
                          {item.quantity === 1 ? (
                            /* Single unit — toggle between Bill 1 and Bill 2 */
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => setQty1(1)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border-2 transition-colors ${
                                  qty1 === 1 ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}>B1</button>
                              <button type="button" onClick={() => setQty1(0)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border-2 transition-colors ${
                                  qty1 === 0 ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}>B2</button>
                            </div>
                          ) : (
                            /* Multiple units — stepper for Bill 1, Bill 2 auto-fills */
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-indigo-500 font-medium w-5 text-right">B1</span>
                                <button type="button" onClick={() => setQty1(qty1 - 1)} disabled={qty1 <= 0}
                                  className="rounded border border-slate-200 p-0.5 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 transition-colors">
                                  <Minus size={11} />
                                </button>
                                <span className="w-5 text-center text-sm font-semibold text-slate-800">{qty1}</span>
                                <button type="button" onClick={() => setQty1(qty1 + 1)} disabled={qty1 >= item.quantity}
                                  className="rounded border border-slate-200 p-0.5 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 transition-colors">
                                  <Plus size={11} />
                                </button>
                              </div>
                              <div className="text-xs text-slate-400">
                                <span className="text-violet-500 font-medium">B2</span> {qty2}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bill totals + method selectors */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Bill 1 */}
                  <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-indigo-600">Bill 1</p>
                      <p className="text-sm font-bold text-slate-800">{format(bill1Total)}</p>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {bill1Items.length === 0
                        ? 'No items'
                        : bill1Items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </div>
                    <MethodPicker
                      value={splitMethods[1]}
                      onChange={(m) => setSplitMethods((s) => ({ ...s, 1: m }))}
                    />
                  </div>

                  {/* Bill 2 */}
                  <div className="rounded-xl border-2 border-violet-200 bg-violet-50/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-violet-600">Bill 2</p>
                      <p className="text-sm font-bold text-slate-800">{format(bill2Total)}</p>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {bill2Items.length === 0
                        ? 'No items'
                        : bill2Items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </div>
                    <MethodPicker
                      value={splitMethods[2]}
                      onChange={(m) => setSplitMethods((s) => ({ ...s, 2: m }))}
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
                <ArrowLeft size={14} /> Back to Order
              </button>
              <button
                type="button"
                onClick={handleSplitSubmit}
                disabled={isPending || billLoading || bill2Items.length === 0 || bill1Items.length === 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isPending ? 'Processing…' : 'Confirm Split'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
