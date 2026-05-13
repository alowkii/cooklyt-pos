import { useState } from 'react';
import { Check, AlertTriangle, TrendingUp, TrendingDown, Minus as MinusIcon, DollarSign } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useShiftSummary, useShiftHistory, useRecordShiftCount } from '../hooks/useShift';

// Denominations per currency code (values in the local/display currency)
const DENOMS = {
  INR: [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1],
  USD: [100, 50, 20, 10, 5, 2, 1, 0.25, 0.10, 0.05, 0.01],
  EUR: [200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01],
  GBP: [50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01],
  AUD: [100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10, 0.05],
  CAD: [100, 50, 20, 10, 5, 2, 1, 0.25, 0.10, 0.05],
  SGD: [1000, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10, 0.05],
  MYR: [100, 50, 20, 10, 5, 1, 0.50, 0.20, 0.10, 0.05],
  NPR: [1000, 500, 100, 50, 25, 20, 10, 5, 2, 1],
  LKR: [5000, 2000, 1000, 500, 100, 50, 20, 10, 5, 2, 1],
  AED: [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.50, 0.25],
  BDT: [1000, 500, 100, 50, 20, 10, 5, 2, 1],
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ShiftCount() {
  const { code, currency, format } = useCurrency();
  const { data: summary, isLoading: summaryLoading } = useShiftSummary();
  const { data: history = [] } = useShiftHistory();
  const record = useRecordShiftCount();

  const denoms = DENOMS[code] || null;
  // counts: { [denomValue]: countString }
  const [counts,   setCounts]   = useState({});
  const [manualTotal, setManualTotal] = useState('');
  const [notes,    setNotes]    = useState('');
  const [saved,    setSaved]    = useState(false);

  // Expected cash in display currency
  const expectedDisplay = summary ? parseFloat(summary.expectedCash || 0) * currency.rate : 0;

  // Counted cash in display currency
  const countedDisplay = denoms
    ? denoms.reduce((sum, d) => sum + d * (parseInt(counts[d] || '0') || 0), 0)
    : parseFloat(manualTotal || '0') || 0;

  const variance     = countedDisplay - expectedDisplay;
  const hasVariance  = Math.abs(variance) >= 0.01;
  const isOver       = variance > 0;
  const varianceAbs  = Math.abs(variance);

  function fmt(v) {
    return format(v / currency.rate); // convert display → base → formatted
  }

  async function handleSubmit() {
    setSaved(false);
    const actualCashBase = countedDisplay / currency.rate; // store in base (USD)
    const denomPayload = denoms
      ? denoms.filter((d) => parseInt(counts[d] || '0') > 0)
               .map((d) => ({ value: d, count: parseInt(counts[d]), subtotal: d * parseInt(counts[d]) }))
      : null;

    await record.mutateAsync({ actualCash: actualCashBase, notes, denominations: denomPayload });
    setCounts({});
    setManualTotal('');
    setNotes('');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (summaryLoading) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Expected ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Expected Cash in Drawer</h2>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-slate-900">{fmt(expectedDisplay)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {summary?.orderCount ?? 0} cash order{summary?.orderCount !== 1 ? 's' : ''} since{' '}
              {summary?.lastCountAt ? formatDate(summary.lastCountAt) : 'last 24 hours'}
            </p>
          </div>
          <DollarSign size={32} className="text-slate-100" />
        </div>
      </div>

      {/* ── Denomination input ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Physical Count</h2>

        {denoms ? (
          <div className="space-y-1">
            {denoms.map((d) => {
              const cnt = parseInt(counts[d] || '0') || 0;
              const sub = d * cnt;
              return (
                <div key={d} className="grid grid-cols-[6rem_1fr_1fr] items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">
                    {currency.symbol}{d % 1 === 0 ? d : d.toFixed(2)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={counts[d] || ''}
                    onChange={(e) => setCounts((p) => ({ ...p, [d]: e.target.value }))}
                    placeholder="0"
                    className="input w-full text-center"
                  />
                  <span className={`text-right text-sm font-medium ${cnt > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                    {cnt > 0 ? fmt(sub) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Total counted ({currency.symbol})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={manualTotal}
              onChange={(e) => setManualTotal(e.target.value)}
              className="input w-48"
              placeholder="0.00"
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-semibold text-slate-600">Total counted</span>
          <span className="text-lg font-bold text-slate-900">{fmt(countedDisplay)}</span>
        </div>
      </div>

      {/* ── Variance summary ───────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${
        !hasVariance ? 'border-emerald-200 bg-emerald-50'
        : isOver     ? 'border-amber-200  bg-amber-50'
                     : 'border-red-200    bg-red-50'
      }`}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Expected</p>
            <p className="text-base font-bold text-slate-800">{fmt(expectedDisplay)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Counted</p>
            <p className="text-base font-bold text-slate-800">{fmt(countedDisplay)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Variance</p>
            <div className="flex items-center justify-center gap-1">
              {!hasVariance
                ? <Check size={14} className="text-emerald-600" />
                : isOver
                ? <TrendingUp size={14} className="text-amber-600" />
                : <TrendingDown size={14} className="text-red-500" />
              }
              <p className={`text-base font-bold ${
                !hasVariance ? 'text-emerald-700'
                : isOver     ? 'text-amber-700'
                             : 'text-red-600'
              }`}>
                {!hasVariance ? 'Balanced'
                  : `${isOver ? '+' : '−'}${fmt(varianceAbs)}`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notes + submit ─────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Short ₹50 — checked with supervisor"
            rows={2}
            className="input resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={record.isPending || countedDisplay === 0}
            className="btn-primary disabled:opacity-50"
          >
            {record.isPending ? 'Saving…' : 'Record Count'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check size={13} /> Saved
            </span>
          )}
          {record.isError && (
            <span className="text-xs text-red-500">Failed to save. Try again.</span>
          )}
        </div>
      </div>

      {/* ── History ────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="border-t border-slate-100 pt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Previous Counts</h2>
          <div className="space-y-2">
            {history.map((h) => {
              const v = parseFloat(h.variance) * currency.rate;
              const over = v > 0.005;
              const short = v < -0.005;
              return (
                <div key={h.id} className="flex items-start justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700">{formatDate(h.counted_at)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      by {h.counted_by_email || 'unknown'}
                      {h.notes && <> · <span className="italic">{h.notes}</span></>}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-xs text-slate-400">
                      Expected {format(parseFloat(h.expected_cash))}
                    </p>
                    <p className={`font-semibold ${over ? 'text-amber-600' : short ? 'text-red-500' : 'text-emerald-600'}`}>
                      {over ? `+${fmt(Math.abs(v))}` : short ? `−${fmt(Math.abs(v))}` : 'Balanced'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
