import { useState, useEffect, useCallback } from 'react';

export function useTableData(tableId, showToast) {
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [tableInfo,    setTableInfo]    = useState(null);
  const [items,        setItems]        = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [cancelling,   setCancelling]   = useState(null);

  const fmt = (v) => {
    if (!tableInfo?.currency) return String(v);
    const { symbol, decimals } = tableInfo.currency;
    return `${symbol}${parseFloat(v).toFixed(decimals)}`;
  };

  const fetchOrders = useCallback(async (tid) => {
    try {
      const res = await fetch(`/api/public/orders/table/${tid}`);
      if (res.ok) setActiveOrders(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchTableInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/table/${tableId}`);
      if (res.ok) setTableInfo(await res.json());
    } catch { /* silent */ }
  }, [tableId]);

  useEffect(() => {
    async function load() {
      try {
        const tr = await fetch(`/api/public/table/${tableId}`);
        if (!tr.ok) throw new Error('Table not found. Please ask staff for help.');
        const table = await tr.json();
        setTableInfo(table);
        const [mr] = await Promise.all([
          fetch(`/api/public/menu/${table.restaurant_id}`),
          fetchOrders(tableId),
        ]);
        if (!mr.ok) throw new Error('Failed to load menu.');
        setItems(await mr.json());
      } catch (e) {
        setLoadError(e.message || 'Could not load menu. Please ask staff for help.');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(() => { fetchOrders(tableId); fetchTableInfo(); }, 5000);

    function onVisible() {
      if (document.visibilityState === 'visible') fetchOrders(tableId);
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tableId, fetchOrders, fetchTableInfo]);

  async function cancelOrder(orderId) {
    setCancelling(orderId);
    try {
      const res = await fetch(`/api/public/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Could not cancel order.');
      }
      await fetchOrders(tableId);
      showToast('Order cancelled.');
    } catch (e) {
      showToast(e.message);
    } finally {
      setCancelling(null);
    }
  }

  return {
    loading, loadError,
    tableInfo, items, activeOrders,
    fetchOrders, fetchTableInfo,
    cancelling, cancelOrder,
    fmt,
  };
}
