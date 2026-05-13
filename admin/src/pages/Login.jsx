import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user',  JSON.stringify(data.admin));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-8"
      style={{ background: 'var(--paper-2)' }}
    >
      <div className="w-full max-w-sm">

        {/* Brand mark — above the card */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div
            className="mb-4 flex items-center justify-center"
            style={{ width: 46, height: 46, background: 'var(--ink)', borderRadius: 11 }}
          >
            <Shield size={20} color="var(--accent-on)" strokeWidth={1.75} />
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>
            Cooklyt Admin
          </h1>
          <span
            style={{
              display: 'inline-block',
              fontSize: 10, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase',
              color: 'var(--mute)', background: 'var(--line-2)',
              borderRadius: 4, padding: '2px 8px',
            }}
          >
            Internal · Restricted Access
          </span>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line-2)',
            borderRadius: 10,
            padding: '28px 28px 24px',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', marginBottom: 5 }}
              >
                Operator email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="ops@cooklyt.com"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', marginBottom: 5 }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 36 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                    color: 'var(--mute-2)', display: 'flex', borderRadius: 4,
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                style={{
                  margin: 0, fontSize: 12, color: 'var(--bad)',
                  background: 'rgba(179,55,43,.06)', borderRadius: 6, padding: '8px 12px',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', height: 38, justifyContent: 'center', marginTop: 2 }}
            >
              {loading
                ? <><Loader2 size={13} className="animate-spin" /> Signing in…</>
                : 'Sign in'}
            </button>

          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11.5, color: 'var(--mute-2)' }}>
          Access is restricted to authorised operators only.
        </p>

      </div>
    </div>
  );
}
