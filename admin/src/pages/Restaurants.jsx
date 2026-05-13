import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { useRestaurants, useCreateRestaurant, useDeleteRestaurant } from '../hooks/useAdmin';

export default function Restaurants() {
  const navigate = useNavigate();
  const { data: restaurants = [], isLoading } = useRestaurants();
  const createRestaurant = useCreateRestaurant();
  const deleteRestaurant = useDeleteRestaurant();

  const [showForm, setShowForm] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [error,    setError]    = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await createRestaurant.mutateAsync(newName);
      setNewName('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create restaurant.');
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This will also delete all its users, menu, tables, orders and settings.`)) return;
    try {
      await deleteRestaurant.mutateAsync(id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete.');
    }
  }

  const totalUsers = restaurants.reduce((sum, r) => sum + (r.user_count || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>Restaurants</h1>
          <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} · {totalUsers} total users
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          <Plus size={14} />
          New restaurant
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex gap-3 items-start p-4 rounded-[8px]"
          style={{ border: '1px solid var(--line-2)', background: 'var(--paper-2)' }}
        >
          <div className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input"
              placeholder="Restaurant name"
              autoFocus
              required
            />
            {error && <p style={{ marginTop: 4, fontSize: 12, color: 'var(--bad)' }}>{error}</p>}
          </div>
          <button type="submit" disabled={createRestaurant.isPending} className="btn-primary">
            {createRestaurant.isPending ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
        </form>
      )}

      {/* Table */}
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--paper)', overflowX: 'auto' }}>
        {isLoading ? (
          <div className="p-8 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</div>
        ) : restaurants.length === 0 ? (
          <div className="p-8 text-center" style={{ fontSize: 13, color: 'var(--mute)' }}>No restaurants yet.</div>
        ) : (
          <table className="w-full" style={{ minWidth: 480, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Name</th>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Users</th>
                <th className="px-5 py-3 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)' }}>Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid var(--line)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-5 py-3.5" style={{ fontWeight: 500, color: 'var(--ink)' }}>{r.name}</td>
                  <td className="px-5 py-3.5 mono num" style={{ color: 'var(--mute)' }}>{r.user_count}</td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--mute)' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/restaurants/${r.id}`)}
                        className="flex items-center gap-1 rounded-[6px] px-3 py-1.5 transition-colors"
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', border: '1px solid var(--line-2)', background: 'transparent' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        Manage <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--bad)' }}
                        title="Delete restaurant"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
