import { useState } from 'react';
import settingsOptions from '@shared/settings-options.json';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Check, X, Trash2, UserPlus } from 'lucide-react';
import {
  useRestaurant,
  useUpdateRestaurant,
  useCreateUser,
  useDeleteUser,
  useUpdateSetting,
} from '../hooks/useAdmin';

const ROLE_DOT = {
  admin:   'var(--info)',
  staff:   'var(--mute)',
  kitchen: 'var(--warn)',
};

const { timezones: TIMEZONES, currencies: CURRENCIES } = settingsOptions;

function SettingsCard({ restaurantId, settings }) {
  const updateSetting = useUpdateSetting(restaurantId);
  const [tz,    setTz]    = useState(settings.timezone       || 'UTC');
  const [cur,   setCur]   = useState(settings.currency       || 'USD');
  const [tax,   setTax]   = useState(settings.tax_rate       || '0');
  const [svc,   setSvc]   = useState(settings.service_charge || '0');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'timezone',       value: tz }),
      updateSetting.mutateAsync({ key: 'currency',       value: cur }),
      updateSetting.mutateAsync({ key: 'tax_rate',       value: tax }),
      updateSetting.mutateAsync({ key: 'service_charge', value: svc }),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)', padding: 20 }} className="space-y-4">
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Settings</p>

      <div>
        <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>Timezone</label>
        <select className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
          {TIMEZONES.map((zone) => (
            <option key={zone.iana} value={zone.iana}>{zone.label} ({zone.offset})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>Currency</label>
        <select className="input" value={cur} onChange={(e) => setCur(e.target.value)}>
          {CURRENCIES.map(({ code, name }) => (
            <option key={code} value={code}>{code} — {name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>Tax rate (%)</label>
          <input type="number" min="0" max="100" step="0.01" className="input" value={tax}
            onChange={(e) => setTax(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mute)' }}>Service charge (%)</label>
          <input type="number" min="0" max="100" step="0.01" className="input" value={svc}
            onChange={(e) => setSvc(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={updateSetting.isPending}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saved ? 'Saved!' : updateSetting.isPending ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <Check size={14} style={{ color: 'var(--ok)', flexShrink: 0 }} />}
      </div>
    </div>
  );
}

function AddUserForm({ restaurantId, onClose }) {
  const createUser = useCreateUser(restaurantId);
  const [form, setForm] = useState({ email: '', password: '', role: 'staff' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await createUser.mutateAsync(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pt-4 mt-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
      <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Add user</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className="input" type="email" placeholder="Email"
          value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        <input className="input" type="password" placeholder="Password"
          value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} minLength={6} required />
      </div>
      <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
        <option value="admin">Admin</option>
        <option value="staff">Staff</option>
        <option value="kitchen">Kitchen</option>
      </select>
      {error && <p style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={createUser.isPending} className="btn-primary">
          {createUser.isPending ? 'Adding…' : 'Add user'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function RestaurantDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useRestaurant(id);
  const updateRestaurant = useUpdateRestaurant(id);
  const deleteUser = useDeleteUser(id);

  const [editing,     setEditing]     = useState(false);
  const [nameVal,     setNameVal]     = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  function startEdit() {
    setNameVal(data.name);
    setEditing(true);
  }

  async function saveName() {
    if (!nameVal.trim()) return;
    await updateRestaurant.mutateAsync(nameVal.trim());
    setEditing(false);
  }

  async function handleDeleteUser(userId, email) {
    if (!window.confirm(`Remove ${email} from this restaurant?`)) return;
    await deleteUser.mutateAsync(userId);
  }

  if (isLoading) return <div className="p-8" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>;
  if (!data)     return <div className="p-8" style={{ fontSize: 13, color: 'var(--bad)' }}>Restaurant not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 transition-colors"
        style={{ fontSize: 13, color: 'var(--mute)', background: 'transparent', border: 0, cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
      >
        <ArrowLeft size={14} /> Restaurants
      </button>

      {/* Name heading */}
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              className="input"
              style={{ fontSize: 18, fontWeight: 700, maxWidth: 320 }}
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              autoFocus
            />
            <button onClick={saveName} className="btn btn-sm btn-ghost" style={{ color: 'var(--ok)' }}>
              <Check size={18} />
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-sm btn-ghost">
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{data.name}</h1>
            <button
              onClick={startEdit}
              className="btn btn-sm btn-ghost"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
            >
              <Pencil size={14} />
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Settings */}
        <div className="lg:col-span-1">
          <SettingsCard restaurantId={id} settings={data.settings} />
        </div>

        {/* Users */}
        <div className="lg:col-span-2">
          <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)', padding: 20 }}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                Users
                <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--mute)' }}>({data.users.length})</span>
              </p>
              <button
                onClick={() => setShowAddUser((v) => !v)}
                className="flex items-center gap-1.5 transition-colors"
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)', background: 'transparent', border: 0, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mute)')}
              >
                <UserPlus size={13} /> Add user
              </button>
            </div>

            {data.users.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--mute)' }}>No users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 400, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      <th className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Email</th>
                      <th className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Role</th>
                      <th className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Joined</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid var(--line)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td className="py-2.5" style={{ color: 'var(--ink)' }}>{u.email}</td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', textTransform: 'capitalize' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: ROLE_DOT[u.role] ?? 'var(--mute)' }} />
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--bad)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showAddUser && (
              <AddUserForm restaurantId={id} onClose={() => setShowAddUser(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
