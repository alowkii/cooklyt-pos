import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('pos_token',      data.token);
      localStorage.setItem('pos_user',       JSON.stringify(data.user));
      localStorage.setItem('pos_restaurant', JSON.stringify(data.restaurant));
      if (data.user.forcePasswordChange) {
        navigate('/change-password');
        return;
      }
      navigate('/overview');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ background: 'var(--paper-2)' }}
    >
      <div
        className="w-full max-w-sm p-6 sm:p-8"
        style={{ background: 'var(--paper)', border: '1px solid var(--line-2)', borderRadius: 8 }}
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div style={{ width: 18, height: 18, background: 'var(--ink)', borderRadius: 4, flexShrink: 0 }} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Cooklyt</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 4 }}>Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input"
              placeholder="admin@example.com"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p
              className="rounded-[6px] px-3 py-2"
              style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)' }}
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
