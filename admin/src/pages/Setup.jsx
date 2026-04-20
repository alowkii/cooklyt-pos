import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Setup() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/setup', form);
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6">
          <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 mb-3">
            First-run setup
          </span>
          <h1 className="text-2xl font-bold text-slate-800">Create operator account</h1>
          <p className="mt-1 text-sm text-slate-500">
            This page is only available once. Store these credentials safely.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input"
              placeholder="ops@krilok.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input"
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Creating…' : 'Create operator account'}
          </button>
        </form>
      </div>
    </div>
  );
}
