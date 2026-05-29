import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import api from '../api/client';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL        = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams]  = useSearchParams();
  const oauthError      = searchParams.get('oauthError');
  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('pos_user',       JSON.stringify(data.user));
      localStorage.setItem('pos_restaurant', JSON.stringify(data.restaurant));
      if (data.user.forcePasswordChange) {
        navigate('/change-password');
        return;
      }
      navigate('/overview');
    } catch (err) {
      if (err.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
      } else {
        setError(err.response?.data?.error || 'Login failed. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: form.email });
      setResendSent(true);
    } catch {
      // silent — always shows success message for security
      setResendSent(true);
    } finally {
      setResendLoading(false);
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
          <Link to="/" className="flex flex-col items-center" style={{ textDecoration: 'none' }}>
            <svg width="52" height="52" viewBox="0 0 200 200" fill="none" role="img" aria-label="CookLyt" style={{ marginBottom: 14 }}>
              <path d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                    fill="none" stroke="#0d0c0b" strokeWidth="15.6" strokeLinecap="round"/>
              <circle cx="100" cy="100" r="10.8" fill="#b06a3b"/>
            </svg>
            <svg width="158" height="28" viewBox="0 0 360 64" role="img" aria-label="CookLyt" style={{ marginBottom: 10 }}>
              <text x="0" y="49" fill="#0d0c0b" style={{ fontFamily: "'Marcellus', serif", fontSize: 56, letterSpacing: '10.08px' }}>COOKLY</text>
              <circle cx="294.2" cy="29.43" r="5.03" fill="#b06a3b"/>
              <text x="309.33" y="49" fill="#0d0c0b" style={{ fontFamily: "'Marcellus', serif", fontSize: 56, letterSpacing: '10.08px' }}>T</text>
            </svg>
          </Link>
          <p style={{ fontSize: 12.5, color: 'var(--mute)', margin: 0 }}>
            Sign in to your restaurant dashboard
          </p>
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
          {unverified ? (
            <div className="space-y-4">
              <div
                className="flex items-start gap-3 rounded-md px-3 py-3"
                style={{ background: 'rgba(176,106,59,.08)', border: '1px solid rgba(176,106,59,.2)' }}
              >
                <Mail size={16} style={{ color: '#b06a3b', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Email not verified</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--mute)' }}>
                    Check your inbox for a verification link, or request a new one.
                  </p>
                </div>
              </div>

              {resendSent ? (
                <p style={{ fontSize: 12, color: 'var(--ok)', margin: 0 }}>
                  ✓ A new verification email is on its way to <strong>{form.email}</strong>.
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="btn-primary"
                  style={{ width: '100%', height: 38, justifyContent: 'center' }}
                >
                  {resendLoading
                    ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                    : 'Resend verification email'}
                </button>
              )}

              <button
                onClick={() => { setUnverified(false); setResendSent(false); }}
                className="btn-secondary"
                style={{ width: '100%', height: 38, justifyContent: 'center' }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label
                  htmlFor="email"
                  style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', marginBottom: 5 }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="you@restaurant.com"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                  <label
                    htmlFor="password"
                    style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mute)' }}
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: 11.5, color: 'var(--mute)', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
                  >
                    Forgot password?
                  </Link>
                </div>
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

              {GOOGLE_ENABLED && (
                <>
                  <div className="flex items-center gap-3" style={{ margin: '4px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                    <span style={{ fontSize: 11, color: 'var(--mute-2)' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  </div>
                  <a
                    href={`${API_URL}/api/auth/google`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      width: '100%', height: 38, borderRadius: 6, fontSize: 13, fontWeight: 500,
                      border: '1px solid var(--line-2)', color: 'var(--ink)', textDecoration: 'none',
                      background: 'var(--paper)', transition: 'background .08s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--paper)')}
                  >
                    <svg width="16" height="16" viewBox="0 0 48 48">
                      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                      <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
                      <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.4-5l-6.7-5.5C29.6 37 26.9 38 24 38c-5.1 0-9.4-3.4-10.9-8l-7 5.4C9.6 41.7 16.3 46 24 46z"/>
                      <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.6 2.8-2.3 5.1-4.7 6.6l6.7 5.5C42.1 36.8 45 31 45 24c0-1.3-.2-2.7-.5-4z"/>
                    </svg>
                    Sign in with Google
                  </a>
                </>
              )}

            </form>
          )}
        </div>

        {oauthError && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--bad)' }}>
            {decodeURIComponent(oauthError)}
          </p>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11.5, color: 'var(--mute-2)' }}>
          Can't log in? Contact your administrator.
        </p>

      </div>
    </div>
  );
}
