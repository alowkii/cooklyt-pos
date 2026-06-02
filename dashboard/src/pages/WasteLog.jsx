import { useState, useMemo } from 'react';
import { Plus, AlertTriangle, ChevronDown, ChevronRight, Utensils, FlaskConical } from 'lucide-react';
import { useWasteLogs, useLogWaste, useLogWasteByMenuItem } from '../hooks/useWaste';
import { useIngredients } from '../hooks/useIngredients';
import { useMenuItems } from '../hooks/useMenu';
import { useRecipes } from '../hooks/useRecipes';
import Modal from '../components/Modal';
import SelectField from '../components/SelectField';
import { useCurrency } from '../context/CurrencyContext';

const REASONS = ['SPOILAGE', 'SPILL', 'OVERPREP', 'DAMAGED', 'OTHER'];
const REASON_LABELS = {
  SPOILAGE: 'Spoilage',
  SPILL:    'Spill',
  OVERPREP: 'Over-prep',
  DAMAGED:  'Damaged',
  OTHER:    'Other',
};

const EMPTY_ING_FORM  = { ingredientId: '', quantity: '', reason: 'SPOILAGE', notes: '' };
const EMPTY_ITEM_FORM = { menuItemId: '', portions: '1', reason: 'OVERPREP', notes: '' };

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Grouped log display ──────────────────────────────────────────────────────

function BatchGroup({ logs, format }) {
  const [open, setOpen] = useState(true);
  const batchCost = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0);
  const first = logs[0];

  return (
    <>
      {/* Group header row */}
      <tr
        style={{ background: 'var(--paper-2)', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <td colSpan={6} style={{ padding: '8px 16px' }}>
          <div className="flex items-center gap-2">
            {open
              ? <ChevronDown size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
              : <ChevronRight size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />}
            <Utensils size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {first.menu_item_name}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--mute)' }}>
              · {logs.length} ingredient{logs.length !== 1 ? 's' : ''}
            </span>
            <span style={{
              marginLeft: 6, fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 4,
              background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)',
            }}>
              {REASON_LABELS[first.reason] || first.reason}
            </span>
            <span className="mono num" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--bad)' }}>
              {format(batchCost)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--mute)', marginLeft: 8 }}>
              {fmtDate(first.logged_at)}
            </span>
          </div>
        </td>
      </tr>

      {/* Ingredient rows */}
      {open && logs.map((log) => (
        <tr
          key={log.id}
          style={{ borderBottom: '1px solid var(--line)', transition: 'background .1s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <td style={{ padding: '9px 16px 9px 36px' }}>
            <div className="flex items-center gap-2">
              <FlaskConical size={11} style={{ color: 'var(--mute-2)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>{log.ingredient_name}</span>
              {log.notes && <span style={{ fontSize: 11, color: 'var(--mute)' }}>— {log.notes}</span>}
            </div>
          </td>
          <td className="mono num" style={{ padding: '9px 16px', fontSize: 13, color: 'var(--ink)' }}>
            {parseFloat(log.quantity).toFixed(3)} {log.unit}
          </td>
          <td style={{ padding: '9px 16px' }}>—</td>
          <td className="mono num" style={{ padding: '9px 16px', fontSize: 12, color: 'var(--mute)' }}>
            {format(log.cost_at_time)}
          </td>
          <td className="mono num" style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
            {format(log.total_cost)}
          </td>
          <td style={{ padding: '9px 16px', fontSize: 12, color: 'var(--mute)' }}>—</td>
        </tr>
      ))}
    </>
  );
}

function SingleRow({ log, format }) {
  return (
    <tr
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
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function WasteLog() {
  const [from, setFrom] = useState(today());
  const [to,   setTo]   = useState(today());
  const [modal, setModal] = useState(false);
  const [tab,   setTab]   = useState('item'); // 'item' | 'ingredient'
  const [ingForm,  setIngForm]  = useState(EMPTY_ING_FORM);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);

  const { data: logs        = [], isLoading } = useWasteLogs(from, to);
  const { data: ingredients = [] }            = useIngredients();
  const { data: menuItems   = [] }            = useMenuItems();
  const { data: recipes     = [] }            = useRecipes();
  const { format }                            = useCurrency();
  const logWaste          = useLogWaste();
  const logWasteByItem    = useLogWasteByMenuItem();

  const totalCost = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0);

  // Only menu items that have a recipe linked
  const menuItemsWithRecipe = useMemo(
    () => menuItems.filter((m) => m.recipe_id),
    [menuItems],
  );

  // Preview: ingredients for selected menu item × portions
  const selectedRecipe = useMemo(() => {
    if (!itemForm.menuItemId) return null;
    const item = menuItems.find((m) => m.id === itemForm.menuItemId);
    if (!item?.recipe_id) return null;
    return recipes.find((r) => r.id === item.recipe_id) || null;
  }, [itemForm.menuItemId, menuItems, recipes]);

  const previewIngredients = useMemo(() => {
    if (!selectedRecipe) return [];
    const portions  = parseFloat(itemForm.portions) || 1;
    const yieldQty  = parseFloat(selectedRecipe.yield_quantity) || 1;
    return selectedRecipe.ingredients.map((ing) => ({
      ...ing,
      calculatedQty: parseFloat((parseFloat(ing.quantity) * portions / yieldQty).toFixed(4)),
    }));
  }, [selectedRecipe, itemForm.portions]);

  // Group logs: batch entries together, singles standalone
  const grouped = useMemo(() => {
    const seen    = new Set();
    const result  = [];
    for (const log of logs) {
      if (!log.batch_id) {
        result.push({ type: 'single', log });
      } else if (!seen.has(log.batch_id)) {
        seen.add(log.batch_id);
        result.push({ type: 'batch', batchId: log.batch_id, logs: logs.filter((l) => l.batch_id === log.batch_id) });
      }
    }
    return result;
  }, [logs]);

  function openModal() {
    setIngForm(EMPTY_ING_FORM);
    setItemForm(EMPTY_ITEM_FORM);
    setModal(true);
  }

  async function handleIngredientSubmit(e) {
    e.preventDefault();
    await logWaste.mutateAsync({
      ingredientId: ingForm.ingredientId,
      quantity:     parseFloat(ingForm.quantity),
      reason:       ingForm.reason,
      notes:        ingForm.notes || undefined,
    });
    setIngForm(EMPTY_ING_FORM);
    setModal(false);
  }

  async function handleItemSubmit(e) {
    e.preventDefault();
    await logWasteByItem.mutateAsync({
      menuItemId: itemForm.menuItemId,
      portions:   parseFloat(itemForm.portions),
      reason:     itemForm.reason,
      notes:      itemForm.notes || undefined,
    });
    setItemForm(EMPTY_ITEM_FORM);
    setModal(false);
  }

  const isSaving = logWaste.isPending || logWasteByItem.isPending;

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
          <div className="flex items-center gap-1.5">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="input" style={{ height: 32, width: 130, fontSize: 12 }} />
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="input" style={{ height: 32, width: 130, fontSize: 12 }} />
          </div>
          <button onClick={openModal} className="btn-primary">
            <Plus size={13} /> Log waste
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="py-16 text-center rounded-[8px]" style={{ fontSize: 13, color: 'var(--mute)', border: '1px dashed var(--line-2)' }}>
          No waste recorded for this period
        </div>
      ) : (
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                  {['Ingredient / Item', 'Qty', 'Reason', 'Unit cost', 'Total cost', 'Logged at'].map((h) => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map((entry) =>
                  entry.type === 'batch'
                    ? <BatchGroup key={entry.batchId} logs={entry.logs} format={format} />
                    : <SingleRow  key={entry.log.id}  log={entry.log}   format={format} />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Waste Modal */}
      {modal && (
        <Modal title="Log Waste" onClose={() => setModal(false)}>
          {/* Tabs */}
          <div className="flex rounded-[6px] overflow-hidden mb-5" style={{ border: '1px solid var(--line-2)' }}>
            {[
              { key: 'item',       label: 'By Menu Item',  Icon: Utensils    },
              { key: 'ingredient', label: 'By Ingredient', Icon: FlaskConical },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="flex flex-1 items-center justify-center gap-2"
                style={{
                  height: 36, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer',
                  background: tab === key ? 'var(--ink)' : 'var(--paper)',
                  color:      tab === key ? '#fff'       : 'var(--mute)',
                  transition: 'background .1s, color .1s',
                }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* By Menu Item tab */}
          {tab === 'item' && (
            <form onSubmit={handleItemSubmit} className="space-y-4">
              {menuItemsWithRecipe.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--mute)', border: '1px dashed var(--line-2)', borderRadius: 7 }}>
                  No menu items have a recipe linked.<br />
                  <span style={{ fontSize: 12 }}>Link recipes to menu items in the Menu page first.</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Menu Item</label>
                    <SelectField
                      value={itemForm.menuItemId}
                      onChange={(v) => setItemForm((f) => ({ ...f, menuItemId: v }))}
                      options={[
                        { value: '', label: 'Select menu item…' },
                        ...menuItemsWithRecipe.map((m) => ({ value: m.id, label: m.name })),
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Portions wasted</label>
                      <input
                        type="number" step="0.5" min="0.5"
                        value={itemForm.portions}
                        onChange={(e) => setItemForm((f) => ({ ...f, portions: e.target.value }))}
                        className="input" placeholder="1" required
                      />
                    </div>
                    <div>
                      <label className="label">Reason</label>
                      <SelectField
                        value={itemForm.reason}
                        onChange={(v) => setItemForm((f) => ({ ...f, reason: v }))}
                        options={REASONS.map((r) => ({ value: r, label: REASON_LABELS[r] }))}
                      />
                    </div>
                  </div>

                  {/* Ingredient preview */}
                  {previewIngredients.length > 0 && (
                    <div style={{ border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', padding: '8px 12px', background: 'var(--paper-2)', margin: 0, borderBottom: '1px solid var(--line)' }}>
                        Ingredients that will be logged
                      </p>
                      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                        {previewIngredients.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between" style={{ padding: '7px 12px', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                            <span style={{ color: 'var(--ink)' }}>{ing.ingredient_name || ing.name || `Ingredient ${i + 1}`}</span>
                            <span className="mono num" style={{ color: 'var(--mute)' }}>
                              {ing.calculatedQty} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Notes (optional)</label>
                    <textarea
                      value={itemForm.notes}
                      onChange={(e) => setItemForm((f) => ({ ...f, notes: e.target.value }))}
                      className="input" rows={2} style={{ resize: 'vertical' }}
                      placeholder="e.g. Burnt during service"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                    <button type="submit" disabled={isSaving || !itemForm.menuItemId || previewIngredients.length === 0} className="btn-primary flex-1 justify-center disabled:opacity-50">
                      {isSaving ? 'Saving…' : 'Log waste'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* By Ingredient tab */}
          {tab === 'ingredient' && (
            <form onSubmit={handleIngredientSubmit} className="space-y-4">
              <div>
                <label className="label">Ingredient</label>
                <SelectField
                  value={ingForm.ingredientId}
                  onChange={(v) => setIngForm((f) => ({ ...f, ingredientId: v }))}
                  options={[
                    { value: '', label: 'Select ingredient…' },
                    ...ingredients.filter((i) => i.is_active).map((i) => ({
                      value: i.id,
                      label: `${i.name} (stock: ${parseFloat(i.stock_on_hand).toFixed(2)} ${i.unit})`,
                    })),
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number" step="0.001" min="0.001"
                    value={ingForm.quantity}
                    onChange={(e) => setIngForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="input" placeholder="0" required
                  />
                </div>
                <div>
                  <label className="label">Reason</label>
                  <SelectField
                    value={ingForm.reason}
                    onChange={(v) => setIngForm((f) => ({ ...f, reason: v }))}
                    options={REASONS.map((r) => ({ value: r, label: REASON_LABELS[r] }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={ingForm.notes}
                  onChange={(e) => setIngForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input" rows={2} style={{ resize: 'vertical' }}
                  placeholder="e.g. Milk expired overnight"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn-primary flex-1 justify-center">
                  {isSaving ? 'Saving…' : 'Log waste'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      <style>{`.label { display:block; margin-bottom:4px; font-size:11.5px; font-weight:500; color:var(--mute); }`}</style>
    </div>
  );
}
