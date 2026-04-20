import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ restaurantName: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      localStorage.setItem('pos_token',      data.token);
      localStorage.setItem('pos_user',       JSON.stringify(data.user));
      localStorage.setItem('pos_restaurant', JSON.stringify(data.restaurant));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Create account</h1>
          <p className="mt-1 text-sm text-slate-500">Set up your restaurant on Krilok POS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Restaurant name
            </label>
            <input
              type="text"
              value={form.restaurantName}
              onChange={set('restaurantName')}
              className="input"
              placeholder="The Grand Cafe"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="input"
              placeholder="owner@example.com"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
