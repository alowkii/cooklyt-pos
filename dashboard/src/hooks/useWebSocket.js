import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Falls back to the vite proxy target in development
const WS_URL = import.meta.env.VITE_WS_URL ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export function useWebSocket({ onEvent } = {}) {
  const qc = useQueryClient();
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  // Stable ref so changing the callback never triggers a reconnect
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    if (!localStorage.getItem('pos_token')) return;

    let mounted = true;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'AUTH', token: localStorage.getItem('pos_token') }));
      };

      ws.onmessage = ({ data }) => {
        try {
          const { event, data: payload } = JSON.parse(data);
          switch (event) {
            case 'NEW_ORDER':
            case 'ORDER_UPDATED':
            case 'ORDER_STATUS_CHANGED':
            case 'ORDER_PREPARING':
            case 'ORDER_READY':
              qc.invalidateQueries({ queryKey: ['kitchen'] });
              qc.invalidateQueries({ queryKey: ['orders'] });
              break;
            case 'PAYMENT_COMPLETED':
              qc.invalidateQueries({ queryKey: ['orders'] });
              qc.invalidateQueries({ queryKey: ['tables'] });
              qc.invalidateQueries({ queryKey: ['reports'] });
              break;
            case 'TABLE_UPDATED':
              qc.invalidateQueries({ queryKey: ['tables'] });
              break;
            case 'STAFF_ASSIGNED':
              qc.invalidateQueries({ queryKey: ['orders'] });
              qc.invalidateQueries({ queryKey: ['tables'] });
              break;
          }
          onEventRef.current?.(event, payload ?? {});
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        // Skip reconnect if this effect instance was already cleaned up
        if (!mounted) return;
        timerRef.current = setTimeout(() => {
          if (localStorage.getItem('pos_token')) connect();
        }, 5000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      mounted = false;
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [qc]);
}