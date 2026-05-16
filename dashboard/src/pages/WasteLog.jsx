import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { useWasteLogs, useLogWaste } from '../hooks/useWaste';
import { useIngredients } from '../hooks/useIngredients';
import Modal from '../components/Modal';
import { useCurrency } from '../context/CurrencyContext';

const REASONS = ['SPOILAGE', 'SPILL', 'OVERPREP', 'DAMAGED', 'OTHER'];
const REASON_LABELS = {
  SPOILAGE: 'Spoilage',
  SPILL:    'Spill',
  OVERPREP: 'Over-prep',
  DAMAGED:  'Damaged',
  OTHER:    'Other',
};
const EMPTY_FORM = { ingredientId: '', quantity: '', reason: 'SPOILAGE', notes: '' };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function WasteLog() {
  const [from, setFrom]   = useState(today());
  const [to,   setTo]     = useState(today());
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState(EMPTY_FORM);

  const { data: logs = [],        isLoading }  = useWasteLogs(from, to);
  const { data: ingredients = [] }             = useIngredients();
  const { format, currency }                   = useCurrency();
  const logWaste                               = useLogWaste();

  const totalCost = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    await logWaste.mutateAsync({
      ingredientId: form.ingredientId,
      quantity:     parseFloat(form.quantity),
      reason:       form.reason,
      notes:        form.notes || undefined,
    });
    setForm(EMPTY_FORM);
    setModal(false);
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Waste Log</h1>
          <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
            {logs.length} entries · total cost <strong style={{ color: 'var(--ink)' }}>{format(totalCost)}</strong>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="input" style={{ height: 32, width: 130, fontSize: 12 }} />
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="input" style={{ height: 32, width: 130, fontSize: 12 }} />
          </div>
          <button onClick={() => { setForm(EMPTY_FORM); setModal(true); }} className="btn-primary">
            <Plus size={13} /> Log waste
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center rounded-[8px]" style={{ fontSize: 13, color: 'var(--mute)', border: '1px dashed var(--line-2)' }}>
          No waste recorded for this period
        </div>
      ) : (
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                  {['Ingredient', 'Qty', 'Reason', 'Unit cost', 'Total cost', 'Logged at'].map((h) => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid var(--line)', transition: 'background .1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{log.ingredient_name}</p>
                      {log.notes && <p style={{ fontSize: 11, color: 'var(--mute)', marginTop: 1 }}>{log.notes}</p>}
                    </td>
                    <td className="mono num" style={{ padding: '10px 16px', fontSize: 13, color: 'var(--ink)' }}>
                      {parseFloat(log.quantity)} {log.unit}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                        background: 'var(--paper-2)', border: '1px solid var(--line)', color: 'var(--ink)',
                      }}>
                        {REASON_LABELS[log.reason] || log.reason}
                      </span>
                    </td>
                    <td className="mono num" style={{ padding: '10px 16px', fontSize: 12, color: 'var(--mute)' }}>
                      {format(log.cost_at_time)}
                    </td>
                    <td className="mono num" style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {format(log.total_cost)}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--mute)' }}>
                      {fmtDate(log.logged_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Waste Modal */}
      {modal && (
        <Modal title="Log Waste" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Ingredient</label>
              <select
                value={form.ingredientId}
                onChange={(e) => setForm((f) => ({ ...f, ingredientId: e.target.value }))}
                className="input" required
              >
                <option value="">Select ingredient…</option>
                {ingredients.filter((i) => i.is_active).map((i) => (
                  <option key={i.id} value={i.id}>{i.name} (stock: {parseFloat(i.stock_on_hand).toFixed(2)} {i.unit})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity</label>
                <input
                  type="number" step="0.001" min="0.001"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="input" placeholder="0" required
                />
              </div>
              <div>
                <label className="label">Reason</label>
                <select value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="input">
                  {REASONS.map((r) => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input" rows={2} style={{ resize: 'vertical' }}
                placeholder="e.g. Milk expired overnight"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={logWaste.isPending} className="btn-primary flex-1 justify-center">
                {logWaste.isPending ? 'Saving…' : 'Log waste'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`.label { display:block; margin-bottom:4px; font-size:11.5px; font-weight:500; color:var(--mute); }`}</style>
    </div>
  );
}
