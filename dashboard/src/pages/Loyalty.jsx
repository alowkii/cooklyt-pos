import { useState } from 'react';
import { ArrowLeft, Search, Plus, ChevronDown, ChevronUp, Gift, TrendingUp, TrendingDown, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLoyaltyCustomers, useCreateLoyaltyCustomer, useLoyaltyTransactions, useAdjustPoints } from '../hooks/useLoyalty';
import Modal from '../components/Modal';

const LABEL = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mute)', display: 'block', marginBottom: 5 };
const INPUT = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper-2)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' };

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function TransactionIcon({ type }) {
  if (type === 'earn')   return <TrendingUp size={14} style={{ color: 'var(--ok)' }} />;
  if (type === 'redeem') return <TrendingDown size={14} style={{ color: 'var(--bad)' }} />;
  return <Settings2 size={14} style={{ color: 'var(--mute)' }} />;
}

function CustomerRow({ customer }) {
  const [expanded, setExpanded] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ points: '', description: '' });
  const [adjustError, setAdjustError] = useState('');

  const { data: txData, isLoading: txLoading } = useLoyaltyTransactions(expanded ? customer.id : null);
  const adjustMutation = useAdjustPoints(customer.id);

  async function handleAdjust(e) {
    e.preventDefault();
    setAdjustError('');
    const n = parseInt(adjustForm.points);
    if (isNaN(n) || n === 0) { setAdjustError('Enter a non-zero integer'); return; }
    try {
      await adjustMutation.mutateAsync({ points: n, description: adjustForm.description || undefined });
      setAdjustForm({ points: '', description: '' });
      setAdjustOpen(false);
    } catch (err) {
      setAdjustError(err?.response?.data?.error || 'Failed to adjust points');
    }
  }

  return (
    <>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div
          style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
          onClick={() => setExpanded((v) => !v)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{customer.name || <span style={{ color: 'var(--mute)', fontStyle: 'italic' }}>No name</span>}</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 2 }}>{customer.phone}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{customer.points_balance}</div>
            <div style={{ fontSize: 11, color: 'var(--mute)' }}>pts</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setAdjustOpen(true); }}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--fg)', whiteSpace: 'nowrap' }}
          >
            Adjust
          </button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--mute)' }} /> : <ChevronDown size={16} style={{ color: 'var(--mute)' }} />}
        </div>

        {expanded && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px' }}>
            {txLoading ? (
              <p style={{ color: 'var(--mute)', fontSize: 13 }}>Loading…</p>
            ) : !txData?.transactions?.length ? (
              <p style={{ color: 'var(--mute)', fontSize: 13 }}>No transactions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {txData.transactions.map((tx) => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <TransactionIcon type={tx.type} />
                    <span style={{ flex: 1, color: 'var(--mute)' }}>{tx.description || tx.type}</span>
                    <span style={{ fontWeight: 600, color: tx.points > 0 ? 'var(--ok)' : 'var(--bad)' }}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                    <span style={{ color: 'var(--mute)', fontSize: 11, minWidth: 120, textAlign: 'right' }}>{fmtDate(tx.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {adjustOpen && (
        <Modal onClose={() => setAdjustOpen(false)} title={`Adjust Points — ${customer.name || customer.phone}`}>
          <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--mute)' }}>
              Current balance: <strong style={{ color: 'var(--fg)' }}>{customer.points_balance} pts</strong>
            </p>
            <div>
              <label style={LABEL}>Points adjustment (use - to deduct)</label>
              <input style={INPUT} type="number" placeholder="+50 or -20"
                value={adjustForm.points} onChange={(e) => setAdjustForm((f) => ({ ...f, points: e.target.value }))} required />
            </div>
            <div>
              <label style={LABEL}>Reason (optional)</label>
              <input style={INPUT} placeholder="e.g. Promotional bonus"
                value={adjustForm.description} onChange={(e) => setAdjustForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            {adjustError && <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0 }}>{adjustError}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAdjustOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--fg)' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Apply</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function Loyalty() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ phone: '', name: '' });
  const [addError, setAddError] = useState('');

  const { data: customers = [], isLoading } = useLoyaltyCustomers(search);
  const createC = useCreateLoyaltyCustomer();

  async function handleAdd(e) {
    e.preventDefault();
    setAddError('');
    try {
      await createC.mutateAsync({ phone: addForm.phone.trim(), name: addForm.name.trim() || undefined });
      setAddForm({ phone: '', name: '' });
      setAddOpen(false);
    } catch (err) {
      setAddError(err?.response?.data?.error || 'Failed to create customer');
    }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Loyalty Programme</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--mute)' }}>Manage customer loyalty accounts and points</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          <Plus size={16} /> New Customer
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mute)' }} />
        <input
          style={{ ...INPUT, paddingLeft: 36 }}
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--mute)', textAlign: 'center', paddingTop: 40 }}>Loading…</p>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--mute)' }}>
          <Gift size={40} strokeWidth={1.2} />
          <p style={{ marginTop: 12 }}>{search ? 'No customers match your search.' : 'No loyalty customers yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customers.map((c) => <CustomerRow key={c.id} customer={c} />)}
        </div>
      )}

      {addOpen && (
        <Modal onClose={() => setAddOpen(false)} title="Add Loyalty Customer">
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LABEL}>Phone number</label>
              <input style={INPUT} type="tel" placeholder="+1234567890"
                value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div>
              <label style={LABEL}>Name (optional)</label>
              <input style={INPUT} placeholder="Customer name"
                value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            {addError && <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0 }}>{addError}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAddOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--fg)' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Add Customer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
