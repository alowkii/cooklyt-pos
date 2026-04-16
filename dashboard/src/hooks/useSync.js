import { useEffect, useRef } from 'react';
import { useOnline } from './useOnline';
import { flushQueue } from '../store/syncQueue';
import { queryClient } from '../lib/queryClient';

// Watches connectivity. When we come back online after being offline,
// flush the mutation queue then invalidate all queries to get fresh data.
export function useSync() {
  const online = useOnline();
  const wasOffline = useRef(!online);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      flushQueue().then(({ synced, errors }) => {
        if (synced > 0 || errors > 0) {
          // Refresh all data after flushing so the UI reflects server state
          queryClient.invalidateQueries();
        }
      });
    }
  }, [online]);
}