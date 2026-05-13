import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getPendingCount } from '../store/syncQueue';

export default function SyncBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    async function check() {
      const n = await getPendingCount();
      if (alive) setCount(n);
    }
    check();
    const id = setInterval(check, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (count === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ fontSize: 11.5, fontWeight: 500, background: 'rgba(179,120,31,.1)', color: 'var(--warn)' }}
    >
      <RefreshCw size={11} className="animate-spin" />
      {count} pending sync
    </span>
  );
}
