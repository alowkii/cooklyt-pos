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
  const [newName, setNewName]   = useState('');
  const [error, setError]       = useState('');

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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Restaurants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {restaurants.length} restaurants · {totalUsers} total users
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New restaurant
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex gap-3 items-start"
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
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <button type="submit" disabled={createRestaurant.isPending} className="btn-primary">
            {createRestaurant.isPending ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
            Cancel
          </button>
        </form>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        ) : restaurants.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No restaurants yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Users</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {restaurants.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{r.name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{r.user_count}</td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/restaurants/${r.id}`)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        Manage <ArrowRight size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        className="btn-danger"
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
