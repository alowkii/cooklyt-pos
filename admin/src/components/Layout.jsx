import { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Shield, Building2, ScrollText, Menu, X, Settings, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ChangePasswordModal from './ChangePasswordModal';

const NAV = [
  { to: '/',           label: 'Restaurants', Icon: Building2,  end: true  },
  { to: '/audit-logs', label: 'Audit Logs',  Icon: ScrollText, end: false },
  { to: '/settings',   label: 'Settings',    Icon: Settings,   end: false },
];

export default function Layout() {
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { admin } = useAuth();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  }

  const initials = (admin?.email ?? 'OP').slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen" style={{ background: 'var(--paper-2)' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(10,10,10,.32)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col
          transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: 220,
          background: '#111110',
          borderRight: '1px solid rgba(255,255,255,.07)',
        }}
      >
        {/* Brand */}
        <div
          className="flex h-12 shrink-0 items-center justify-between px-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div style={{ width: 16, height: 16, background: '#fff', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={10} color="#111110" />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Cooklyt Admin</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', lineHeight: 1.2 }}>Operator Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex items-center justify-center rounded-md p-1 transition-colors"
            style={{ color: 'rgba(255,255,255,.4)', background: 'transparent', border: 0, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.4)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <p
            className="px-3 py-1"
            style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.3)' }}
          >
            Management
          </p>
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                background: isActive ? 'rgba(255,255,255,.1)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,.5)',
                transition: 'background .12s, color .12s',
              })}
              onMouseEnter={(e) => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,.85)';
                }
              }}
              onMouseLeave={(e) => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,.5)';
                }
              }}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 24, height: 24, background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 9, fontWeight: 700 }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>{admin?.email}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>Super Admin</p>
            </div>
          </div>
          <button
            onClick={() => setShowChangePwd(true)}
            className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 transition-colors"
            style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'transparent', border: 0, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.45)'; }}
          >
            <KeyRound size={13} />
            Change Password
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 transition-colors"
            style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'transparent', border: 0, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.45)'; }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header
          className="flex h-12 shrink-0 items-center gap-3 px-4 lg:hidden"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost btn-sm"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Cooklyt Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </div>
  );
}
