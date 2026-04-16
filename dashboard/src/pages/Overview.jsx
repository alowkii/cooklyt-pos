import { TrendingUp, ShoppingBag, Users, ChefHat } from 'lucide-react';
import { useDailyReport } from '../hooks/useReports';
import { useTables } from '../hooks/useTables';
import { useActiveOrders, useKitchenQueue } from '../hooks/useOrders';
import { useCurrency } from '../context/CurrencyContext';

const STATUS_CLASSES = {
  available: 'bg-emerald-100 text-emerald-700',
  occupied:  'bg-red-100 text-red-700',
  reserved:  'bg-amber-100 text-amber-700',
  cleaning:  'bg-blue-100 text-blue-700',
};

function StatCard({ label, value, sub, Icon, accent }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function Overview() {
  const today = new Date().toISOString().split('T')[0];

  const { data: report }        = useDailyReport(today);
  const { data: tables = [] }   = useTables();
  const { data: orders = [] }   = useActiveOrders();
  const { data: queue  = [] }   = useKitchenQueue();
  const { format }              = useCurrency();

  const revenue      = report?.summary?.total_revenue ?? null;
  const orderCount   = report?.summary?.total_orders  ?? null;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue Today"
          value={revenue !== null ? format(revenue) : '—'}
          Icon={TrendingUp}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Orders Today"
          value={orderCount ?? '—'}
          Icon={ShoppingBag}
          accent="bg-indigo-500"
        />
        <StatCard
          label="Occupied Tables"
          value={`${occupiedCount} / ${tables.length}`}
          Icon={Users}
          accent="bg-amber-500"
        />
        <StatCard
          label="Kitchen Queue"
          value={queue.length}
          sub="items pending"
          Icon={ChefHat}
          accent="bg-rose-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table status grid */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Tables</h2>
          {tables.length === 0 ? (
            <p className="text-sm text-slate-400">No tables found</p>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {[...tables].sort((a, b) => a.number - b.number).map((t) => (
                <div
                  key={t.id}
                  className={`flex flex-col items-center justify-center rounded-lg py-2 text-xs font-medium ${
                    STATUS_CLASSES[t.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span className="text-lg font-bold leading-none">{t.number}</span>
                  <span className="mt-0.5 capitalize">{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active orders */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Active Orders
            {orders.length > 0 && (
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                {orders.length}
              </span>
            )}
          </h2>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-400">No active orders right now</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 7).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      Table {order.table_number}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {timeAgo(order.created_at)}
                  </span>
                </div>
              ))}
              {orders.length > 7 && (
                <p className="pt-1 text-center text-xs text-slate-400">
                  +{orders.length - 7} more — see Orders page
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}