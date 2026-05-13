import { useState } from 'react';
import { Plus, QrCode, Copy, Check, LayoutGrid, X, Minus } from 'lucide-react';
import QRCode from 'qrcode';
import { useTables, useUpdateTableStatus, useCreateTable, useUpdateTablePosition } from '../hooks/useTables';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';

const GRID_COLS_MIN = 4;  const GRID_COLS_MAX = 20;
const GRID_ROWS_MIN = 3;  const GRID_ROWS_MAX = 14;

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
  const updateStatus   = useUpdateTableStatus();
  const updatePosition = useUpdateTablePosition();
  const createTable    = useCreateTable();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin || user?.role === 'staff';

  const [selected, setSelected]   = useState(null);
  const [addModal, setAddModal]   = useState(false);
  const [newTable, setNewTable]   = useState({ number: '', seats: '' });
  const [addError, setAddError]   = useState('');

  // Layout editor state
  const [layoutMode, setLayoutMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [overCell,   setOverCell]   = useState(null);
  const [gridCols,   setGridCols]   = useState(() => parseInt(localStorage.getItem('layoutGridCols') || '12'));
  const [gridRows,   setGridRows]   = useState(() => parseInt(localStorage.getItem('layoutGridRows') || '8'));

  function changeGrid(axis, delta) {
    if (axis === 'cols') {
      const next = Math.min(GRID_COLS_MAX, Math.max(GRID_COLS_MIN, gridCols + delta));
      setGridCols(next);
      localStorage.setItem('layoutGridCols', next);
    } else {
      const next = Math.min(GRID_ROWS_MAX, Math.max(GRID_ROWS_MIN, gridRows + delta));
      setGridRows(next);
      localStorage.setItem('layoutGridRows', next);
    }
  }

  const [qrTable,   setQrTable]   = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied,    setCopied]    = useState(false);

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

  async function handleQrClick(t) {
    setQrDataUrl('');
    setCopied(false);
    setQrTable(t);
    const menuBase = import.meta.env.VITE_MENU_URL || `${window.location.protocol}//${window.location.hostname}:5175`;
    const url = `${menuBase}/order/${t.id}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: '#1e1b4b' } });
    setQrDataUrl(dataUrl);
  }

  function handleCopyUrl() {
    const menuBase = import.meta.env.VITE_MENU_URL || `${window.location.protocol}//${window.location.hostname}:5175`;
    const url = `${menuBase}/order/${qrTable.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading tables…</div>;
  }

  return (
    <div className="space-y-5">
      {/* ── Legend + buttons ───────────────────────────── */}
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
        <div className="flex items-center gap-2">
          {isAdmin && !layoutMode && (
            <button
              onClick={() => setLayoutMode(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <LayoutGrid size={15} /> Arrange Layout
            </button>
          )}
          {isAdmin && layoutMode && (
            <button
              onClick={() => setLayoutMode(false)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X size={15} /> Done
            </button>
          )}
          {isAdmin && !layoutMode && (
            <button
              onClick={() => { setAddError(''); setAddModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} /> Add Table
            </button>
          )}
        </div>
      </div>

      {!canEdit && !layoutMode && (
        <p className="text-xs text-slate-400">View only — contact an admin or staff member to make changes</p>
      )}

      {/* ── Layout editor (admin only) ──────────────────── */}
      {layoutMode && (() => {
        const placed   = tables.filter((t) => t.x_pos != null && t.y_pos != null);
        const unplaced = tables.filter((t) => t.x_pos == null || t.y_pos == null);
        const cellMap  = Object.fromEntries(placed.map((t) => [`${t.x_pos},${t.y_pos}`, t]));

        function handleCellDrop(x, y) {
          if (!draggingId) return;
          const occupant = cellMap[`${x},${y}`];
          if (occupant && occupant.id !== draggingId) return;
          updatePosition.mutate({ id: draggingId, x, y });
          setDraggingId(null);
          setOverCell(null);
        }

        function handleUnplacedDrop() {
          if (!draggingId) return;
          updatePosition.mutate({ id: draggingId, x: null, y: null });
          setDraggingId(null);
          setOverCell(null);
        }

        return (
          <div className="space-y-4">
            {/* Unplaced strip */}
            <div
              className={`min-h-[72px] rounded-xl border-2 border-dashed p-3 transition-colors ${
                draggingId && placed.find((t) => t.id === draggingId)
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleUnplacedDrop}
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Unplaced — drag onto grid
              </p>
              <div className="flex flex-wrap gap-2">
                {unplaced.length === 0 && (
                  <span className="text-xs text-slate-400">All tables placed on the floor</span>
                )}
                {unplaced.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDraggingId(t.id)}
                    onDragEnd={() => { setDraggingId(null); setOverCell(null); }}
                    className={`flex h-14 w-14 cursor-grab flex-col items-center justify-center rounded-lg border-2 select-none active:cursor-grabbing transition-opacity
                      ${CARD_CLASSES[t.status] ?? 'border-slate-200 bg-slate-100 text-slate-600'}
                      ${draggingId === t.id ? 'opacity-40' : ''}
                    `}
                  >
                    <span className="text-lg font-bold leading-none">{t.number}</span>
                    <span className="text-[10px] opacity-60">{t.seats}p</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid canvas */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Floor layout — drag tables to arrange
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    Columns
                    <button onClick={() => changeGrid('cols', -1)} disabled={gridCols <= GRID_COLS_MIN} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30"><Minus size={12} /></button>
                    <span className="w-5 text-center font-semibold text-slate-700">{gridCols}</span>
                    <button onClick={() => changeGrid('cols', +1)} disabled={gridCols >= GRID_COLS_MAX} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30"><Plus size={12} /></button>
                  </span>
                  <span className="flex items-center gap-1.5">
                    Rows
                    <button onClick={() => changeGrid('rows', -1)} disabled={gridRows <= GRID_ROWS_MIN} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30"><Minus size={12} /></button>
                    <span className="w-5 text-center font-semibold text-slate-700">{gridRows}</span>
                    <button onClick={() => changeGrid('rows', +1)} disabled={gridRows >= GRID_ROWS_MAX} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30"><Plus size={12} /></button>
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, 64px)`,
                  gridTemplateRows: `repeat(${gridRows}, 64px)`,
                  gap: '4px',
                  width: `${gridCols * 68}px`,
                }}
              >
                {Array.from({ length: gridRows }, (_, row) =>
                  Array.from({ length: gridCols }, (_, col) => {
                    const key    = `${col},${row}`;
                    const table  = cellMap[key];
                    const isOver = overCell?.x === col && overCell?.y === row;
                    const blocked = isOver && table && table.id !== draggingId;

                    return (
                      <div
                        key={key}
                        className={`h-16 w-16 rounded-lg border-2 transition-colors
                          ${!table ? 'border-dashed border-slate-200 bg-slate-50' : 'border-transparent'}
                          ${isOver && !table ? 'border-indigo-400 bg-indigo-50' : ''}
                          ${blocked ? 'border-red-300 bg-red-50' : ''}
                        `}
                        onDragOver={(e) => { e.preventDefault(); setOverCell({ x: col, y: row }); }}
                        onDragLeave={() => setOverCell(null)}
                        onDrop={() => handleCellDrop(col, row)}
                      >
                        {table && (
                          <div
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); setDraggingId(table.id); }}
                            onDragEnd={() => { setDraggingId(null); setOverCell(null); }}
                            className={`h-full w-full flex flex-col items-center justify-center rounded-lg border-2 cursor-grab select-none active:cursor-grabbing transition-opacity
                              ${CARD_CLASSES[table.status] ?? 'border-slate-200 bg-slate-100 text-slate-600'}
                              ${draggingId === table.id ? 'opacity-40' : ''}
                            `}
                          >
                            <span className="text-lg font-bold leading-none">{table.number}</span>
                            <span className="text-[10px] opacity-60">{table.seats}p</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Normal table grid ───────────────────────────── */}
      {!layoutMode && (tables.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">
          No tables yet{isAdmin ? ' — add one to get started' : ' — contact an admin'}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
          {[...tables]
            .sort((a, b) => a.number - b.number)
            .map((t) => (
              <div key={t.id} className="group relative">
                <button
                  onClick={() => handleTableClick(t)}
                  disabled={!canEdit}
                  className={`flex w-full flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all ${
                    canEdit ? 'hover:scale-105 hover:shadow-md cursor-pointer' : 'cursor-default'
                  } ${CARD_CLASSES[t.status] ?? 'border-slate-200 bg-slate-100 text-slate-600'}`}
                >
                  <span className="text-2xl font-bold leading-none">{t.number}</span>
                  <span className="mt-1 text-[10px] font-medium capitalize leading-none">{t.status}</span>
                  <span className="mt-0.5 text-[10px] opacity-60">{t.seats}p</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleQrClick(t)}
                    title="Show QR code"
                    className="absolute right-1 top-1 rounded-md bg-white/60 p-0.5 text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors"
                  >
                    <QrCode size={12} />
                  </button>
                )}
              </div>
            ))}
        </div>
      ))}

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

      {/* ── QR Code Modal ───────────────────────────────── */}
      {qrTable && (
        <Modal title={`Table ${qrTable.number} — QR Code`} onClose={() => setQrTable(null)}>
          <p className="mb-4 text-sm text-slate-500">
            Customers scan this code to view the menu and place orders directly from their phone.
          </p>
          <div className="flex justify-center">
            {qrDataUrl
              ? <img src={qrDataUrl} alt={`QR code for table ${qrTable.number}`} className="h-56 w-56 rounded-xl" />
              : <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">Generating…</div>
            }
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopyUrl}
              className="btn-secondary flex flex-1 items-center justify-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`table-${qrTable.number}-qr.png`}
                className="btn-primary flex flex-1 items-center justify-center gap-1.5 text-center"
              >
                Download PNG
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
