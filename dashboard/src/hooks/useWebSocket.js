import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Falls back to the vite proxy target in development
const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:3000`;

export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem('pos_token')) return;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'AUTH', token: localStorage.getItem('pos_token') }));
      };

      ws.onmessage = ({ data }) => {
        try {
          const { event } = JSON.parse(data);
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
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        // Reconnect after 5 s if still authenticated
        timerRef.current = setTimeout(() => {
          if (localStorage.getItem('pos_token')) connect();
        }, 5000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [qc]);
}