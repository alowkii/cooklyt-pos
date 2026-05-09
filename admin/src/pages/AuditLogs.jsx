import { useState, useMemo } from 'react';
import { useAuditLogs } from '../hooks/useAdmin';
import { useRestaurants } from '../hooks/useAdmin';

const ACTION_COLORS = {
  create:  'text-emerald-600',
  update:  'text-blue-600',
  delete:  'text-red-500',
  payment: 'text-violet-600',
  login:   'text-slate-500',
};

const RESOURCE_LABELS = {
  restaurant: 'Restaurant',
  user:       'User',
  setting:    'Setting',
  order:      'Order',
  menu_item:  'Menu Item',
  payment:    'Payment',
  super_admin:'Operator',
};

const RESOURCE_TYPES = Object.keys(RESOURCE_LABELS);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AuditLogs() {
  const t = today();
  const [restaurantId,  setRestaurantId]  = useState('');
  const [from,          setFrom]          = useState(shiftDate(t, -6));
  const [to,            setTo]            = useState(t);
  const [resourceType,  setResourceType]  = useState('');

  const { data: restaurants = [] } = useRestaurants();
  const { data: logs = [], isLoading, isError, refetch } = useAuditLogs({
    restaurantId: restaurantId || undefined,
    from,
    to,
    resourceType: resourceType || undefined,
  });

  const actorGroups = useMemo(() => {
    const counts = {};
    for (const l of logs) {
      const k = l.actor_email || l.actor_id;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [logs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-400 mt-0.5">Every mutation across all restaurants</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
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
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{RESOURCE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>

        <span className="ml-auto text-xs text-slate-400 self-end pb-2">
          {logs.length} event{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[160px_180px_140px_100px_1fr] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
            className="grid grid-cols-[160px_180px_140px_100px_1fr] gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors text-sm"
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

            <span className="text-slate-500 truncate text-xs">
              {log.restaurant_name || <span className="italic text-slate-300">—</span>}
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
