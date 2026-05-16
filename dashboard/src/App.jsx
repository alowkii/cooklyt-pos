import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSync } from './hooks/useSync';
import { useSettings } from './hooks/useSettings';
import { useTimezone } from './context/TimezoneContext';
import { useCurrency } from './context/CurrencyContext';
import Layout   from './components/Layout';
import Login          from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Landing  from './pages/Landing';
import Overview from './pages/Overview';
import Menu           from './pages/Menu';
import Tables          from './pages/Tables';
import Orders          from './pages/Orders';
import Reports         from './pages/Reports';
import Users           from './pages/Users';
import Settings        from './pages/Settings';
import OrderHistory    from './pages/OrderHistory';
import ShiftCount      from './pages/ShiftCount';
import Ingredients      from './pages/Ingredients';
import Recipes          from './pages/Recipes';
import Combos           from './pages/Combos';
import WasteLog         from './pages/WasteLog';
import CostingReports   from './pages/CostingReports';
import InventoryLedger  from './pages/InventoryLedger';

function RequireAuth({ children }) {
  return localStorage.getItem('pos_token') ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
  if (!localStorage.getItem('pos_token')) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/overview" replace />;
  return children;
}

function RequireNotKitchen({ children }) {
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
  if (user?.role === 'kitchen') return <Navigate to="/orders" replace />;
  return children;
}

function getTokenClaims() {
  const token = localStorage.getItem('pos_token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function RequirePasswordSet({ children }) {
  const claims = getTokenClaims();
  if (claims?.forcePasswordChange) return <Navigate to="/change-password" replace />;
  return children;
}

function SyncWatcher() {
  useSync();
  return null;
}

function SettingsSync() {
  const { data: settings } = useSettings();
  const { iana, setTimezone } = useTimezone();
  const { code, setCurrency } = useCurrency();

  useEffect(() => {
    if (!settings) return;
    if (settings.timezone && settings.timezone !== iana) setTimezone(settings.timezone);
    if (settings.currency && settings.currency !== code) setCurrency(settings.currency);
  }, [settings]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SyncWatcher />
      <Routes>
        <Route path="/"               element={<Landing />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />

        {/* Pathless layout route — wraps all authenticated pages */}
        <Route
          element={
            <RequireAuth>
              <RequirePasswordSet>
                <SettingsSync />
                <Layout />
              </RequirePasswordSet>
            </RequireAuth>
          }
        >
          <Route path="/overview" element={<Overview />} />
          <Route path="/menu"     element={<Menu />} />
          <Route path="/tables"   element={<Tables />} />
          <Route path="/orders"   element={<Orders />} />
          <Route path="/reports"  element={<RequireAdmin><Reports /></RequireAdmin>} />
          <Route path="/users"    element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
          <Route path="/history"  element={<RequireAdmin><OrderHistory /></RequireAdmin>} />
          <Route path="/shift"       element={<RequireNotKitchen><ShiftCount /></RequireNotKitchen>} />
          <Route path="/ingredients" element={<RequireAdmin><Ingredients /></RequireAdmin>} />
          <Route path="/inventory"   element={<RequireAdmin><InventoryLedger /></RequireAdmin>} />
          <Route path="/recipes"     element={<RequireAdmin><Recipes /></RequireAdmin>} />
          <Route path="/combos"      element={<RequireAdmin><Combos /></RequireAdmin>} />
          <Route path="/waste"       element={<RequireAdmin><WasteLog /></RequireAdmin>} />
          <Route path="/costing"     element={<RequireAdmin><CostingReports /></RequireAdmin>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
