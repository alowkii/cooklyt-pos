import { useState } from 'react';
import { useInventoryTransactions } from '../hooks/useInventory';
import { useIngredients } from '../hooks/useIngredients';
import { useCurrency } from '../context/CurrencyContext';

const TYPE_CFG = {
  PURCHASE:   { label: 'Purchase',   color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  SALE:       { label: 'Sale',       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  RETURN:     { label: 'Return',     color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  WASTE:      { label: 'Waste',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ADJUSTMENT: { label: 'Adjustment', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
};

function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fmtDateTime(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function refLabel(row) {
  if (!row.ref_id) return '—';
  if (row.txn_type === 'SALE' || row.txn_type === 'RETURN')
    return `#${row.ref_id.slice(-6).toUpperCase()}`;
  return row.ref_id;
}

export default function InventoryLedger() {
  const [from,         setFrom]         = useState(firstOfMonth());
  const [to,           setTo]           = useState(today());
  const [ingredientId, setIngredientId] = useState('');
  const [txnType,      setTxnType]      = useState('');

  const { data: rows = [], isLoading } = useInventoryTransactions({
    from, to,
    ingredientId: ingredientId || undefined,
    type:         txnType      || undefined,
    limit:        500,
  });
  const { data: ingredients = [] } = useIngredients();
  const { format } = useCurrency();

  const summary = rows.reduce((acc, r) => {
    const t = r.txn_type;
    if (!acc[t]) acc[t] = { count: 0, cost: 0 };
    acc[t].count++;
    acc[t].cost += Math.abs(parseFloat(r.unit_cost || 0) * parseFloat(r.quantity_delta || 0));
    return acc;
  }, {});

  return (
    <div className="space-y-5">

      {/* Header + filters */}
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Inventory Ledger</h1>
          <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
            All ingredient stock movements · {rows.length} entries
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap justify-end">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="input" style={{ height: 32, width: 130, fontSize: 12 }} />
          <span style={{ fontSize: 12, color: 'var(--mute)' }}>–</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="input" style={{ height: 32, width: 130, fontSize: 12 }} />
          <select value={ingredientId} onChange={e => setIngredientId(e.target.value)}
            className="input" style={{ height: 32, fontSize: 12, minWidth: 150 }}>
            <option value="">All ingredients</option>
            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select value={txnType} onChange={e => setTxnType(e.target.value)}
            className="input" style={{ height: 32, fontSize: 12, minWidth: 120 }}>
            <option value="">All types</option>
            {Object.entries(TYPE_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary chips */}
      {Object.keys(summary).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.keys(TYPE_CFG).filter(t => summary[t]).map(t => {
            const cfg = TYPE_CFG[t];
            return (
              <div key={t} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${cfg.border}`, background: cfg.bg }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                <span style={{ fontSize: 12, marginLeft: 8, color: 'var(--mute)' }}>
                  {summary[t].count} txn{summary[t].count !== 1 ? 's' : ''} · {format(summary[t].cost)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center rounded-[8px]"
          style={{ fontSize: 13, color: 'var(--mute)', border: '1px dashed var(--line-2)' }}>
          No transactions found for this period
        </div>
      ) : (
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                  {['Date / Time', 'Ingredient', 'Type', 'Δ Qty', 'Unit Cost', 'Ref'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const cfg = TYPE_CFG[row.txn_type] ?? { label: row.txn_type, color: 'var(--mute)', bg: 'var(--paper-2)', border: 'var(--line)' };
                  const delta = parseFloat(row.quantity_delta);
                  const deltaColor = delta > 0 ? 'var(--ok)' : 'var(--bad)';
                  return (
                    <tr key={row.id}
                      style={{ borderBottom: '1px solid var(--line)', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                        {fmtDateTime(row.created_at)}
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                        {row.ingredient_name}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="mono num" style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600, color: deltaColor }}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(3)} {row.ingredient_unit}
                      </td>
                      <td className="mono num" style={{ padding: '9px 14px', fontSize: 12, color: 'var(--mute)' }}>
                        {format(row.unit_cost)}
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--mute)', fontFamily: 'monospace' }}>
                        {refLabel(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
