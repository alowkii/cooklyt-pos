import { useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, User, ChefHat, Check, X } from 'lucide-react';
import { useUsers, useCreateUser, useDeleteUser, useUpdateUserRole } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';

const ROLES = ['admin', 'staff', 'kitchen'];

const ROLE_DOT = {
  admin:   'var(--info)',
  staff:   'var(--mute)',
  kitchen: 'var(--warn)',
};

const ROLE_ICON = {
  admin:   ShieldCheck,
  staff:   User,
  kitchen: ChefHat,
};

const EMPTY_FORM = { email: '', password: '', role: 'staff' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function RoleCell({ user, isSelf, onSave }) {
  const [editing,  setEditing]  = useState(false);
  const [selected, setSelected] = useState(user.role);
  const updateRole = useUpdateUserRole();

  async function save() {
    if (selected !== user.role) await onSave(user.id, selected);
    setEditing(false);
  }

  function cancel() {
    setSelected(user.role);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input"
          style={{ padding: '3px 8px', fontSize: 12, width: 'auto' }}
          autoFocus
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">{r}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={updateRole.isPending}
          className="btn btn-sm btn-ghost disabled:opacity-50"
          style={{ color: 'var(--ok)' }}
          title="Save"
        >
          <Check size={13} />
        </button>
        <button
          onClick={cancel}
          className="btn btn-sm btn-ghost"
          title="Cancel"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  const Icon = ROLE_ICON[user.role] ?? User;

  return (
    <button
      onClick={() => !isSelf && setEditing(true)}
      disabled={isSelf}
      title={isSelf ? 'Cannot change your own role' : 'Click to change role'}
      className="inline-flex items-center gap-1.5"
      style={{
        fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
        color: 'var(--ink)', background: 'transparent', border: 0, padding: 0,
        cursor: isSelf ? 'default' : 'pointer', opacity: isSelf ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: ROLE_DOT[user.role] ?? 'var(--mute)',
        }}
      />
      {user.role}
    </button>
  );
}

export default function Users() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateRole = useUpdateUserRole();

  const [addModal,       setAddModal]       = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [formError,      setFormError]      = useState('');

  const { user: me } = useAuth();

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    try {
      await createUser.mutateAsync(form);
      setAddModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create user');
    }
  }

  async function handleDelete(id) {
    await deleteUser.mutateAsync(id);
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>
          {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => { setForm(EMPTY_FORM); setFormError(''); setAddModal(true); }}
          className="btn-primary flex items-center gap-1.5"
        >
          <UserPlus size={14} /> Add User
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)', overflowX: 'auto' }}>
        {isLoading ? (
          <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading users…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>No users found</div>
        ) : (
          <table className="w-full" style={{ minWidth: 520, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Email</th>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>
                  Role
                  <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--line-2)' }}>(click to change)</span>
                </th>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === me.id;
                return (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid var(--line)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-3.5" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {user.email}
                      {isSelf && (
                        <span
                          className="ml-2 rounded-full px-2 py-0.5"
                          style={{ fontSize: 10, fontWeight: 500, background: 'var(--hover)', color: 'var(--mute)' }}
                        >
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <RoleCell
                        user={user}
                        isSelf={isSelf}
                        onSave={(id, role) => updateRole.mutateAsync({ id, role })}
                      />
                    </td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--mute)' }}>{formatDate(user.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => setConfirmDelete(user)}
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--bad)' }}
                          title="Delete user"
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

      {/* Add User Modal */}
      {addModal && (
        <Modal title="Add User" onClose={() => setAddModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="staff@restaurant.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="input"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
              <p style={{ marginTop: 6, fontSize: 11.5, color: 'var(--mute)' }}>
                <strong>admin</strong> — full access ·{' '}
                <strong>staff</strong> — orders &amp; tables ·{' '}
                <strong>kitchen</strong> — kitchen queue only
              </p>
            </div>

            {formError && (
              <p className="rounded-[6px] px-3 py-2" style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)' }}>
                {formError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setAddModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={createUser.isPending} className="btn-primary flex-1">
                {createUser.isPending ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <Modal title="Delete User" onClose={() => setConfirmDelete(null)}>
          <p className="mb-5" style={{ fontSize: 13, color: 'var(--ink)' }}>
            Delete <strong>{confirmDelete.email}</strong>? They will immediately lose access.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => handleDelete(confirmDelete.id)}
              disabled={deleteUser.isPending}
              className="flex-1 rounded-[6px] px-4 py-2 transition-colors disabled:opacity-60"
              style={{ fontSize: 13, fontWeight: 500, background: 'var(--bad)', color: '#fff', border: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {deleteUser.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
