import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTables, useUpdateTableStatus, useCreateTable } from '../hooks/useTables';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';

const STATUSES = ['available', 'occupied', 'reserved', 'cleaning'];

const CARD_CLASSES = {
  available: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  occupied:  'bg-red-100    border-red-300    text-red-800',
  reserved:  'bg-amber-100  border-amber-300  text-amber-800',
  cleaning:  'bg-blue-100   border-blue-300   text-blue-800',
};

const DOT_CLASSES = {
  available: 'bg-emerald-500',
  occupied:  'bg-red-500',
  reserved:  'bg-amber-500',
  cleaning:  'bg-blue-500',
};

export default function Tables() {
  const { data: tables = [], isLoading } = useTables();
  const updateStatus = useUpdateTableStatus();
  const createTable  = useCreateTable();
  const { isAdmin, user }  = useAuth();
  const canEdit = isAdmin || user?.role === 'staff';

  const [selected, setSelected]   = useState(null);
  const [addModal, setAddModal]   = useState(false);
  const [newTable, setNewTable]   = useState({ number: '', seats: '' });
  const [addError, setAddError]   = useState('');

  function handleTableClick(t) {
    if (!canEdit) return;
    setSelected(t);
  }

  async function handleStatusChange(status) {
    await updateStatus.mutateAsync({ id: selected.id, status });
    setSelected(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setAddError('');
    try {
      await createTable.mutateAsync({
        number: parseInt(newTable.number),
        seats:  parseInt(newTable.seats),
      });
      setAddModal(false);
      setNewTable({ number: '', seats: '' });
    } catch (err) {
      setAddError(err.response?.data?.error || err.message || 'Failed to create table');
    }
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading tables…</div>;
  }

  return (
    <div className="space-y-5">
      {/* ── Legend + Add button ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          {STATUSES.map((s) => {
            const count = tables.filter((t) => t.status === s).length;
            return (
              <span key={s} className="flex items-center gap-1.5 capitalize">
                <span className={`h-2.5 w-2.5 rounded-full ${DOT_CLASSES[s]}`} />
                {count} {s}
              </span>
            );
          })}
        </div>
        {isAdmin && (
          <button
            onClick={() => { setAddError(''); setAddModal(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} /> Add Table
          </button>
        )}
      </div>

      {!canEdit && (
        <p className="text-xs text-slate-400">View only — contact an admin or staff member to make changes</p>
      )}

      {/* ── Table grid ──────────────────────────────────── */}
      {tables.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">
          No tables yet{isAdmin ? ' — add one to get started' : ' — contact an admin'}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
          {[...tables]
            .sort((a, b) => a.number - b.number)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => handleTableClick(t)}
                disabled={!canEdit}
                className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all ${
                  canEdit ? 'hover:scale-105 hover:shadow-md cursor-pointer' : 'cursor-default'
                } ${CARD_CLASSES[t.status] ?? 'border-slate-200 bg-slate-100 text-slate-600'}`}
              >
                <span className="text-2xl font-bold leading-none">{t.number}</span>
                <span className="mt-1 text-[10px] font-medium capitalize leading-none">{t.status}</span>
                <span className="mt-0.5 text-[10px] opacity-60">{t.seats}p</span>
              </button>
            ))}
        </div>
      )}

      {/* ── Change Status Modal (admin + staff) ─────────── */}
      {selected && canEdit && (
        <Modal title={`Table ${selected.number}`} onClose={() => setSelected(null)}>
          <p className="mb-4 text-sm text-slate-500">
            Current: <strong className="capitalize text-slate-700">{selected.status}</strong>
            {' '}· {selected.seats} seats
          </p>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Change status to
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.filter((s) => s !== selected.status).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updateStatus.isPending}
                className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium capitalize transition-opacity hover:opacity-80 disabled:opacity-40 ${CARD_CLASSES[s]}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Add Table Modal (admin only) ─────────────────── */}
      {addModal && isAdmin && (
        <Modal title="Add Table" onClose={() => setAddModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Table Number</label>
              <input
                type="number"
                min="1"
                value={newTable.number}
                onChange={(e) => setNewTable((f) => ({ ...f, number: e.target.value }))}
                className="input"
                placeholder="e.g. 12"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Seats</label>
              <input
                type="number"
                min="1"
                value={newTable.seats}
                onChange={(e) => setNewTable((f) => ({ ...f, seats: e.target.value }))}
                className="input"
                placeholder="e.g. 4"
                required
              />
            </div>

            {addError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{addError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setAddModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={createTable.isPending} className="btn-primary flex-1">
                {createTable.isPending ? 'Adding…' : 'Add Table'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
