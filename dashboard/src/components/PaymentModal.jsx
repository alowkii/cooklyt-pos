import { useState } from 'react';
import { CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import { useProcessPayment } from '../hooks/usePayments';
import { useCurrency } from '../context/CurrencyContext';

const METHODS = [
  { id: 'cash',   label: 'Cash',   Icon: Banknote    },
  { id: 'card',   label: 'Card',   Icon: CreditCard  },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone  },
];

export default function PaymentModal({ order, tableNumber, onClose }) {
  const processPayment = useProcessPayment();
  const { format, currency } = useCurrency();

  const [method,         setMethod]         = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [result,         setResult]         = useState(null); // { charged, change }
  const [error,          setError]          = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = { orderId: order.id, method };
    if (method === 'cash' && amountTendered) {
      // Convert from display currency back to USD (what the backend calculates in)
      payload.amountTendered = parseFloat(amountTendered) / currency.rate;
    }

    try {
      const data = await processPayment.mutateAsync(payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Payment failed');
    }
  }

  // ── Success state ──
  if (result) {
    return (
      <Modal title="Payment Complete" onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={40} className="text-emerald-500" />
          <p className="text-lg font-semibold text-slate-800">
            {format(result.charged)} collected
          </p>
          <p className="text-sm text-slate-500">
            Table {tableNumber} · {result.method}
          </p>
          {result.change > 0 && (
            <div className="w-full rounded-lg bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-700">
                Change due: {format(result.change)}
              </p>
            </div>
          )}
          <button onClick={onClose} className="btn-primary mt-2 w-full">
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // ── Payment form ──
  return (
    <Modal title={`Collect Payment — Table ${tableNumber}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Method */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Payment Method
          </p>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ id, label, Icon }) => (
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
                {label}
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
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={processPayment.isPending}
            className="btn-primary flex-1"
          >
            {processPayment.isPending ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
