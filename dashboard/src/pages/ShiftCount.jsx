import { useState } from 'react';
import { Check, TrendingUp, TrendingDown } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useShiftSummary, useShiftHistory, useRecordShiftCount } from '../hooks/useShift';

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
  const [counts,      setCounts]     = useState({});
  const [manualTotal, setManualTotal] = useState('');
  const [notes,       setNotes]      = useState('');
  const [saved,       setSaved]      = useState(false);

  const expectedDisplay = summary ? parseFloat(summary.expectedCash || 0) * currency.rate : 0;

  const countedDisplay = denoms
    ? denoms.reduce((sum, d) => sum + d * (parseInt(counts[d] || '0') || 0), 0)
    : parseFloat(manualTotal || '0') || 0;

  const variance    = countedDisplay - expectedDisplay;
  const hasVariance = Math.abs(variance) >= 0.01;
  const isOver      = variance > 0;
  const varianceAbs = Math.abs(variance);

  function fmt(v) {
    return format(v / currency.rate);
  }

  async function handleSubmit() {
    setSaved(false);
    const actualCashBase = countedDisplay / currency.rate;
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
    return <div className="py-12 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>;
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* Expected */}
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '20px 20px 18px', background: 'var(--paper)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', marginBottom: 8 }}>
          Expected Cash in Drawer
        </p>
        <p className="mono num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
          {fmt(expectedDisplay)}
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 6 }}>
          {summary?.orderCount ?? 0} cash order{summary?.orderCount !== 1 ? 's' : ''} since{' '}
          {summary?.lastCountAt ? formatDate(summary.lastCountAt) : 'last 24 hours'}
        </p>
      </div>

      {/* Denomination input */}
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', marginBottom: 16 }}>
          Physical Count
        </p>

        {denoms ? (
          <div className="space-y-1.5">
            {denoms.map((d) => {
              const cnt = parseInt(counts[d] || '0') || 0;
              const sub = d * cnt;
              return (
                <div key={d} className="grid items-center gap-3" style={{ gridTemplateColumns: '6rem 1fr 1fr' }}>
                  <span className="mono num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
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
                  <span className="mono num text-right" style={{ fontSize: 13, fontWeight: 500, color: cnt > 0 ? 'var(--ink)' : 'var(--line-2)' }}>
                    {cnt > 0 ? fmt(sub) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>
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

        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mute)' }}>Total counted</span>
          <span className="mono num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{fmt(countedDisplay)}</span>
        </div>
      </div>

      {/* Variance summary */}
      <div style={{
        border: `1px solid ${!hasVariance ? 'rgba(41,163,97,.25)' : isOver ? 'rgba(179,120,31,.25)' : 'rgba(179,55,43,.25)'}`,
        background: !hasVariance ? 'rgba(41,163,97,.04)' : isOver ? 'rgba(179,120,31,.04)' : 'rgba(179,55,43,.04)',
        borderRadius: 8,
        padding: 20,
      }}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--mute)', marginBottom: 4 }}>Expected</p>
            <p className="mono num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{fmt(expectedDisplay)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--mute)', marginBottom: 4 }}>Counted</p>
            <p className="mono num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{fmt(countedDisplay)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--mute)', marginBottom: 4 }}>Variance</p>
            <div className="flex items-center justify-center gap-1">
              {!hasVariance
                ? <Check size={13} style={{ color: 'var(--ok)' }} />
                : isOver
                ? <TrendingUp size={13} style={{ color: 'var(--warn)' }} />
                : <TrendingDown size={13} style={{ color: 'var(--bad)' }} />
              }
              <p className="mono num" style={{
                fontSize: 14, fontWeight: 700,
                color: !hasVariance ? 'var(--ok)' : isOver ? 'var(--warn)' : 'var(--bad)',
              }}>
                {!hasVariance ? 'Balanced' : `${isOver ? '+' : '−'}${fmt(varianceAbs)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes + submit */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>
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
            <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ok)' }}>
              <Check size={13} /> Saved
            </span>
          )}
          {record.isError && (
            <span style={{ fontSize: 12, color: 'var(--bad)' }}>Failed to save. Try again.</span>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="pt-5" style={{ borderTop: '1px solid var(--line)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', marginBottom: 12 }}>
            Previous Counts
          </p>
          <div className="space-y-1">
            {history.map((h) => {
              const v    = parseFloat(h.variance) * currency.rate;
              const over  = v > 0.005;
              const short = v < -0.005;
              return (
                <div
                  key={h.id}
                  className="flex items-start justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid var(--line)', fontSize: 13 }}
                >
                  <div className="min-w-0">
                    <p style={{ fontWeight: 500, color: 'var(--ink)' }}>{formatDate(h.counted_at)}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>
                      by {h.counted_by_email || 'unknown'}
                      {h.notes && <> · <span className="italic">{h.notes}</span></>}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="mono num" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
                      Expected {format(parseFloat(h.expected_cash))}
                    </p>
                    <p className="mono num" style={{ fontWeight: 600, color: over ? 'var(--warn)' : short ? 'var(--bad)' : 'var(--ok)' }}>
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
