import { useState, useCallback } from 'react';

const MAX = 40;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const add = useCallback((event, token) => {
    setNotifications((prev) => [
      { id: Date.now() + Math.random(), event, token: token ?? null, ts: Date.now(), read: false },
      ...prev,
    ].slice(0, MAX));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, add, markAllRead, clearAll };
}
