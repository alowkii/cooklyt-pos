import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout          from './components/Layout';
import Login           from './pages/Login';
import Setup           from './pages/Setup';
import Restaurants     from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';

function RequireAuth({ children }) {
  return localStorage.getItem('admin_token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />

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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
