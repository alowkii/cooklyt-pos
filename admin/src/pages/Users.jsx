import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2, ShieldCheck, User, ChefHat, BadgeCheck, MailWarning, Send,
} from 'lucide-react';
import {
  useAllUsers, useDeleteAnyUser, useSetAnyUserActive, useResendAnyVerification,
} from '../hooks/useAdmin';

const ROLE_DOT = {
  admin:   'var(--info)',
  staff:   'var(--mute)',
  cashier: 'var(--ok)',
  kitchen: 'var(--warn)',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function VerifiedIcon({ verified }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', cursor: 'default' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {verified
        ? <BadgeCheck size={13} style={{ color: 'var(--ok)' }} />
        : <MailWarning size={13} style={{ color: 'var(--warn)' }} />}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff',
          fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
          padding: '3px 8px', borderRadius: 4, pointerEvents: 'none',
          zIndex: 10,
        }}>
          {verified ? 'Email verified' : 'Email not verified'}
        </span>
      )}
    </span>
  );
}

function ConfirmDeleteModal({ user, onConfirm, onClose, isPending }) {
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
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Delete user?</p>
        <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 20 }}>
          Remove <strong style={{ color: 'var(--ink)' }}>{user.email}</strong> from{' '}
          <strong style={{ color: 'var(--ink)' }}>{user.restaurant_name}</strong>?
          They will immediately lose access.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-[6px] px-4 py-2 disabled:opacity-60"
            style={{ fontSize: 13, fontWeight: 500, background: 'var(--bad)', color: '#fff', border: 0, cursor: 'pointer' }}
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useAllUsers();
  const deleteUser      = useDeleteAnyUser();
  const setUserActive   = useSetAnyUserActive();
  const resendVerif     = useResendAnyVerification();

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resendingId,   setResendingId]   = useState(null);
  const [resentId,      setResentId]      = useState(null);
  const [search,        setSearch]        = useState('');

  const filtered = search.trim()
    ? users.filter((u) =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.restaurant_name.toLowerCase().includes(search.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  async function handleDelete(user) {
    await deleteUser.mutateAsync(user.id);
    setConfirmDelete(null);
  }

  async function handleResend(user) {
    setResendingId(user.id);
    try {
      await resendVerif.mutateAsync(user.id);
      setResentId(user.id);
      setTimeout(() => setResentId(null), 3000);
    } catch {}
    finally { setResendingId(null); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>All Users</h1>
          <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
            {users.length} user{users.length !== 1 ? 's' : ''} across all restaurants
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          placeholder="Search by email, name or restaurant…"
          style={{ width: 260 }}
        />
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)', overflowX: 'auto' }}>
        {isLoading ? (
          <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>
            {search ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          <table className="w-full" style={{ minWidth: 680, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Email', 'Name', 'Role', 'Restaurant', 'Active', 'Created', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3 ${h === '' ? '' : 'text-left'}`}
                    style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: '1px solid var(--line)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Email + verification */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{user.email}</span>
                      <VerifiedIcon verified={user.email_verified} />
                      {!user.email_verified && (
                        <button
                          onClick={() => handleResend(user)}
                          disabled={resendingId === user.id}
                          title="Resend invite / verification email"
                          className="inline-flex items-center gap-1"
                          style={{
                            fontSize: 11, border: 0, padding: '2px 6px', borderRadius: 4,
                            cursor: 'pointer',
                            color: resentId === user.id ? 'var(--ok)' : 'var(--mute)',
                            background: 'var(--hover)',
                          }}
                        >
                          <Send size={11} />
                          {resentId === user.id ? 'Sent!' : resendingId === user.id ? '…' : 'Resend'}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-5 py-3.5" style={{ color: user.name ? 'var(--ink)' : 'var(--mute-2)' }}>
                    {user.name || <span style={{ fontStyle: 'italic' }}>—</span>}
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', textTransform: 'capitalize' }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: ROLE_DOT[user.role] ?? 'var(--mute)' }} />
                      {user.role}
                    </span>
                  </td>

                  {/* Restaurant */}
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/restaurants/${user.restaurant_id}`}
                      style={{ fontSize: 12, color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {user.restaurant_name}
                    </Link>
                  </td>

                  {/* Active toggle */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setUserActive.mutate({ id: user.id, isActive: !user.is_active })}
                      disabled={setUserActive.isPending}
                      title={user.is_active ? 'Disable account' : 'Enable account'}
                      className="inline-flex items-center gap-1.5"
                      style={{ fontSize: 12, background: 'none', border: 0, cursor: 'pointer', padding: 0, color: user.is_active ? 'var(--ok)' : 'var(--bad)' }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: user.is_active ? 'var(--ok)' : 'var(--bad)', display: 'inline-block', flexShrink: 0 }} />
                      {user.is_active ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>

                  {/* Created */}
                  <td className="px-5 py-3.5" style={{ color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                    {formatDate(user.created_at)}
                  </td>

                  {/* Delete */}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setConfirmDelete(user)}
                      className="btn btn-sm btn-ghost"
                      style={{ color: 'var(--bad)' }}
                      title="Delete user"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal
          user={confirmDelete}
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
          isPending={deleteUser.isPending}
        />
      )}
    </div>
  );
}
