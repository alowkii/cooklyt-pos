import { useState, useEffect } from 'react';

export function useStaffPin(tableId, tableInfo, pinFromUrl, initialPin, showToast) {
  const [staffPin, setStaffPin] = useState(initialPin || '');
  const [staffName, setStaffName] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [staffAssigning, setStaffAssigning] = useState(false);
  const [staffAssigned, setStaffAssigned] = useState(false);

  async function verifyPin(pin, restaurantId) {
    if (!pin || !/^\d{4}$/.test(pin)) { setStaffName(''); return; }
    setPinVerifying(true);
    try {
      const res = await fetch(`/api/public/staff/verify-pin/${restaurantId}/${pin}`);
      if (res.ok) {
        const { name } = await res.json();
        setStaffName(name);
      } else {
        setStaffName('');
      }
    } catch { setStaffName(''); }
    finally { setPinVerifying(false); }
  }

  // Used by the locked "Set" button when staff came via URL
  async function assignStaffToTable() {
    if (!staffPin || !staffName || staffAssigning) return;
    setStaffAssigning(true);
    try {
      const res = await fetch(`/api/public/table/${tableId}/staff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffPin }),
      });
      if (!res.ok) throw new Error();
      setStaffAssigned(true);
      setTimeout(() => setStaffAssigned(false), 3000);
    } catch {
      showToast('Could not assign staff. Please try again.');
    } finally {
      setStaffAssigning(false);
    }
  }

  // Used by the editable input "Set" button — verifies then assigns atomically
  async function verifyAndAssign() {
    if (staffAssigning || staffPin.length !== 4) return;
    setStaffAssigning(true);
    try {
      const vRes = await fetch(`/api/public/staff/verify-pin/${tableInfo?.restaurant_id}/${staffPin}`);
      if (!vRes.ok) { setStaffName(''); return; }
      const { name } = await vRes.json();
      setStaffName(name);
      const aRes = await fetch(`/api/public/table/${tableId}/staff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffPin }),
      });
      if (!aRes.ok) throw new Error();
      setStaffAssigned(true);
    } catch {
      showToast('Could not assign staff. Please try again.');
    } finally {
      setStaffAssigning(false);
    }
  }

  // Sync staffName from server whenever the table's assignment changes
  useEffect(() => {
    const name = tableInfo?.assigned_staff_name;
    if (name && name !== staffName) setStaffName(name);
  }, [tableInfo?.assigned_staff_name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-verify and auto-assign URL-provided PIN once tableInfo is available
  useEffect(() => {
    if (!tableInfo?.restaurant_id || !staffPin || !pinFromUrl) return;
    verifyPin(staffPin, tableInfo.restaurant_id);
    fetch(`/api/public/table/${tableId}/staff`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffPin }),
    }).catch(() => {});
  }, [tableInfo?.restaurant_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    staffPin, setStaffPin,
    staffName, setStaffName,
    pinVerifying, staffAssigning, staffAssigned,
    verifyPin, assignStaffToTable, verifyAndAssign,
  };
}
