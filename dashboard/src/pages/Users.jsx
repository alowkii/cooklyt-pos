import { useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, User, ChefHat, Check, X } from 'lucide-react';
import { useUsers, useCreateUser, useDeleteUser, useUpdateUserRole } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';

const ROLES = ['admin', 'staff', 'kitchen'];

const ROLE_STYLES = {
  admin:   { cls: 'bg-indigo-100 text-indigo-700', Icon: ShieldCheck },
  staff:   { cls: 'bg-slate-100  text-slate-600',  Icon: User },
  kitchen: { cls: 'bg-amber-100  text-amber-700',  Icon: ChefHat },
};

const EMPTY_FORM = { email: '', password: '', role: 'staff' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// Inline role selector — shows a dropdown when editing, badge when idle
function RoleCell({ user, isSelf, onSave }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(user.role);
  const updateRole = useUpdateUserRole();

  async function save() {
    if (selected !== user.role) {
      await onSave(user.id, selected);
    }
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
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
          autoFocus
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">{r}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={updateRole.isPending}
          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancel}
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const style = ROLE_STYLES[user.role] ?? ROLE_STYLES.staff;

  return (
    <button
      onClick={() => !isSelf && setEditing(true)}
      disabled={isSelf}
      title={isSelf ? 'Cannot change your own role' : 'Click to change role'}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-opacity ${style.cls} ${
        isSelf ? 'cursor-default' : 'cursor-pointer hover:opacity-70'
      }`}
    >
      <style.Icon size={11} />
      {user.role}
    </button>
  );
}

export default function Users() {
  const { data: users = [], isLoading } = useUsers();
  const createUser  = useCreateUser();
  const deleteUser  = useDeleteUser();
  const updateRole  = useUpdateUserRole();

  const [addModal, setAddModal]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [formError, setFormError]         = useState('');

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
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => { setForm(EMPTY_FORM); setFormError(''); setAddModal(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No users found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">Email</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Role
                  <span className="ml-1.5 font-normal normal-case text-slate-300">(click to change)</span>
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === me.id;

                return (
                  <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {user.email}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-500">
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
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => setConfirmDelete(user)}
                          className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
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

      {/* ── Add User Modal ──────────────────────────────── */}
      {addModal && (
        <Modal title="Add User" onClose={() => setAddModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="input"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-400">
                <strong>admin</strong> — full access ·{' '}
                <strong>staff</strong> — orders &amp; tables ·{' '}
                <strong>kitchen</strong> — kitchen queue only
              </p>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setAddModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={createUser.isPending} className="btn-primary flex-1">
                {createUser.isPending ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ────────────────────────── */}
      {confirmDelete && (
        <Modal title="Delete User" onClose={() => setConfirmDelete(null)}>
          <p className="mb-5 text-sm text-slate-600">
            Delete <strong>{confirmDelete.email}</strong>? They will immediately lose access.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => handleDelete(confirmDelete.id)}
              disabled={deleteUser.isPending}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleteUser.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
