import { useState, useMemo, useRef } from 'react';
import { Download, Lock, TriangleAlert } from 'lucide-react';
import { useAuditLogs, useRestaurants } from '../hooks/useAdmin';
import api from '../api/client';

function exportCsv(logs) {
  const cols = ['timestamp', 'actor', 'actor_type', 'restaurant', 'restaurant_id', 'action', 'resource_type', 'resource_id', 'description'];
  const esc  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = logs.map((l) => [
    new Date(l.created_at).toISOString(),
    l.actor_email || l.actor_id,
    l.actor_type,
    l.restaurant_name || '',
    l.restaurant_id || '',
    l.action,
    l.resource_type,
    l.resource_id || '',
    l.description,
  ].map(esc).join(','));

  const csv  = [cols.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ACTION_COLORS = {
  create:      'text-emerald-600',
  update:      'text-blue-600',
  delete:      'text-red-500',
  payment:     'text-violet-600',
  login:       'text-slate-500',
  export:      'text-amber-600',
  login_failed:'text-red-400',
};

const RESOURCE_LABELS = {
  restaurant:  'Restaurant',
  user:        'User',
  setting:     'Setting',
  order:       'Order',
  menu_item:   'Menu Item',
  payment:     'Payment',
  super_admin: 'Operator',
  audit_log:   'Audit Log',
};

const RESOURCE_TYPES = Object.keys(RESOURCE_LABELS);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Password confirmation modal ───────────────────────────────────────────────

function PasswordModal({ context, onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-password', { password, context });
      onConfirm();
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect password');
      setPassword('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <Lock size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Confirm your identity</p>
            <p className="text-xs text-slate-400">Enter your password to export audit logs</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            required
          />

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying…' : 'Export'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditLogs() {
  const t = todayStr();
  const [restaurantId,  setRestaurantId]  = useState('');
  const [from,          setFrom]          = useState(shiftDate(t, -6));
  const [to,            setTo]            = useState(t);
  const [resourceType,  setResourceType]  = useState('');
  const [limit,         setLimit]         = useState(500);
  const [showPwModal,   setShowPwModal]   = useState(false);

  const { data: restaurants = [] } = useRestaurants();
  const { data: logs = [], isLoading, isError, refetch } = useAuditLogs({
    restaurantId: restaurantId || undefined,
    from,
    to,
    resourceType: resourceType || undefined,
    limit,
  });

  const atCap = logs.length >= limit;

  // Human-readable context string sent to backend so it gets logged
  const exportContext = useMemo(() => {
    const parts = [];
    if (from || to) parts.push(`${from} → ${to}`);
    if (restaurantId) {
      const r = restaurants.find((r) => r.id === restaurantId);
      parts.push(r ? r.name : restaurantId);
    }
    if (resourceType) parts.push(RESOURCE_LABELS[resourceType] ?? resourceType);
    return parts.join(', ') || 'all';
  }, [from, to, restaurantId, resourceType, restaurants]);

  function handleExportConfirmed() {
    setShowPwModal(false);
    exportCsv(logs);
  }

  return (
    <div className="space-y-6">
      {showPwModal && (
        <PasswordModal
          context={exportContext}
          onConfirm={handleExportConfirmed}
          onCancel={() => setShowPwModal(false)}
        />
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-400 mt-0.5">Every mutation across all restaurants</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Restaurant</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none bg-white"
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
          >
            <option value="">All restaurants</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
            value={to}
            min={from}
            max={t}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Resource</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none bg-white"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
          >
            <option value="">All types</option>
            {RESOURCE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{RESOURCE_LABELS[rt]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Show</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none bg-white"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[100, 250, 500, 1000, 2000].map((n) => (
              <option key={n} value={n}>{n} records</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>

        <span className="text-xs text-slate-400 self-end pb-2">
          {logs.length} event{logs.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={() => setShowPwModal(true)}
          disabled={logs.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {atCap && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <TriangleAlert size={15} className="shrink-0" />
          Showing the first {limit} records — results may be truncated. Increase the limit or narrow your filters to see all events.
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <div className="grid grid-cols-[160px_180px_140px_100px_1fr] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400 min-w-[700px]">
          <span>Time</span>
          <span>Actor</span>
          <span>Restaurant</span>
          <span>Resource</span>
          <span>Event</span>
        </div>

        {isLoading && (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        )}
        {isError && (
          <p className="p-8 text-center text-sm text-red-500">Failed to load audit logs.</p>
        )}
        {!isLoading && !isError && logs.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-400">No events in this period.</p>
        )}

        {!isLoading && logs.map((log) => (
          <div
            key={log.id}
            className="grid grid-cols-[160px_180px_140px_100px_1fr] gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors text-sm min-w-[700px]"
          >
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {new Date(log.created_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </span>

            <span className="text-slate-600 truncate" title={log.actor_email || log.actor_id}>
              <span className="text-xs font-mono text-slate-400 mr-1">
                {log.actor_type === 'super_admin' ? '★' : '·'}
              </span>
              {log.actor_email || log.actor_id?.slice(0, 8)}
            </span>

            <span className="flex flex-col min-w-0" title={log.restaurant_id || ''}>
              {log.restaurant_name
                ? <span className="text-slate-600 text-xs truncate">{log.restaurant_name}</span>
                : log.restaurant_id
                  ? <span className="italic text-slate-300 text-xs">deleted</span>
                  : null
              }
              {log.restaurant_id && (
                <span className="font-mono text-[10px] text-slate-300 truncate">
                  {log.restaurant_id}
                </span>
              )}
            </span>

            <span className="text-xs">
              <span className={`font-semibold ${ACTION_COLORS[log.action] ?? 'text-slate-500'}`}>
                {log.action}
              </span>
              {' '}
              <span className="text-slate-400">{RESOURCE_LABELS[log.resource_type] ?? log.resource_type}</span>
            </span>

            <span className="text-slate-700 text-xs">{log.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
