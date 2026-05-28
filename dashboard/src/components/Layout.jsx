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
  FlaskConical,
  BookOpen,
  Package,
  Trash2,
  TrendingUp,
  ChefHat,
  ChevronDown,
  Layers,
  QrCode,
  MapPin,
  Tag,
  Gift,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import QRCode from 'qrcode';
import api from '../api/client';
import OfflineBanner from './OfflineBanner';
import SyncBadge from './SyncBadge';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationBell from './NotificationBell';
import Modal from './Modal';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import { useMeProfile, useSetUserPresent } from '../hooks/useUsers';
import { useSettings } from '../hooks/useSettings';

const GROUP_PATHS = {
  analytics:  ['/reports', '/history', '/waste', '/costing'],
  rms:        ['/ingredients', '/inventory', '/recipes', '/combos'],
  marketing:  ['/coupons', '/loyalty', '/reviews'],
};

const ALL_NAV = [
  { to: '/overview', label: 'Overview', Icon: LayoutDashboard, end: true, adminOnly: false },
  { to: '/menu',     label: 'Menu',     Icon: UtensilsCrossed,            adminOnly: false },
  { to: '/tables',   label: 'Tables',   Icon: Grid3X3,                    adminOnly: false },
  { to: '/orders',   label: 'Orders',   Icon: ClipboardList,              adminOnly: false },
  { to: '/shift',    label: 'Shift',    Icon: Wallet,                     adminOnly: false, staffOnly: true },
  {
    type: 'group', key: 'analytics', label: 'Analytics', Icon: BarChart2, adminOnly: true,
    children: [
      { to: '/reports',  label: 'Reports',   Icon: BarChart2  },
      { to: '/history',  label: 'History',   Icon: ScrollText },
      { to: '/waste',    label: 'Waste Log', Icon: Trash2     },
      { to: '/costing',  label: 'Costing',   Icon: TrendingUp },
    ],
  },
  {
    type: 'group', key: 'rms', label: 'Recipe Mgmt', Icon: ChefHat, adminOnly: true,
    children: [
      { to: '/ingredients', label: 'Ingredients', Icon: FlaskConical },
      { to: '/inventory',   label: 'Ledger',       Icon: Layers      },
      { to: '/recipes',     label: 'Recipes',      Icon: BookOpen    },
      { to: '/combos',      label: 'Combos',       Icon: Package     },
    ],
  },
  {
    type: 'group', key: 'marketing', label: 'Marketing', Icon: Megaphone, adminOnly: true,
    children: [
      { to: '/coupons',  label: 'Coupons',  Icon: Tag            },
      { to: '/loyalty',  label: 'Loyalty',  Icon: Gift           },
      { to: '/reviews',  label: 'Reviews',  Icon: MessageSquare  },
    ],
  },
  { to: '/users',    label: 'Users',    Icon: Users,    adminOnly: true },
  { to: '/settings', label: 'Settings', Icon: Settings, adminOnly: true },
];

const NOTIFIABLE = new Set(['NEW_ORDER', 'ORDER_READY', 'PAYMENT_COMPLETED', 'BILL_REQUESTED', 'STAFF_ASSIGNED', 'RESERVATION_REMINDER']);

function MyQRModal({ user, onClose }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!user?.staff_pin) return;
    QRCode.toDataURL(user.staff_pin, { width: 200, margin: 2 })
      .then(setQrUrl)
      .catch(() => {});
  }, [user?.staff_pin]);

  return (
    <Modal title={`My Staff QR${user?.name ? ` — ${user.name}` : ''}`} onClose={onClose}>
      {user?.staff_pin ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <p style={{ fontSize: 12, color: 'var(--mute)', textAlign: 'center' }}>
            Customers scan this QR or enter your PIN when placing an order.
          </p>
          {qrUrl && (
            <img src={qrUrl} alt="Staff QR code" style={{ width: 200, height: 200, borderRadius: 8 }} />
          )}
          <p className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.35em', color: 'var(--ink)' }}>
            {user.staff_pin}
          </p>
          {qrUrl && (
            <a
              href={qrUrl}
              download={`staff-qr-${user.email.split('@')[0]}.png`}
              className="btn-secondary"
              style={{ fontSize: 12 }}
            >
              Download QR
            </a>
          )}
        </div>
      ) : (
        <div className="py-6 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>
          No PIN assigned yet. Ask an admin to set your staff PIN.
        </div>
      )}
    </Modal>
  );
}

export default function Layout() {
  const { notifications, unreadCount, add, markAllRead, clearAll } = useNotifications();
  const { user, restaurant, isAdmin, isCashier } = useAuth();
  const { data: meProfile } = useMeProfile();
  const { data: settings } = useSettings();
  const setUserPresent = useSetUserPresent();
  const staffAssignmentEnabled = settings?.staff_assignment_enabled === 'true';

  useWebSocket({
    onEvent(event, payload) {
      if (!NOTIFIABLE.has(event)) return;
      if (event === 'BILL_REQUESTED' && !isAdmin && !isCashier) return;
      let token = null;
      if (event === 'BILL_REQUESTED') {
        token = payload?.tableNumber ? `Table ${payload.tableNumber}` : null;
      } else if (event === 'STAFF_ASSIGNED') {
        token = payload?.tableNumber ? `Table ${payload.tableNumber}` : null;
      } else if (event === 'RESERVATION_REMINDER') {
        token = payload?.guestName
          ? `${payload.guestName}${payload.tableNumber != null ? ` · T${payload.tableNumber}` : ''}`
          : null;
      } else {
        token = payload?.orderId ? `#${payload.orderId.slice(-6).toUpperCase()}` : null;
      }
      add(event, token);
    },
  });

  const navigate  = useNavigate();
  const location  = useLocation();
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showMyQR,      setShowMyQR]      = useState(false);
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(
      Object.entries(GROUP_PATHS).map(([key, paths]) => [
        key, paths.some(p => location.pathname.startsWith(p)),
      ])
    )
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const active = Object.fromEntries(
      Object.entries(GROUP_PATHS)
        .filter(([, paths]) => paths.some(p => location.pathname.startsWith(p)))
        .map(([key]) => [key, true])
    );
    if (Object.keys(active).length) setOpenGroups(prev => ({ ...prev, ...active }));
  }, [location.pathname]);

  const isKitchen = user?.role === 'kitchen';
  const nav = ALL_NAV.filter((n) => (!n.adminOnly || isAdmin) && (!n.staffOnly || !isKitchen));

  const pageLabel = (() => {
    for (const n of nav) {
      if (n.type === 'group') {
        const child = n.children.find(c => location.pathname.startsWith(c.to));
        if (child) return child.label;
      } else if (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)) {
        return n.label;
      }
    }
    return '';
  })();

  useEffect(() => {
    document.title = pageLabel ? `${pageLabel} — Cooklyt` : 'Cooklyt';
  }, [pageLabel]);

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
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
          <svg width="20" height="20" viewBox="0 0 200 200" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                  fill="none" stroke="#0d0c0b" strokeWidth="15.6" strokeLinecap="round"/>
            <circle cx="100" cy="100" r="10.8" fill="#b06a3b"/>
          </svg>
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
          {nav.map((item) => {
            if (item.type === 'group') {
              const GroupIcon = item.Icon;
              const isOpen = openGroups[item.key] ?? false;
              const groupActive = item.children.some(c => location.pathname.startsWith(c.to));
              return (
                <div key={item.key}>
                  <button
                    onClick={() => setOpenGroups(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 text-[12.5px] font-medium transition-colors duration-75"
                    style={{ height: 36, background: groupActive ? 'var(--paper-2)' : 'transparent', color: groupActive ? 'var(--ink)' : 'var(--mute)' }}
                    onMouseEnter={(e) => { if (!groupActive) { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; } }}
                    onMouseLeave={(e) => { if (!groupActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; } }}
                  >
                    <GroupIcon size={16} />
                    {item.label}
                    <ChevronDown
                      size={12}
                      className="ml-auto shrink-0"
                      style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className="mt-px flex flex-col gap-px pb-px"
                      style={{ borderLeft: '1px solid var(--line)', marginLeft: 14, paddingLeft: 6 }}
                    >
                      {item.children.map(({ to, label, Icon }) => (
                        <NavLink
                          key={to}
                          to={to}
                          className={({ isActive }) =>
                            `flex items-center gap-2 rounded-[6px] px-2.5 text-[12px] font-medium transition-colors duration-75 ${
                              isActive ? 'nav-active' : 'nav-default'
                            }`
                          }
                          style={({ isActive }) => ({
                            height: 32,
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
                            if (!location.pathname.startsWith(to)) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--mute)';
                            }
                          }}
                        >
                          <Icon size={13} />
                          {label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const { to, label, Icon, end } = item;
            return (
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
                  const active = location.pathname.startsWith(to) || (end && location.pathname === to);
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--mute)';
                  }
                }}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-2 pb-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          {!isAdmin && staffAssignmentEnabled && (
            <button
              onClick={() => setShowMyQR(true)}
              className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 text-[12px] transition-colors duration-75"
              style={{ height: 36, color: 'var(--mute)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; }}
            >
              <QrCode size={15} />
              My QR
              {meProfile?.staff_pin && (
                <span
                  className="ml-auto mono"
                  style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--ok)', fontWeight: 600 }}
                >
                  {meProfile.staff_pin}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => {
              if (meProfile?.id) {
                setUserPresent.mutate({ id: meProfile.id, isPresent: !meProfile.is_present });
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 text-[12px] transition-colors duration-75"
            style={{ height: 36, color: meProfile?.is_present ? 'var(--ok)' : 'var(--mute)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = meProfile?.is_present ? 'var(--ok)' : 'var(--mute)'; }}
          >
            <MapPin size={15} />
            {meProfile?.is_present ? 'Present' : 'Mark as Present'}
          </button>
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
                {user?.name || user?.email}
              </p>
              <p className="truncate text-[10.5px]" style={{ color: 'var(--mute)' }}>
                {user?.name ? user.email : <span className="capitalize">{user?.role}</span>}
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
      {showMyQR && (
        <MyQRModal user={meProfile} onClose={() => setShowMyQR(false)} />
      )}
    </div>
  );
}
