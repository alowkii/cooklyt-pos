import { useState } from 'react';
import { Plus, Pencil, AlertTriangle, ShoppingCart, X } from 'lucide-react';
import {
  useIngredients,
  useCreateIngredient,
  useUpdateIngredient,
  useRecordPurchase,
} from '../hooks/useIngredients';
import Modal from '../components/Modal';
import { useCurrency } from '../context/CurrencyContext';

const EMPTY_FORM = { name: '', unit: '', reorderLevel: '', reorderQty: '', latestUnitCost: '' };
const EMPTY_PURCHASE = { quantity: '', unitCost: '' };

export default function Ingredients() {
  const { data: items = [], isLoading } = useIngredients();
  const { format, currency }            = useCurrency();
  const createIngredient  = useCreateIngredient();
  const updateIngredient  = useUpdateIngredient();
  const recordPurchase    = useRecordPurchase();

  const [modal,    setModal]    = useState(null); // null | 'add' | ingredient obj
  const [purchase, setPurchase] = useState(null); // null | ingredient obj
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [purForm,  setPurForm]  = useState(EMPTY_PURCHASE);

  function openAdd() {
    setForm(EMPTY_FORM);
    setModal('add');
  }

  function openEdit(ing) {
    setForm({
      name:            ing.name,
      unit:            ing.unit,
      reorderLevel:    ing.reorder_level,
      reorderQty:      ing.reorder_qty,
      latestUnitCost:  parseFloat(ing.latest_unit_cost).toFixed(currency.decimals),
    });
    setModal(ing);
  }

  function openPurchase(ing) {
    setPurForm({ quantity: '', unitCost: parseFloat(ing.latest_unit_cost).toFixed(currency.decimals) });
    setPurchase(ing);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      latestUnitCost: parseFloat(form.latestUnitCost) || 0,
      reorderLevel:   parseFloat(form.reorderLevel)   || 0,
      reorderQty:     parseFloat(form.reorderQty)     || 0,
    };
    if (modal === 'add') {
      await createIngredient.mutateAsync(payload);
    } else {
      await updateIngredient.mutateAsync({ id: modal.id, ...payload });
    }
    setModal(null);
  }

  async function handlePurchase(e) {
    e.preventDefault();
    await recordPurchase.mutateAsync({
      id:       purchase.id,
      quantity: parseFloat(purForm.quantity),
      unitCost: parseFloat(purForm.unitCost),
    });
    setPurchase(null);
  }

  const isSaving = createIngredient.isPending || updateIngredient.isPending;
  const lowStock = items.filter(
    (i) => i.is_active && parseFloat(i.stock_on_hand) <= parseFloat(i.reorder_level),
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Ingredients</h1>
          <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>{items.length} total</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lowStock.length > 0 && (
            <span
              className="flex items-center gap-1.5 rounded-[6px] px-2.5"
              style={{ height: 32, fontSize: 12, background: 'var(--warn-bg, #fef9c3)', color: '#92400e', border: '1px solid #fde68a' }}
            >
              <AlertTriangle size={13} />
              {lowStock.length} low stock
            </span>
          )}
          <button onClick={openAdd} className="btn-primary">
            <Plus size={13} /> Add ingredient
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div
          className="py-16 text-center rounded-[8px]"
          style={{ fontSize: 13, color: 'var(--mute)', border: '1px dashed var(--line-2)' }}
        >
          No ingredients yet — add one to start tracking stock
        </div>
      ) : (
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                  {['Ingredient', 'Unit', 'Stock', 'Reorder at', 'Unit cost', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 16px', textAlign: 'left',
                        fontSize: 10, fontWeight: 600, color: 'var(--mute)',
                        textTransform: 'uppercase', letterSpacing: '.07em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((ing) => {
                  const isLow = ing.is_active && parseFloat(ing.stock_on_hand) <= parseFloat(ing.reorder_level);
                  return (
                    <tr
                      key={ing.id}
                      style={{ borderBottom: '1px solid var(--line)', transition: 'background .1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{ing.name}</span>
                          {!ing.is_active && (
                            <span style={{ fontSize: 10, color: 'var(--mute)', background: 'var(--paper-2)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>
                              inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--mute)' }}>{ing.unit}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          className="mono num"
                          style={{
                            fontSize: 13, fontWeight: 500,
                            color: isLow ? '#b45309' : 'var(--ink)',
                          }}
                        >
                          {parseFloat(ing.stock_on_hand).toFixed(2)}
                          {isLow && <AlertTriangle size={11} style={{ marginLeft: 4, verticalAlign: 'middle', color: '#b45309' }} />}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--mute)' }} className="mono num">
                        {parseFloat(ing.reorder_level).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--ink)' }} className="mono num">
                        {format(ing.latest_unit_cost)}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openPurchase(ing)}
                            className="btn btn-sm btn-ghost"
                            title="Record purchase"
                            style={{ gap: 4, fontSize: 12 }}
                          >
                            <ShoppingCart size={12} /> Purchase
                          </button>
                          <button
                            onClick={() => openEdit(ing)}
                            className="btn btn-sm btn-ghost"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal !== null && (
        <Modal title={modal === 'add' ? 'Add Ingredient' : 'Edit Ingredient'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input" placeholder="e.g. Whole Milk" required
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="input" placeholder="ml, g, piece…" required
                />
              </div>
              <div>
                <label className="label">Unit cost ({currency.code})</label>
                <input
                  type="number" step="0.0001" min="0"
                  value={form.latestUnitCost}
                  onChange={(e) => setForm((f) => ({ ...f, latestUnitCost: e.target.value }))}
                  className="input" placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Reorder level</label>
                <input
                  type="number" step="0.001" min="0"
                  value={form.reorderLevel}
                  onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                  className="input" placeholder="0"
                />
              </div>
              <div>
                <label className="label">Reorder qty</label>
                <input
                  type="number" step="0.001" min="0"
                  value={form.reorderQty}
                  onChange={(e) => setForm((f) => ({ ...f, reorderQty: e.target.value }))}
                  className="input" placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={isSaving} className="btn-primary flex-1 justify-center">
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Purchase Modal */}
      {purchase && (
        <Modal title={`Record Purchase — ${purchase.name}`} onClose={() => setPurchase(null)}>
          <form onSubmit={handlePurchase} className="space-y-4">
            <p style={{ fontSize: 12, color: 'var(--mute)' }}>
              Current stock: <strong style={{ color: 'var(--ink)' }}>{parseFloat(purchase.stock_on_hand).toFixed(2)} {purchase.unit}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity ({purchase.unit})</label>
                <input
                  type="number" step="0.001" min="0.001"
                  value={purForm.quantity}
                  onChange={(e) => setPurForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="input" placeholder="0" required
                />
              </div>
              <div>
                <label className="label">Unit cost ({currency.code})</label>
                <input
                  type="number" step="0.0001" min="0"
                  value={purForm.unitCost}
                  onChange={(e) => setPurForm((f) => ({ ...f, unitCost: e.target.value }))}
                  className="input" placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setPurchase(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={recordPurchase.isPending} className="btn-primary flex-1 justify-center">
                {recordPurchase.isPending ? 'Saving…' : 'Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .label { display: block; margin-bottom: 4px; font-size: 11.5px; font-weight: 500; color: var(--mute); }
      `}</style>
    </div>
  );
}
