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

function BillRow({ label, value, format, bold, highlight }) {
  return (
    <div className="flex justify-between" style={{
      fontSize: 13,
      fontWeight: bold ? 600 : 400,
      color: highlight ? 'var(--ok)' : bold ? 'var(--ink)' : 'var(--mute)',
    }}>
      <span>{label}</span>
      <span className="mono num">{format(value)}</span>
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
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[6px] py-2 transition-colors"
          style={{
            fontSize: 12, fontWeight: 500,
            border: value === id ? '1.5px solid var(--ink)' : '1px solid var(--line-2)',
            background: value === id ? 'var(--paper-2)' : 'var(--paper)',
            color: value === id ? 'var(--ink)' : 'var(--mute)',
          }}
        >
          <Icon size={13} />
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
    const label = bill.discountType === 'percent' ? `Discount (${bill.discountValue}%)` : 'Discount (flat)';
    return (
      <div className="flex justify-between items-center" style={{ fontSize: 13, color: 'var(--ok)' }}>
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="mono num">−{format(bill.discountAmount)}</span>
          <button type="button" onClick={handleRemove} disabled={applyDiscount.isPending}
            className="rounded-md p-0.5 transition-colors"
            style={{ color: 'var(--mute)', border: 0, background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--bad)'; e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mute)'; e.currentTarget.style.background = 'transparent'; }}
          >
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
          className="flex items-center gap-1"
          style={{ fontSize: 12, color: 'var(--mute)', border: 0, background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
        >
          <Tag size={12} /> Add discount
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            {['percent', 'flat'].map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className="flex-1 rounded-[6px] py-1 transition-colors"
                style={{
                  fontSize: 12,
                  border: type === t ? '1.5px solid var(--ink)' : '1px solid var(--line-2)',
                  background: type === t ? 'var(--paper-2)' : 'transparent',
                  color: type === t ? 'var(--ink)' : 'var(--mute)',
                }}>
                {t === 'percent' ? '% Percent' : '# Flat'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" min="0" max={type === 'percent' ? 100 : undefined} step="0.01"
              value={value} onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percent' ? '10' : '5.00'}
              className="input flex-1" autoFocus />
            <button type="button" onClick={handleApply} disabled={applyDiscount.isPending}
              className="btn-primary" style={{ padding: '0 12px' }}>
              {applyDiscount.isPending ? '…' : 'Apply'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setValue(''); setError(''); }}
              className="btn-secondary" style={{ padding: '0 12px' }}>
              Cancel
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

function BillBreakdown({ bill, billLoading, orderId, format, showDiscount = true, waiveServiceCharge = false, onWaiveChange }) {
  return (
    <div className="rounded-[6px] p-4 space-y-1.5" style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      {billLoading ? (
        <p className="text-center py-2" style={{ fontSize: 12.5, color: 'var(--mute)' }}>Calculating bill…</p>
      ) : bill ? (
        <>
          {bill.items.map((item) => (
            <div key={item.id} className="flex justify-between" style={{ fontSize: 13, color: 'var(--ink)' }}>
              <span>{item.name} <span style={{ color: 'var(--mute)' }}>× {item.quantity}</span></span>
              <span className="mono num">{format(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="pt-1.5 mt-1 space-y-1.5" style={{ borderTop: '1px solid var(--line)' }}>
            <BillRow label="Subtotal" value={bill.subtotal} format={format} />
            {showDiscount && <DiscountSection orderId={orderId} bill={bill} format={format} />}
            {bill.taxRate > 0 && (
              <BillRow label={`Tax (${+(bill.taxRate * 100).toFixed(4)}%)`} value={bill.taxAmount} format={format} />
            )}
            {(bill.serviceChargeRate > 0 || waiveServiceCharge) && (
              waiveServiceCharge ? (
                <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--ok)' }}>
                  <span>Service charge waived</span>
                  {onWaiveChange && (
                    <button type="button" onClick={() => onWaiveChange(false)}
                      className="rounded-md p-0.5 transition-colors"
                      style={{ color: 'var(--mute)', border: 0, background: 'transparent', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.background = 'var(--hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mute)'; e.currentTarget.style.background = 'transparent'; }}
                      title="Restore service charge">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--mute)' }}>
                  <span>Service charge ({+(bill.serviceChargeRate * 100).toFixed(4)}%)</span>
                  <div className="flex items-center gap-2">
                    <span className="mono num">{format(bill.serviceChargeAmount)}</span>
                    {onWaiveChange && (
                      <button type="button" onClick={() => onWaiveChange(true)}
                        className="rounded-md p-0.5 transition-colors"
                        style={{ color: 'var(--mute)', border: 0, background: 'transparent', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--bad)'; e.currentTarget.style.background = 'var(--hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mute)'; e.currentTarget.style.background = 'transparent'; }}
                        title="Waive service charge">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
            {bill.packagingFee > 0 && (
              <BillRow label="Packaging fee" value={bill.packagingFee} format={format} />
            )}
          </div>
          <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--line-2)' }}>
            <BillRow label="Total" value={bill.total} format={format} bold />
          </div>
        </>
      ) : null}
    </div>
  );
}

function computeSubTotal(items, bill) {
  if (!items.length || !bill) return 0;
  const sub      = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalSub = bill.subtotal || 0;
  let discAmt    = 0;
  if (bill.discountType === 'percent') { discAmt = sub * (bill.discountValue / 100); }
  else if (bill.discountType === 'flat' && totalSub > 0) { discAmt = bill.discountAmount * (sub / totalSub); }
  const discounted   = sub - discAmt;
  const taxAndSc     = discounted * (bill.taxRate + bill.serviceChargeRate);
  const packagingFee = totalSub > 0 ? (bill.packagingFee || 0) * (sub / totalSub) : 0;
  return parseFloat((discounted + taxAndSc + packagingFee).toFixed(2));
}

export default function PaymentModal({ order, tableNumber, onClose }) {
  const processPayment      = useProcessPayment();
  const processSplitPayment = useProcessSplitPayment();
  const { format, currency } = useCurrency();

  const [mode, setMode] = useState('full');
  const [method,            setMethod]            = useState('cash');
  const [splitTender,       setSplitTender]       = useState(false);
  const [tender1Amount,     setTender1Amount]     = useState('');
  const [method2,           setMethod2]           = useState('mobile');
  const [amountTendered,    setAmountTendered]    = useState('');
  const [quantities,        setQuantities]        = useState({});
  const [splitMethods,      setSplitMethods]      = useState({ 1: 'cash', 2: 'mobile' });
  const [waiveServiceCharge, setWaiveServiceCharge] = useState(false);

  const { data: bill, isLoading: billLoading } = useBill(order.id, { waiveServiceCharge });
  const [result,            setResult]            = useState(null);
  const [error,             setError]             = useState('');
  const [printing,          setPrinting]          = useState(false);
  const [printError,        setPrintError]        = useState('');

  const bill1Items = useMemo(
    () => (bill?.items ?? []).map((i) => ({ ...i, quantity: quantities[i.id] ?? i.quantity })).filter((i) => i.quantity > 0),
    [bill, quantities],
  );
  const bill2Items = useMemo(
    () => (bill?.items ?? []).map((i) => ({ ...i, quantity: i.quantity - (quantities[i.id] ?? i.quantity) })).filter((i) => i.quantity > 0),
    [bill, quantities],
  );
  const bill1Total = useMemo(() => computeSubTotal(bill1Items, bill), [bill1Items, bill]);
  const bill2Total = useMemo(() => computeSubTotal(bill2Items, bill), [bill2Items, bill]);

  const displayTotal  = bill ? parseFloat((bill.total * currency.rate).toFixed(currency.decimals ?? 2)) : 0;
  const tender1Num    = parseFloat(tender1Amount) || 0;
  const tender2Amount = parseFloat((displayTotal - tender1Num).toFixed(currency.decimals ?? 2));

  async function handlePrintReceipt() {
    const win = window.open('', '_blank', 'width=360,height=700,toolbar=no,menubar=no,scrollbars=yes');
    if (!win) { alert('Please allow pop-ups for this site to print receipts.'); return; }
    setPrinting(true); setPrintError('');
    try {
      const { data } = await api.get(`/payments/${order.id}/receipt`);
      printReceipt(data, currency, win);
    } catch { win.close(); setPrintError('Could not load receipt. Try again.'); }
    finally { setPrinting(false); }
  }

  async function handleFullSubmit(e) {
    e.preventDefault(); setError('');
    let payload = { orderId: order.id };
    if (splitTender) {
      if (!tender1Amount || tender1Num <= 0) { setError('Enter an amount for the first payment method'); return; }
      if (tender2Amount <= 0) { setError(`First amount must be less than the total (${format(bill.total)})`); return; }
      payload.tenders = [
        { method, amount: parseFloat((tender1Num / currency.rate).toFixed(4)) },
        { method: method2, amount: parseFloat((tender2Amount / currency.rate).toFixed(4)) },
      ];
    } else {
      payload.method = method;
      if (method === 'cash' && amountTendered) { payload.amountTendered = parseFloat(amountTendered) / currency.rate; }
    }
    if (waiveServiceCharge) payload.waiveServiceCharge = true;
    try {
      const data = await processPayment.mutateAsync(payload);
      setResult(data);
    } catch (err) { setError(err.response?.data?.error || err.message || 'Payment failed'); }
  }

  async function handleSplitSubmit() {
    setError('');
    if (bill2Items.length === 0) { setError('Move at least one item to Bill 2'); return; }
    if (bill1Total <= 0 || bill2Total <= 0) { setError('Both bills must have a positive total'); return; }
    const splits = [
      { items: bill1Items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })), tenders: [{ method: splitMethods[1], amount: parseFloat(bill1Total.toFixed(4)) }] },
      { items: bill2Items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })), tenders: [{ method: splitMethods[2], amount: parseFloat(bill2Total.toFixed(4)) }] },
    ];
    try {
      const data = await processSplitPayment.mutateAsync({ orderId: order.id, splits, waiveServiceCharge });
      setResult(data);
    } catch (err) { setError(err.response?.data?.error || err.message || 'Payment failed'); }
  }

  const label     = tableNumber ? `Table ${tableNumber}` : order.customer_ref || 'Order';
  const isPending = processPayment.isPending || processSplitPayment.isPending;

  if (result) {
    const isSplit      = !!result.splits;
    const totalCharged = isSplit ? result.totalCharged : result.charged;
    return (
      <Modal title="Payment Complete" onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={36} style={{ color: 'var(--ok)' }} />
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {format(totalCharged)} collected
          </p>
          {isSplit ? (
            <div className="w-full space-y-1">
              {result.splits.map((s, i) => (
                <p key={i} style={{ fontSize: 13, color: 'var(--mute)', textTransform: 'capitalize' }}>
                  Bill {i + 1}: {format(s.charged)} · {s.method.replace('+', ' + ')}
                </p>
              ))}
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--mute)', textTransform: 'capitalize' }}>
                {label} · {result.method.replace('+', ' + ')}
              </p>
              {result.change > 0 && (
                <div className="w-full rounded-[6px] px-4 py-3" style={{ background: 'rgba(179,120,31,.08)' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--warn)' }}>
                    Change due: {format(result.change)}
                  </p>
                </div>
              )}
            </>
          )}
          {printError && <p style={{ fontSize: 12, color: 'var(--bad)' }}>{printError}</p>}
          <div className="flex gap-2 mt-2 w-full">
            <button onClick={handlePrintReceipt} disabled={printing}
              className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <Printer size={14} />
              {printing ? 'Opening…' : 'Print Receipt'}
            </button>
            <button onClick={onClose} className="btn-primary flex-1 justify-center">Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Collect Payment — ${label}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="flex rounded-[6px] overflow-hidden" style={{ border: '1px solid var(--line-2)' }}>
          <button type="button" onClick={() => { setMode('full'); setError(''); }}
            className="flex-1 py-2 transition-colors"
            style={{ fontSize: 13, fontWeight: 500, background: mode === 'full' ? 'var(--ink)' : 'transparent', color: mode === 'full' ? 'var(--accent-on)' : 'var(--mute)', border: 0 }}>
            Full Bill
          </button>
          <button type="button" onClick={() => { setMode('split'); setError(''); }}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors"
            style={{ fontSize: 13, fontWeight: 500, background: mode === 'split' ? 'var(--ink)' : 'transparent', color: mode === 'split' ? 'var(--accent-on)' : 'var(--mute)', border: 0 }}>
            <Split size={13} /> Split by Items
          </button>
        </div>

        {/* Full bill mode */}
        {mode === 'full' && (
          <form onSubmit={handleFullSubmit} className="space-y-5">
            <BillBreakdown bill={bill} billLoading={billLoading} orderId={order.id} format={format}
              waiveServiceCharge={waiveServiceCharge} onWaiveChange={setWaiveServiceCharge} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)' }}>
                  Payment Method
                </p>
                {!splitTender && (
                  <button type="button" onClick={() => { setSplitTender(true); setTender1Amount(''); }}
                    className="flex items-center gap-1"
                    style={{ fontSize: 12, color: 'var(--mute)', border: 0, background: 'transparent' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}>
                    <Plus size={12} /> Split payment
                  </button>
                )}
              </div>

              {!splitTender ? (
                <MethodPicker value={method} onChange={setMethod} />
              ) : (
                <div className="space-y-3 rounded-[6px] p-3" style={{ border: '1px solid var(--line-2)', background: 'var(--paper-2)' }}>
                  <div className="flex items-center justify-between">
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)' }}>Split Payment</p>
                    <button type="button" onClick={() => { setSplitTender(false); setTender1Amount(''); }}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors"
                      style={{ fontSize: 12, color: 'var(--mute)', border: 0, background: 'transparent', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--bad)'; e.currentTarget.style.background = 'var(--hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mute)'; e.currentTarget.style.background = 'transparent'; }}>
                      <X size={12} /> Remove
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <p style={{ fontSize: 11.5, color: 'var(--mute)' }}>First method</p>
                    <MethodPicker value={method} onChange={setMethod} exclude={[method2]} />
                    <input type="number" min="0" step="0.01" value={tender1Amount}
                      onChange={(e) => setTender1Amount(e.target.value)}
                      placeholder={`Amount (${currency.code})`}
                      className="input" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <p style={{ fontSize: 11.5, color: 'var(--mute)' }}>Second method</p>
                    <MethodPicker value={method2} onChange={setMethod2} exclude={[method]} />
                    <div className="flex items-center gap-2 rounded-[6px] px-3 py-2" style={{ border: '1px solid var(--line-2)', background: 'var(--paper)' }}>
                      <span className="flex-1" style={{ fontSize: 13, color: 'var(--mute)' }}>Remaining</span>
                      <span className="mono num font-semibold" style={{ fontSize: 13, color: 'var(--ink)' }}>
                        {tender1Amount && tender2Amount > 0 ? format(tender2Amount / currency.rate) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!splitTender && method === 'cash' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--mute)', marginBottom: 4 }}>
                  Amount Tendered ({currency.code})
                  <span style={{ fontWeight: 400, marginLeft: 4, color: 'var(--mute-2)' }}>(optional)</span>
                </label>
                <input type="number" min="0" step="0.01" value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="e.g. 500" className="input" />
              </div>
            )}

            {error && (
              <p className="rounded-[6px] px-3 py-2" style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)' }}>{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
                <ArrowLeft size={13} /> Back
              </button>
              <button type="submit" disabled={isPending || billLoading} className="btn-primary flex-1 justify-center">
                {isPending ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}

        {/* Split by items mode */}
        {mode === 'split' && (
          <div className="space-y-4">
            {billLoading ? (
              <p className="text-center py-4" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading items…</p>
            ) : !bill?.items?.length ? (
              <p className="text-center py-4" style={{ fontSize: 13, color: 'var(--mute)' }}>No items found</p>
            ) : (
              <>
                <div>
                  {(bill.serviceChargeRate > 0 || waiveServiceCharge) && (
                    <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--mute)' }}>
                        Service charge ({waiveServiceCharge ? 'waived' : `${+(bill.serviceChargeRate * 100).toFixed(4)}%`})
                      </span>
                      <button type="button"
                        onClick={() => setWaiveServiceCharge((v) => !v)}
                        style={{
                          fontSize: 11.5, fontWeight: 500, border: 0, background: 'transparent',
                          cursor: 'pointer', padding: 0,
                          color: waiveServiceCharge ? 'var(--ok)' : 'var(--mute)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = waiveServiceCharge ? 'var(--mute)' : 'var(--bad)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = waiveServiceCharge ? 'var(--ok)' : 'var(--mute)')}
                      >
                        {waiveServiceCharge ? 'Restore' : 'Waive'}
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)', marginBottom: 8 }}>
                    Assign Items to Each Bill
                  </p>
                  <div className="rounded-[6px] overflow-hidden" style={{ border: '1px solid var(--line-2)' }}>
                    {bill.items.map((item) => {
                      const qty1 = quantities[item.id] ?? item.quantity;
                      const qty2 = item.quantity - qty1;
                      const setQty1 = (n) => {
                        const clamped = Math.max(0, Math.min(item.quantity, n));
                        setQuantities((q) => ({ ...q, [item.id]: clamped }));
                      };
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium" style={{ fontSize: 13, color: 'var(--ink)' }}>{item.name}</p>
                            <p className="mono num" style={{ fontSize: 11.5, color: 'var(--mute)' }}>{format(item.price)} × {item.quantity}</p>
                          </div>
                          {item.quantity === 1 ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => setQty1(1)}
                                className="rounded-[6px] px-2.5 py-1 font-semibold transition-colors"
                                style={{ fontSize: 11, border: qty1 === 1 ? '1.5px solid var(--ink)' : '1px solid var(--line-2)', background: qty1 === 1 ? 'var(--paper-2)' : 'transparent', color: qty1 === 1 ? 'var(--ink)' : 'var(--mute)' }}>
                                B1
                              </button>
                              <button type="button" onClick={() => setQty1(0)}
                                className="rounded-[6px] px-2.5 py-1 font-semibold transition-colors"
                                style={{ fontSize: 11, border: qty1 === 0 ? '1.5px solid var(--ink)' : '1px solid var(--line-2)', background: qty1 === 0 ? 'var(--paper-2)' : 'transparent', color: qty1 === 0 ? 'var(--ink)' : 'var(--mute)' }}>
                                B2
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1">
                                <span className="font-medium" style={{ fontSize: 11, color: 'var(--mute)', width: 20, textAlign: 'right' }}>B1</span>
                                <button type="button" onClick={() => setQty1(qty1 - 1)} disabled={qty1 <= 0}
                                  className="rounded p-0.5 transition-colors disabled:opacity-30"
                                  style={{ border: '1px solid var(--line-2)', color: 'var(--mute)' }}>
                                  <Minus size={11} />
                                </button>
                                <span className="mono num font-semibold" style={{ width: 20, textAlign: 'center', fontSize: 13, color: 'var(--ink)' }}>{qty1}</span>
                                <button type="button" onClick={() => setQty1(qty1 + 1)} disabled={qty1 >= item.quantity}
                                  className="rounded p-0.5 transition-colors disabled:opacity-30"
                                  style={{ border: '1px solid var(--line-2)', color: 'var(--mute)' }}>
                                  <Plus size={11} />
                                </button>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--mute)' }}>
                                <span style={{ fontWeight: 500 }}>B2</span> {qty2}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Bill 1', items: bill1Items, total: bill1Total, key: 1 },
                    { label: 'Bill 2', items: bill2Items, total: bill2Total, key: 2 },
                  ].map(({ label, items, total, key }) => (
                    <div key={key} className="rounded-[6px] p-3 space-y-2" style={{ border: '1px solid var(--line-2)', background: 'var(--paper-2)' }}>
                      <div className="flex items-center justify-between">
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--mute)' }}>{label}</p>
                        <p className="mono num font-bold" style={{ fontSize: 13, color: 'var(--ink)' }}>{format(total)}</p>
                      </div>
                      <div className="truncate" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
                        {items.length === 0 ? 'No items' : items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </div>
                      <MethodPicker value={splitMethods[key]} onChange={(m) => setSplitMethods((s) => ({ ...s, [key]: m }))} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && (
              <p className="rounded-[6px] px-3 py-2" style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)' }}>{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
                <ArrowLeft size={13} /> Back
              </button>
              <button type="button" onClick={handleSplitSubmit}
                disabled={isPending || billLoading || bill2Items.length === 0 || bill1Items.length === 0}
                className="btn-primary flex-1 justify-center">
                {isPending ? 'Processing…' : 'Confirm Split'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
