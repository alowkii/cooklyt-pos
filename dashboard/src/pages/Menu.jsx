import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from '../hooks/useMenu';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { useCurrency } from '../context/CurrencyContext';

const CATEGORIES = ['all', 'starters', 'mains', 'desserts', 'drinks', 'sides'];
const EMPTY_FORM  = { name: '', price: '', category: 'mains', available: true, sku: '', customizationGroups: [] };

function newGroup() {
  return { name: '', type: 'single', required: false, options: [{ label: '', priceAdd: 0 }] };
}

function CustomizationGroupsEditor({ groups, onChange }) {
  const setGroup = (i, patch) =>
    onChange(groups.map((g, idx) => idx === i ? { ...g, ...patch } : g));

  const setOption = (gi, oi, patch) =>
    setGroup(gi, {
      options: groups[gi].options.map((o, idx) => idx === oi ? { ...o, ...patch } : o),
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Customization Options</p>
        <button type="button"
          onClick={() => onChange([...groups, newGroup()])}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
          <Plus size={12} /> Add group
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-slate-400 italic">No customizations — customers will only see a notes field.</p>
      )}

      {groups.map((group, gi) => (
        <div key={gi} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          {/* Group header */}
          <div className="flex items-center gap-2">
            <input
              value={group.name}
              onChange={(e) => setGroup(gi, { name: e.target.value })}
              placeholder="Group name (e.g. Spice Level)"
              className="input flex-1 text-sm"
            />
            <button type="button"
              onClick={() => onChange(groups.filter((_, idx) => idx !== gi))}
              className="shrink-0 rounded p-1 text-slate-400 hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Type + required toggles */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex rounded border border-slate-200 overflow-hidden">
              {['single', 'multi'].map((t) => (
                <button key={t} type="button"
                  onClick={() => setGroup(gi, { type: t })}
                  className={`px-2.5 py-1 capitalize transition-colors ${
                    group.type === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}>
                  {t === 'single' ? 'Pick one' : 'Pick many'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-500">
              <input type="checkbox" checked={group.required}
                onChange={(e) => setGroup(gi, { required: e.target.checked })}
                className="rounded" />
              Required
            </label>
          </div>

          {/* Options */}
          <div className="space-y-1.5">
            {group.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  value={opt.label}
                  onChange={(e) => setOption(gi, oi, { label: e.target.value })}
                  placeholder="Option label (e.g. Spicy)"
                  className="input flex-1 text-sm"
                />
                <div className="relative shrink-0 w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">+</span>
                  <input type="number" min="0" step="0.01"
                    value={opt.priceAdd || ''}
                    onChange={(e) => setOption(gi, oi, { priceAdd: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="input pl-5 text-sm w-full"
                    title="Extra charge for this option"
                  />
                </div>
                <button type="button"
                  onClick={() => setGroup(gi, { options: group.options.filter((_, idx) => idx !== oi) })}
                  disabled={group.options.length <= 1}
                  className="shrink-0 rounded p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30">
                  <X size={13} />
                </button>
              </div>
            ))}
            <button type="button"
              onClick={() => setGroup(gi, { options: [...group.options, { label: '', priceAdd: 0 }] })}
              className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
              + Add option
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Menu() {
  const { data: items = [], isLoading } = useMenuItems();
  const { isAdmin } = useAuth();
  const { format, currency } = useCurrency();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('all');
  const [modal, setModal]             = useState(null);   // null | 'add' | <item>
  const [form, setForm]               = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Filtering ────────────────────────────────────────
  const filtered = items.filter((item) => {
    const matchCat    = category === 'all' || item.category?.toLowerCase() === category;
    const q           = search.toLowerCase();
    const matchSearch = item.name.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // ── Modal helpers ─────────────────────────────────────
  function openAdd() {
    setForm(EMPTY_FORM);
    setModal('add');
  }

  function openEdit(item) {
    setForm({
      name:                item.name,
      price:               (parseFloat(item.price) * currency.rate).toFixed(currency.decimals),
      category:            item.category || 'mains',
      available:           item.available,
      sku:                 item.sku || '',
      customizationGroups: item.customization_groups || [],
    });
    setModal(item);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price) / currency.rate,
      sku: form.sku.trim() || undefined,
    };
    if (modal === 'add') {
      await createItem.mutateAsync(payload);
    } else {
      await updateItem.mutateAsync({ id: modal.id, ...payload });
    }
    setModal(null);
  }

  async function handleDelete(id) {
    await deleteItem.mutateAsync(id);
    setConfirmDelete(null);
  }

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <div className="space-y-5">
      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="space-y-3">
        {/* Row 1: search + add button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="input pl-9"
            />
          </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} />
              <span>Add Item</span>
            </button>
          )}
        </div>

        {/* Row 2: category pills — full width, scrollable */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                category === c
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400">Loading menu…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">No items found</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{item.name}</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {format(item.price)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.available
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.available ? 'Available' : 'Off menu'}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.category && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">
                    {item.category}
                  </span>
                )}
                {item.sku && (
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs text-indigo-500">
                    {item.sku}
                  </span>
                )}
                {item.customization_groups?.length > 0 && (
                  <span className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-600">
                    {item.customization_groups.length} option{item.customization_groups.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {isAdmin && (
              <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => openEdit(item)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() =>
                    updateItem.mutate({ id: item.id, available: !item.available })
                  }
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {item.available ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => setConfirmDelete(item)}
                  className="flex items-center justify-center rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────── */}
      {modal !== null && (
        <Modal
          title={modal === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="e.g. Grilled Salmon"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                SKU <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. SALMN-001"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Price ({currency.code})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="input"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="input"
                >
                  {CATEGORIES.filter((c) => c !== 'all').map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) =>
                  setForm((f) => ({ ...f, available: e.target.checked }))
                }
                className="rounded"
              />
              Available to order
            </label>

            <div className="border-t border-slate-100 pt-3">
              <CustomizationGroupsEditor
                groups={form.customizationGroups}
                onChange={(groups) => setForm((f) => ({ ...f, customizationGroups: groups }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ─────────────────────── */}
      {confirmDelete && (
        <Modal title="Delete Item" onClose={() => setConfirmDelete(null)}>
          <p className="mb-5 text-sm text-slate-600">
            Remove <strong>{confirmDelete.name}</strong> from the menu? This
            cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(confirmDelete.id)}
              disabled={deleteItem.isPending}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleteItem.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}