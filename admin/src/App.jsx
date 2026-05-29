import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout           from './components/Layout';
import Login            from './pages/Login';
import Setup            from './pages/Setup';
import OAuthCallback    from './pages/OAuthCallback';
import Restaurants      from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';
import UsersPage        from './pages/Users';
import AuditLogs        from './pages/AuditLogs';
import Settings         from './pages/Settings';

function RequireAuth({ children }) {
  return localStorage.getItem('admin_user') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"          element={<Login />} />
        <Route path="/setup"          element={<Setup />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Restaurants />} />
          <Route path="restaurants/:id" element={<RestaurantDetail />} />
          <Route path="users"      element={<UsersPage />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings"   element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
