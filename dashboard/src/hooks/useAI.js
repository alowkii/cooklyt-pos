import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

function getSessionId() {
  let id = sessionStorage.getItem('ai_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('ai_session_id', id);
  }
  return id;
}

export function useAIStatus(enabled = true) {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => (await api.get('/ai/status')).data,
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  });
}

// One chat conversation. Mount this once (via AIContext) so the bubble panel and
// the /ai-chat page share the same message list.
export function useAIChatInternal() {
  const [messages, setMessages] = useState([]);       // { role: 'user'|'assistant'|'error', content }
  const [streaming, setStreaming] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null); // { tool, args, summary }
  const [confirming, setConfirming] = useState(false);
  const sessionRef = useRef(getSessionId());

  const appendDelta = (delta) =>
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === 'assistant' && last.streaming) {
        next[next.length - 1] = { ...last, content: last.content + delta };
      } else {
        next.push({ role: 'assistant', content: delta, streaming: true });
      }
      return next;
    });

  const finishStreaming = () =>
    setMessages((prev) =>
      prev
        .filter((m) => !(m.streaming && !m.content.trim()))
        .map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );

  const send = useCallback(async (text) => {
    const message = text?.trim();
    if (!message || streaming) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setPendingConfirm(null);
    setStreaming(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionRef.current, message }),
      });

      if (res.status === 401) {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_restaurant');
        window.location.href = '/login';
        return;
      }
      if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `AI service error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          const data = part.replace(/^data:\s*/, '').trim();
          if (!data) continue;
          let ev;
          try { ev = JSON.parse(data); } catch { continue; }

          if (ev.type === 'text')             appendDelta(ev.delta);
          if (ev.type === 'data')             setMessages((prev) => [...prev, { role: 'data', kind: ev.kind, payload: ev.payload }]);
          if (ev.type === 'confirm_required') setPendingConfirm({ tool: ev.tool, args: ev.args, summary: ev.summary });
          if (ev.type === 'error')            setMessages((prev) => [...prev, { role: 'error', content: ev.message }]);
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', content: err.message || 'Could not reach the AI service.' }]);
    } finally {
      finishStreaming();
      setStreaming(false);
    }
  }, [streaming]);

  const respondConfirm = useCallback(async (confirmed) => {
    if (!pendingConfirm || confirming) return;
    setConfirming(true);
    try {
      const { data } = await api.post('/ai/confirm', {
        sessionId: sessionRef.current,
        tool: pendingConfirm.tool,
        args: pendingConfirm.args,
        confirmed,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setPendingConfirm(null);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', content: err.response?.data?.error || 'Action failed.' }]);
    } finally {
      setConfirming(false);
    }
  }, [pendingConfirm, confirming]);

  const reset = useCallback(() => {
    sessionRef.current = crypto.randomUUID();
    sessionStorage.setItem('ai_session_id', sessionRef.current);
    setMessages([]);
    setPendingConfirm(null);
  }, []);

  return { messages, streaming, pendingConfirm, confirming, send, respondConfirm, reset };
}
