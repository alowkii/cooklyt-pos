import { useState, useCallback } from 'react';

const MAX = 40;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const add = useCallback((event, token) => {
    setNotifications((prev) => {
      // Deduplicate: same event + token arriving within 2 s = stale duplicate connection
      const isDuplicate = prev.some(
        (n) => n.event === event && n.token === token && Date.now() - n.ts < 2000,
      );
      if (isDuplicate) return prev;
      return [
        { id: Date.now() + Math.random(), event, token: token ?? null, ts: Date.now(), read: false },
        ...prev,
      ].slice(0, MAX);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, add, markAllRead, clearAll };
}
