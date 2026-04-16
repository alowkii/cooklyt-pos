import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSync } from './hooks/useSync';
import Layout   from './components/Layout';
import Login    from './pages/Login';
import Overview from './pages/Overview';
import Menu     from './pages/Menu';
import Tables   from './pages/Tables';
import Orders   from './pages/Orders';
import Reports  from './pages/Reports';
import Users    from './pages/Users';
import Settings from './pages/Settings';

function RequireAuth({ children }) {
  return localStorage.getItem('pos_token') ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
  if (!localStorage.getItem('pos_token')) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function SyncWatcher() {
  useSync();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SyncWatcher />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index          element={<Overview />} />
          <Route path="menu"    element={<Menu />} />
          <Route path="tables"  element={<Tables />} />
          <Route path="orders"  element={<Orders />} />
          <Route
            path="reports"
            element={
              <RequireAdmin>
                <Reports />
              </RequireAdmin>
            }
          />
          <Route
            path="users"
            element={
              <RequireAdmin>
                <Users />
              </RequireAdmin>
            }
          />
          <Route
            path="settings"
            element={
              <RequireAdmin>
                <Settings />
              </RequireAdmin>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
