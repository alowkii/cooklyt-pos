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
  Wallet,
} from 'lucide-react';
import OfflineBanner from './OfflineBanner';
import SyncBadge from './SyncBadge';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationBell from './NotificationBell';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';

const ALL_NAV = [
  { to: '/overview', label: 'Overview', Icon: LayoutDashboard, end: true,  adminOnly: false },
  { to: '/menu',     label: 'Menu',     Icon: UtensilsCrossed,             adminOnly: false },
  { to: '/tables',   label: 'Tables',   Icon: Grid3X3,                     adminOnly: false },
  { to: '/orders',   label: 'Orders',   Icon: ClipboardList,               adminOnly: false },
  { to: '/reports',  label: 'Reports',  Icon: BarChart2,   adminOnly: true },
  { to: '/history',  label: 'History',  Icon: ScrollText,  adminOnly: true },
  { to: '/shift',    label: 'Shift',    Icon: Wallet,      adminOnly: false, staffOnly: true },
  { to: '/users',    label: 'Users',    Icon: Users,       adminOnly: true },
  { to: '/settings', label: 'Settings', Icon: Settings,    adminOnly: true },
];

const NOTIFIABLE = new Set(['NEW_ORDER', 'ORDER_READY', 'PAYMENT_COMPLETED', 'BILL_REQUESTED']);

export default function Layout() {
  const { notifications, unreadCount, add, markAllRead, clearAll } = useNotifications();
  const { user, restaurant, isAdmin, isCashier } = useAuth();

  useWebSocket({
    onEvent(event, payload) {
      if (!NOTIFIABLE.has(event)) return;
      if (event === 'BILL_REQUESTED' && !isAdmin && !isCashier) return;
      let token = null;
      if (event === 'BILL_REQUESTED') {
        token = payload?.tableNumber ? `Table ${payload.tableNumber}` : null;
      } else {
        token = payload?.orderId ? `#${payload.orderId.slice(-6).toUpperCase()}` : null;
      }
      add(event, token);
    },
  });

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isKitchen = user?.role === 'kitchen';
  const nav = ALL_NAV.filter((n) => (!n.adminOnly || isAdmin) && (!n.staffOnly || !isKitchen));

  const pageLabel = nav.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  )?.label ?? '';

  useEffect(() => {
    document.title = pageLabel ? `${pageLabel} — Cooklyt` : 'Cooklyt';
  }, [pageLabel]);

  function logout() {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_restaurant');
    navigate('/login');
  }

  const initials = (user?.email ?? 'CK').slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen" style={{ background: 'var(--paper)' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col
          transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--paper)', borderRight: '1px solid var(--line)' }}
      >
        {/* Brand */}
        <div
          className="flex h-12 items-center gap-2.5 px-4 shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <span
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-[11px] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
          >
            C
          </span>
          <span className="truncate text-[12px] font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}>
            {restaurant?.name || 'Cooklyt'}
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-md p-1 lg:hidden"
            style={{ color: 'var(--mute)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-px px-2 py-3 overflow-y-auto">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-[6px] px-2.5 text-[12.5px] font-medium transition-colors duration-75 ${
                  isActive ? 'nav-active' : 'nav-default'
                }`
              }
              style={({ isActive }) => ({
                height: 36,
                background: isActive ? 'var(--paper-2)' : 'transparent',
                color: isActive ? 'var(--ink)' : 'var(--mute)',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('nav-active')) {
                  e.currentTarget.style.background = 'var(--hover)';
                  e.currentTarget.style.color = 'var(--ink)';
                }
              }}
              onMouseLeave={(e) => {
                const isActive = location.pathname.startsWith(to) ||
                  (end && location.pathname === to);
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--mute)';
                }
              }}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-2 pb-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={() => setShowChangePwd(true)}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 text-[12px] transition-colors duration-75"
            style={{ height: 36, color: 'var(--mute)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; }}
          >
            <KeyRound size={15} />
            Change Password
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 text-[12px] transition-colors duration-75"
            style={{ height: 36, color: 'var(--mute)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; }}
          >
            <LogOut size={15} />
            Sign out
          </button>

          <div className="mt-2 flex items-center gap-2 px-2.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
              style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-medium" style={{ color: 'var(--ink)' }}>
                {user?.email}
              </p>
              <p className="text-[10.5px] capitalize" style={{ color: 'var(--mute)' }}>
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OfflineBanner />

        {/* Topbar */}
        <header
          className="flex h-12 shrink-0 items-center gap-3 px-5"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 lg:hidden"
            style={{ color: 'var(--mute)' }}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            {pageLabel}
          </span>
          {restaurant?.name && (
            <span className="hidden text-[12px] sm:block" style={{ color: 'var(--mute)' }}>
              · {restaurant.name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <SyncBadge />
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onOpen={markAllRead}
              onClear={clearAll}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <Outlet />
        </main>
      </div>

      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </div>
  );
}
