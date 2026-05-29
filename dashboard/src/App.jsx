import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSync } from './hooks/useSync';
import { useSettings } from './hooks/useSettings';
import { useTimezone } from './context/TimezoneContext';
import { useCurrency } from './context/CurrencyContext';
import Layout   from './components/Layout';
import Login          from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import VerifyEmail    from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import SetPassword    from './pages/SetPassword';
import OAuthCallback  from './pages/OAuthCallback';
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
import ShiftHistory    from './pages/ShiftHistory';
import Ingredients      from './pages/Ingredients';
import Recipes          from './pages/Recipes';
import Combos           from './pages/Combos';
import WasteLog         from './pages/WasteLog';
import CostingReports   from './pages/CostingReports';
import InventoryLedger  from './pages/InventoryLedger';
import Reservations     from './pages/Reservations';
import Coupons          from './pages/Coupons';
import Loyalty          from './pages/Loyalty';
import Reviews          from './pages/Reviews';

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('pos_user') || 'null'); } catch { return null; }
}

function RequireAuth({ children }) {
  return getStoredUser() ? children : <Navigate to="/login" replace />;
}

function RequireGuest({ children }) {
  return getStoredUser() ? <Navigate to="/overview" replace /> : children;
}

function RequireAdmin({ children }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/overview" replace />;
  return children;
}

function RequireNotKitchen({ children }) {
  const user = getStoredUser();
  if (user?.role === 'kitchen') return <Navigate to="/orders" replace />;
  return children;
}

function RequirePasswordSet({ children }) {
  const user = getStoredUser();
  if (user?.forcePasswordChange) return <Navigate to="/change-password" replace />;
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
  }, [settings, iana, code, setTimezone, setCurrency]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SyncWatcher />
      <Routes>
        <Route path="/"               element={<RequireGuest><Landing /></RequireGuest>} />
        <Route path="/login"           element={<RequireGuest><Login /></RequireGuest>} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />
        <Route path="/reset-password"  element={<RequireGuest><ResetPassword /></RequireGuest>} />
        <Route path="/set-password"    element={<SetPassword />} />
        <Route path="/oauth/callback"  element={<OAuthCallback />} />

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
          <Route path="/tables"            element={<Tables />} />
          <Route path="/tables/reservations" element={<RequireAdmin><Reservations /></RequireAdmin>} />
          <Route path="/orders"   element={<Orders />} />
          <Route path="/reports"  element={<RequireAdmin><Reports /></RequireAdmin>} />
          <Route path="/users"    element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
          <Route path="/history"  element={<RequireNotKitchen><OrderHistory /></RequireNotKitchen>} />
          <Route path="/shift"         element={<RequireNotKitchen><ShiftCount /></RequireNotKitchen>} />
          <Route path="/shift/history" element={<RequireAdmin><ShiftHistory /></RequireAdmin>} />
          <Route path="/ingredients" element={<RequireAdmin><Ingredients /></RequireAdmin>} />
          <Route path="/inventory"   element={<RequireAdmin><InventoryLedger /></RequireAdmin>} />
          <Route path="/recipes"     element={<RequireAdmin><Recipes /></RequireAdmin>} />
          <Route path="/combos"      element={<RequireAdmin><Combos /></RequireAdmin>} />
          <Route path="/waste"       element={<RequireAdmin><WasteLog /></RequireAdmin>} />
          <Route path="/costing"     element={<RequireAdmin><CostingReports /></RequireAdmin>} />
          <Route path="/coupons"     element={<RequireAdmin><Coupons /></RequireAdmin>} />
          <Route path="/loyalty"     element={<RequireAdmin><Loyalty /></RequireAdmin>} />
          <Route path="/reviews"     element={<RequireAdmin><Reviews /></RequireAdmin>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
