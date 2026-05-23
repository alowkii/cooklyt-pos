import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '../hooks/useCoupons';
import Modal from '../components/Modal';

const LABEL = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', display: 'block', marginBottom: 5 };
const INPUT = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper-2)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' };
const EMPTY = { code: '', description: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '' };

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

export default function Coupons() {
  const navigate = useNavigate();
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const { data: coupons = [], isLoading } = useCoupons({ includeInactive: showInactive });
  const createC = useCreateCoupon();
  const updateC = useUpdateCoupon();
  const deleteC = useDeleteCoupon();

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : '',
      max_uses: c.max_uses != null ? String(c.max_uses) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
      max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
      expires_at: form.expires_at || undefined,
    };
    try {
      if (editing) {
        await updateC.mutateAsync({ id: editing.id, ...payload });
      } else {
        await createC.mutateAsync(payload);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to save coupon');
    }
  }

  async function handleToggleActive(c) {
    try {
      await updateC.mutateAsync({ id: c.id, is_active: !c.is_active });
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    try {
      await deleteC.mutateAsync(confirmDel.id);
      setConfirmDel(null);
    } catch (err) {
      setConfirmDel(null);
    }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Coupons</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--mute)' }}>Manage discount coupon codes</p>
        </div>
        <button
          onClick={() => setShowInactive((v) => !v)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--fg)' }}
        >
          {showInactive ? 'Hide inactive' : 'Show all'}
        </button>
        <button
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--mute)', textAlign: 'center', paddingTop: 40 }}>Loading…</p>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--mute)' }}>
          <Tag size={40} strokeWidth={1.2} />
          <p style={{ marginTop: 12 }}>No coupons yet. Create your first one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coupons.map((c) => (
            <div key={c.id} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: c.is_active ? 1 : 0.6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, letterSpacing: 1, color: 'var(--accent)' }}>{c.code}</span>
                  {!c.is_active && <span style={{ fontSize: 11, background: 'var(--paper-2)', color: 'var(--mute)', borderRadius: 4, padding: '2px 6px' }}>INACTIVE</span>}
                  {c.expires_at && new Date(c.expires_at) < new Date() && <span style={{ fontSize: 11, background: 'rgba(179,55,43,0.1)', color: 'var(--bad)', borderRadius: 4, padding: '2px 6px' }}>EXPIRED</span>}
                </div>
                {c.description && <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--mute)' }}>{c.description}</p>}
                <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--mute)' }}>
                  <span style={{ color: 'var(--ok)', fontWeight: 600 }}>
                    {c.discount_type === 'percent' ? `${c.discount_value}% off` : `Flat ${c.discount_value} off`}
                  </span>
                  {parseFloat(c.min_order_amount) > 0 && <span>Min order: {c.min_order_amount}</span>}
                  {c.max_uses != null && <span>Used: {c.uses_count}/{c.max_uses}</span>}
                  {c.expires_at && <span>Expires: {fmtDate(c.expires_at)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => handleToggleActive(c)}
                  title={c.is_active ? 'Deactivate' : 'Activate'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.is_active ? 'var(--ok)' : 'var(--mute)', display: 'flex' }}
                >
                  {c.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', display: 'flex' }}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => setConfirmDel(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bad)', display: 'flex' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <Modal onClose={() => setFormOpen(false)} title={editing ? 'Edit Coupon' : 'New Coupon'}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Code</label>
                <input style={{ ...INPUT, textTransform: 'uppercase' }} placeholder="e.g. SAVE20" value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required />
              </div>
              <div>
                <label style={LABEL}>Discount Type</label>
                <select style={INPUT} value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat amount</option>
                </select>
              </div>
              <div>
                <label style={LABEL}>Discount Value</label>
                <input style={INPUT} type="number" min="0.01" step="0.01" placeholder={form.discount_type === 'percent' ? '0–100' : '0.00'}
                  value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} required />
              </div>
              <div>
                <label style={LABEL}>Min Order Amount</label>
                <input style={INPUT} type="number" min="0" step="0.01" placeholder="0 = no minimum"
                  value={form.min_order_amount} onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>Max Uses (optional)</label>
                <input style={INPUT} type="number" min="1" step="1" placeholder="Unlimited"
                  value={form.max_uses} onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>Expires At (optional)</label>
                <input style={INPUT} type="date" value={form.expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Description (optional)</label>
              <input style={INPUT} placeholder="Internal note about this coupon"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            {formError && <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0 }}>{formError}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setFormOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--fg)' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {editing ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <Modal onClose={() => setConfirmDel(null)} title="Delete Coupon">
          <p style={{ margin: '0 0 20px', fontSize: 14 }}>
            Delete coupon <strong>{confirmDel.code}</strong>? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDel(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDelete} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--bad)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
