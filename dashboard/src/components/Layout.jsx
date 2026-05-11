import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ClipboardList,
  BarChart2,
  Users,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  KeyRound,
} from 'lucide-react';
import OfflineBanner from './OfflineBanner';
import SyncBadge from './SyncBadge';
import ChangePasswordModal from './ChangePasswordModal';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';

const ALL_NAV = [
  { to: '/',        label: 'Overview', Icon: LayoutDashboard, end: true,  adminOnly: false },
  { to: '/menu',    label: 'Menu',     Icon: UtensilsCrossed,             adminOnly: false },
  { to: '/tables',  label: 'Tables',   Icon: Grid3X3,                     adminOnly: false },
  { to: '/orders',  label: 'Orders',   Icon: ClipboardList,               adminOnly: false },
  { to: '/reports',  label: 'Reports',  Icon: BarChart2,   adminOnly: true },
  { to: '/history',  label: 'History',  Icon: ScrollText,  adminOnly: true },
  { to: '/users',    label: 'Users',    Icon: Users,       adminOnly: true },
  { to: '/settings', label: 'Settings', Icon: Settings,    adminOnly: true },
];

export default function Layout() {
  useWebSocket();

  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [showChangePwd,  setShowChangePwd]  = useState(false);
  const navigate      = useNavigate();
  const location      = useLocation();
  const { user, restaurant, isAdmin } = useAuth();

  // Close sidebar on route change (mobile nav tap)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const nav = ALL_NAV.filter((n) => !n.adminOnly || isAdmin);

  const pageLabel = nav.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  )?.label ?? '';

  function logout() {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_restaurant');
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-slate-800 text-white
          transition-transform duration-200 ease-in-out
          lg:relative lg:w-56 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-700">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight leading-tight">Cooklyt</p>
            {restaurant?.name && (
              <p className="text-xs text-slate-400 truncate max-w-[160px]">{restaurant.name}</p>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-2 flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 px-4 py-4 space-y-1">
          <div className="px-3 pb-1">
            <p className="truncate text-xs text-slate-400">{user.email}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <button
            onClick={() => setShowChangePwd(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <KeyRound size={15} />
            Change Password
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OfflineBanner />

        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-sm font-semibold text-slate-700">{pageLabel}</h1>
          <div className="ml-auto">
            <SyncBadge />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </div>
  );
}
