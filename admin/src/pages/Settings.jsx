import { useState, useEffect } from 'react';
import { User, Lock, Globe, KeyRound, Check, AlertCircle, Building2 } from 'lucide-react';
import { useMe, useChangePassword, useUpdateDefaults } from '../hooks/useAdmin';
import SETTINGS_OPTIONS from '../../../shared/settings-options.json';

const TIMEZONES  = SETTINGS_OPTIONS.timezones;
const CURRENCIES = SETTINGS_OPTIONS.currencies;

export default function Settings() {
  const { data: me, isLoading } = useMe();
  const changePassword  = useChangePassword();
  const updateDefaults  = useUpdateDefaults();

  // ── Change password form ──────────────────────────────────────────────────
  const [current,   setCurrent]   = useState('');
  const [next,      setNext]      = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [pwdError,  setPwdError]  = useState('');
  const [pwdSaved,  setPwdSaved]  = useState(false);

  async function handleChangePwd(e) {
    e.preventDefault();
    setPwdError('');
    setPwdSaved(false);
    if (next !== confirm) { setPwdError('New passwords do not match.'); return; }
    if (next.length < 8)  { setPwdError('New password must be at least 8 characters.'); return; }
    try {
      const data = await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      localStorage.setItem('admin_token', data.token);
      setPwdSaved(true);
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(() => setPwdSaved(false), 3000);
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Failed to change password.');
    }
  }

  // ── New-restaurant defaults (DB-persisted) ────────────────────────────────
  const serverDefaults = me?.defaults || {};
  const [defTz,  setDefTz]  = useState('UTC');
  const [defCur, setDefCur] = useState('USD');
  const [defTax, setDefTax] = useState('0');
  const [defSC,  setDefSC]  = useState('0');
  const [defSaved, setDefSaved] = useState(false);
  const [defError, setDefError] = useState('');

  // Sync local state once server data loads
  useEffect(() => {
    if (!me) return;
    setDefTz(serverDefaults.timezone       || 'UTC');
    setDefCur(serverDefaults.currency      || 'USD');
    setDefTax(serverDefaults.tax_rate      || '0');
    setDefSC(serverDefaults.service_charge || '0');
  }, [me]);

  async function saveDefaults() {
    setDefError('');
    try {
      await updateDefaults.mutateAsync({ timezone: defTz, currency: defCur, tax_rate: defTax, service_charge: defSC });
      setDefSaved(true);
      setTimeout(() => setDefSaved(false), 2500);
    } catch (err) {
      setDefError(err.response?.data?.error || 'Failed to save defaults.');
    }
  }

  const pwdType = showPwd ? 'text' : 'password';

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Profile ── */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <User size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">My Account</h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{me?.email}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Member since</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {me?.createdAt
                    ? new Date(me.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Role</p>
                <span className="mt-0.5 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  Super Admin
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Change password ── */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Lock size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Security</h2>
        </div>
        <form onSubmit={handleChangePwd} className="px-6 py-5 space-y-4">
          {pwdError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle size={14} className="shrink-0" /> {pwdError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
              <input type={pwdType} value={current} onChange={(e) => setCurrent(e.target.value)}
                className="input w-full" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
              <input type={pwdType} value={next} onChange={(e) => setNext(e.target.value)}
                className="input w-full" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</label>
              <input type={pwdType} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="input w-full" required />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)}
                className="rounded" />
              Show passwords
            </label>
            <p className="text-[11px] text-slate-400">Minimum 8 characters</p>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={changePassword.isPending}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
              <KeyRound size={14} />
              {changePassword.isPending ? 'Saving…' : 'Change Password'}
            </button>
            {pwdSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check size={13} /> Password updated
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── New-restaurant defaults ── */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Building2 size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">New Restaurant Defaults</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          <p className="text-xs text-slate-400">
            These values are pre-filled when you create a new restaurant. They can be overridden
            per restaurant from the restaurant detail page.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Default Timezone</label>
              <select value={defTz} onChange={(e) => setDefTz(e.target.value)} className="input w-full">
                {TIMEZONES.map((t) => (
                  <option key={t.iana} value={t.iana}>{t.label} ({t.offset})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Default Currency</label>
              <select value={defCur} onChange={(e) => setDefCur(e.target.value)} className="input w-full">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Default Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={defTax}
                onChange={(e) => setDefTax(e.target.value)} className="input w-full" placeholder="0" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Default Service Charge (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={defSC}
                onChange={(e) => setDefSC(e.target.value)} className="input w-full" placeholder="0" />
            </div>
          </div>

          {defError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle size={14} className="shrink-0" /> {defError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={saveDefaults} disabled={updateDefaults.isPending}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
              <Globe size={14} /> {updateDefaults.isPending ? 'Saving…' : 'Save Defaults'}
            </button>
            {defSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check size={13} /> Saved
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
