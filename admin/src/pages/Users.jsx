import { useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSuperAdmins, useCreateSuperAdmin, useDeleteSuperAdmin } from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function ConfirmDeleteModal({ admin, onConfirm, onClose, isPending }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,10,10,.45)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--paper)', border: '1px solid var(--line-2)',
          borderRadius: 10, padding: 24, maxWidth: 360, width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Remove operator?</p>
        <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 20 }}>
          <strong style={{ color: 'var(--ink)' }}>{admin.email}</strong> will immediately lose access to the admin panel.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-[6px] px-4 py-2 disabled:opacity-60"
            style={{ fontSize: 13, fontWeight: 500, background: 'var(--bad)', color: '#fff', border: 0, cursor: 'pointer' }}
          >
            {isPending ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAdminModal({ onClose }) {
  const createAdmin = useCreateSuperAdmin();
  const [form,      setForm]     = useState({ email: '', password: '' });
  const [showPass,  setShowPass] = useState(false);
  const [error,     setError]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await createAdmin.mutateAsync(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create operator.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,10,10,.45)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--paper)', border: '1px solid var(--line-2)',
          borderRadius: 10, padding: 24, maxWidth: 380, width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Add operator</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--mute)', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input"
              placeholder="operator@cooklyt.com"
              autoFocus
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--mute)', marginBottom: 5 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input"
                placeholder="Min. 8 characters"
                style={{ paddingRight: 36 }}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                  color: 'var(--mute-2)', display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createAdmin.isPending} className="btn-primary flex-1">
              {createAdmin.isPending ? <><Loader2 size={13} className="animate-spin" /> Adding…</> : 'Add operator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data: admins = [], isLoading } = useSuperAdmins();
  const deleteAdmin = useDeleteSuperAdmin();
  const { admin: me } = useAuth();

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);

  async function handleDelete(admin) {
    await deleteAdmin.mutateAsync(admin.id);
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Operators</h1>
          <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
            {admins.length} operator{admins.length !== 1 ? 's' : ''} with admin panel access
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-1.5"
        >
          <UserPlus size={14} /> Add operator
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)', overflowX: 'auto' }}>
        {isLoading ? (
          <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>No operators found.</div>
        ) : (
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Email</th>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Role</th>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const isSelf = admin.id === me?.id;
                return (
                  <tr
                    key={admin.id}
                    style={{ borderBottom: '1px solid var(--line)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{admin.email}</span>
                        {isSelf && (
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{ fontSize: 10, fontWeight: 500, background: 'var(--hover)', color: 'var(--mute)' }}
                          >
                            you
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                        <ShieldCheck size={13} style={{ color: 'var(--info)' }} />
                        Super Admin
                      </span>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--mute)' }}>
                      {formatDate(admin.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => setConfirmDelete(admin)}
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--bad)' }}
                          title="Remove operator"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} />}

      {confirmDelete && (
        <ConfirmDeleteModal
          admin={confirmDelete}
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
          isPending={deleteAdmin.isPending}
        />
      )}
    </div>
  );
}
