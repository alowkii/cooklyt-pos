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

const ROLE_COLORS = {
  admin:   'bg-violet-100 text-violet-700',
  staff:   'bg-blue-100 text-blue-700',
  kitchen: 'bg-amber-100 text-amber-700',
};

const { timezones: TIMEZONES, currencies: CURRENCIES } = settingsOptions;


function SettingsCard({ restaurantId, settings }) {
  const updateSetting = useUpdateSetting(restaurantId);
  const [tz,  setTz]  = useState(settings.timezone        || 'UTC');
  const [cur, setCur] = useState(settings.currency        || 'USD');
  const [tax, setTax] = useState(settings.tax_rate        || '0');
  const [svc, setSvc] = useState(settings.service_charge  || '0');
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Settings</h2>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Timezone</label>
        <select className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
          {TIMEZONES.map((zone) => (
            <option key={zone.iana} value={zone.iana}>{zone.label} ({zone.offset})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Currency</label>
        <select className="input" value={cur} onChange={(e) => setCur(e.target.value)}>
          {CURRENCIES.map(({ code, name }) => (
            <option key={code} value={code}>{code} — {name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Tax rate (%)</label>
          <input
            type="number"
            min="0" max="100" step="0.01"
            className="input"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Service charge (%)</label>
          <input
            type="number"
            min="0" max="100" step="0.01"
            className="input"
            value={svc}
            onChange={(e) => setSvc(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={updateSetting.isPending}
        className="btn-primary w-full"
      >
        {saved ? 'Saved!' : updateSetting.isPending ? 'Saving…' : 'Save settings'}
      </button>
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
    <form onSubmit={handleSubmit} className="border-t border-slate-100 pt-4 mt-4 space-y-3">
      <p className="text-xs font-semibold text-slate-600">Add user</p>
      <div className="grid grid-cols-2 gap-3">
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          minLength={6}
          required
        />
      </div>
      <select
        className="input"
        value={form.role}
        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
      >
        <option value="admin">Admin</option>
        <option value="staff">Staff</option>
        <option value="kitchen">Kitchen</option>
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useRestaurant(id);
  const updateRestaurant = useUpdateRestaurant(id);
  const deleteUser = useDeleteUser(id);

  const [editing, setEditing]   = useState(false);
  const [nameVal, setNameVal]   = useState('');
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

  if (isLoading) return <div className="text-sm text-slate-400 p-8">Loading…</div>;
  if (!data) return <div className="text-sm text-red-500 p-8">Restaurant not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={15} /> Restaurants
      </button>

      {/* Name heading */}
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              className="input text-xl font-bold"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              autoFocus
            />
            <button onClick={saveName} className="text-violet-600 hover:text-violet-800">
              <Check size={20} />
            </button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-800">{data.name}</h1>
            <button onClick={startEdit} className="text-slate-400 hover:text-violet-600 transition-colors">
              <Pencil size={16} />
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Settings */}
        <div className="col-span-1">
          <SettingsCard restaurantId={id} settings={data.settings} />
        </div>

        {/* Users */}
        <div className="col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">
                Users <span className="ml-1 text-slate-400 font-normal">({data.users.length})</span>
              </h2>
              <button
                onClick={() => setShowAddUser((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
              >
                <UserPlus size={14} /> Add user
              </button>
            </div>

            {data.users.length === 0 ? (
              <p className="text-sm text-slate-400">No users yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500">Email</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500">Role</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500">Joined</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2.5 text-slate-700">{u.email}</td>
                      <td className="py-2.5">
                        <span className={`badge ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="btn-danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
