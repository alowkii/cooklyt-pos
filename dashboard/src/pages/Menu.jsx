import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
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
const EMPTY_FORM  = { name: '', price: '', category: 'mains', available: true, sku: '' };

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
      name:      item.name,
      // Pre-fill price in the selected display currency
      price:     (parseFloat(item.price) * currency.rate).toFixed(currency.decimals),
      category:  item.category || 'mains',
      available: item.available,
      sku:       item.sku || '',
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