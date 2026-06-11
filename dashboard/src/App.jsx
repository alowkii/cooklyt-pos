import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useSync } from './hooks/useSync';
import { useSettings } from './hooks/useSettings';
import { useTimezone } from './context/TimezoneContext';
import { useCurrency } from './context/CurrencyContext';
import Landing from './pages/Landing';
import Login   from './pages/Login';

// Everything behind auth is code-split so visitors landing on "/" only download the landing page
const Layout          = lazy(() => import('./components/Layout'));
const ChangePassword  = lazy(() => import('./pages/ChangePassword'));
const VerifyEmail     = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword   = lazy(() => import('./pages/ResetPassword'));
const SetPassword     = lazy(() => import('./pages/SetPassword'));
const OAuthCallback   = lazy(() => import('./pages/OAuthCallback'));
const Overview        = lazy(() => import('./pages/Overview'));
const Menu            = lazy(() => import('./pages/Menu'));
const Tables          = lazy(() => import('./pages/Tables'));
const Orders          = lazy(() => import('./pages/Orders'));
const Reports         = lazy(() => import('./pages/Reports'));
const Users           = lazy(() => import('./pages/Users'));
const Settings        = lazy(() => import('./pages/Settings'));
const OrderHistory    = lazy(() => import('./pages/OrderHistory'));
const ShiftCount      = lazy(() => import('./pages/ShiftCount'));
const ShiftHistory    = lazy(() => import('./pages/ShiftHistory'));
const Ingredients     = lazy(() => import('./pages/Ingredients'));
const Recipes         = lazy(() => import('./pages/Recipes'));
const Combos          = lazy(() => import('./pages/Combos'));
const WasteLog        = lazy(() => import('./pages/WasteLog'));
const CostingReports  = lazy(() => import('./pages/CostingReports'));
const InventoryLedger = lazy(() => import('./pages/InventoryLedger'));
const Reservations    = lazy(() => import('./pages/Reservations'));
const Coupons         = lazy(() => import('./pages/Coupons'));
const Loyalty         = lazy(() => import('./pages/Loyalty'));
const Reviews         = lazy(() => import('./pages/Reviews'));

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
      <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--paper)' }} />}>
        <Routes>
          <Route path="/"               element={<Landing />} />
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
      </Suspense>
    </BrowserRouter>
  );
}
