import { useState } from 'react';
import { CreditCard, Banknote, Smartphone, CheckCircle, Tag, X, Printer } from 'lucide-react';
import Modal from './Modal';
import { useBill, useApplyDiscount, useProcessPayment } from '../hooks/usePayments';
import { useCurrency } from '../context/CurrencyContext';
import api from '../api/client';
import { printReceipt } from '../utils/printReceipt';

const METHODS = [
  { id: 'cash',   label: 'Cash',   Icon: Banknote   },
  { id: 'card',   label: 'Card',   Icon: CreditCard },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
];

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
      setOpen(false);
      setValue('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply discount');
    }
  }

  async function handleRemove() {
    setError('');
    try {
      await applyDiscount.mutateAsync({ discountType: null, discountValue: 0 });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove discount');
    }
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
          <button
            type="button"
            onClick={handleRemove}
            disabled={applyDiscount.isPending}
            className="text-slate-400 hover:text-red-500 transition-colors"
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          <Tag size={12} /> Add discount
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            {['percent', 'flat'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border py-1 text-xs font-medium transition-colors ${
                  type === t
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {t === 'percent' ? '% Percent' : '# Flat'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max={type === 'percent' ? 100 : undefined}
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percent' ? '10' : '5.00'}
              className="input flex-1 text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={handleApply}
              disabled={applyDiscount.isPending}
              className="btn-primary text-xs px-3"
            >
              {applyDiscount.isPending ? '…' : 'Apply'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setValue(''); setError(''); }}
              className="btn-secondary text-xs px-3"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function PaymentModal({ order, tableNumber, onClose }) {
  const processPayment = useProcessPayment();
  const { format, currency } = useCurrency();
  const { data: bill, isLoading: billLoading } = useBill(order.id);

  const [method,         setMethod]         = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState('');
  const [printing,      setPrinting]      = useState(false);
  const [printError,    setPrintError]    = useState('');

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { orderId: order.id, method };
    if (method === 'cash' && amountTendered) {
      payload.amountTendered = parseFloat(amountTendered) / currency.rate;
    }
    try {
      const data = await processPayment.mutateAsync(payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Payment failed');
    }
  }

  const label = tableNumber ? `Table ${tableNumber}` : order.customer_ref || 'Order';

  // ── Success state ──
  if (result) {
    return (
      <Modal title="Payment Complete" onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={40} className="text-emerald-500" />
          <p className="text-lg font-semibold text-slate-800">
            {format(result.charged)} collected
          </p>
          <p className="text-sm text-slate-500">{label} · {result.method}</p>
          {result.change > 0 && (
            <div className="w-full rounded-lg bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-700">
                Change due: {format(result.change)}
              </p>
            </div>
          )}
          {printError && (
            <p className="text-xs text-red-500">{printError}</p>
          )}
          <div className="flex gap-2 mt-2 w-full">
            <button
              onClick={handlePrintReceipt}
              disabled={printing}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <Printer size={15} />
              {printing ? 'Opening…' : 'Print Receipt'}
            </button>
            <button onClick={onClose} className="btn-primary flex-1">Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Collect Payment — ${label}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Bill breakdown */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1.5">
          {billLoading ? (
            <p className="text-center text-sm text-slate-400 py-2">Calculating bill…</p>
          ) : bill ? (
            <>
              {bill.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-slate-600">
                  <span>
                    {item.name}{' '}
                    <span className="text-slate-400">× {item.quantity}</span>
                  </span>
                  <span>{format(item.price * item.quantity)}</span>
                </div>
              ))}

              <div className="border-t border-slate-200 pt-1.5 mt-1.5 space-y-1.5">
                <BillRow label="Subtotal" value={bill.subtotal} format={format} />

                <DiscountSection orderId={order.id} bill={bill} format={format} />

                {bill.taxRate > 0 && (
                  <BillRow
                    label={`Tax (${+(bill.taxRate * 100).toFixed(4)}%)`}
                    value={bill.taxAmount}
                    format={format}
                  />
                )}
                {bill.serviceChargeRate > 0 && (
                  <BillRow
                    label={`Service charge (${+(bill.serviceChargeRate * 100).toFixed(4)}%)`}
                    value={bill.serviceChargeAmount}
                    format={format}
                  />
                )}
              </div>

              <div className="border-t border-slate-300 pt-2 mt-1">
                <BillRow label="Total" value={bill.total} format={format} bold />
              </div>
            </>
          ) : null}
        </div>

        {/* Method */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Payment Method
          </p>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ id, label: lbl, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-medium transition-colors
                  ${method === id
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
              >
                <Icon size={18} />
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Amount tendered — cash only */}
        {method === 'cash' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Amount Tendered ({currency.code})
              <span className="ml-1 font-normal text-slate-400">(optional — for change)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
              placeholder="e.g. 50.00"
              className="input"
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            type="submit"
            disabled={processPayment.isPending || billLoading}
            className="btn-primary flex-1"
          >
            {processPayment.isPending ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
