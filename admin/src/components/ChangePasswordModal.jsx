import { useState } from 'react';
import { X, Lock } from 'lucide-react';
import api from '../api/client';

export default function ChangePasswordModal({ onClose }) {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next !== confirm)  { setError('New passwords do not match.'); return; }
    if (next.length < 8)   { setError('New password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword:     next,
      });
      localStorage.setItem('admin_token', data.token);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  const pwdType = showPwd ? 'text' : 'password';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Change Password</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-emerald-600">Password changed successfully!</p>
            <p className="mt-1 text-xs text-slate-400">Closing…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
              <input type={pwdType} value={current} onChange={(e) => setCurrent(e.target.value)}
                className="input w-full" autoFocus required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
              <input type={pwdType} value={next} onChange={(e) => setNext(e.target.value)}
                className="input w-full" required />
              <p className="mt-1 text-[11px] text-slate-400">Minimum 8 characters</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</label>
              <input type={pwdType} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="input w-full" required />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)}
                className="rounded" />
              Show passwords
            </label>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Saving…' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
