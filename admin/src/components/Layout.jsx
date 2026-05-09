import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { LogOut, Shield, Building2, ScrollText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const navigate = useNavigate();
  const { admin } = useAuth();

  function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-white">
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-700">
          <Shield size={18} className="text-violet-400" />
          <div>
            <p className="text-sm font-bold leading-tight">Krilok Admin</p>
            <p className="text-xs text-slate-400">Operator Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Management
          </p>
          {[
            { to: '/',           label: 'Restaurants', Icon: Building2,  end: true },
            { to: '/audit-logs', label: 'Audit Logs',  Icon: ScrollText, end: false },
          ].map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 px-4 py-4 space-y-1">
          <p className="px-3 text-xs text-slate-500 truncate">{admin.email}</p>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
