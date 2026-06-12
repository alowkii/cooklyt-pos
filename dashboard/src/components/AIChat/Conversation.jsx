import { useEffect, useRef, useState } from 'react';
import { ArrowUp, AlertTriangle } from 'lucide-react';
import { useAIChat } from '../../context/AIContext';
import { useAuth } from '../../hooks/useAuth';
import { ASSISTANT, greeting, PROMPT_GROUPS } from './assistant';

// Minimal markdown: **bold** and bullet/numbered lines. The model is prompted
// to answer in short lists, so this covers what it actually produces.
function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
  );
}

function MessageBody({ content }) {
  return content.split('\n').map((line, i) => {
    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (bullet) {
      return (
        <div key={i} className="flex gap-2 pl-1">
          <span style={{ color: 'var(--mute-2)', flexShrink: 0 }}>•</span>
          <span><Inline text={bullet[1]} /></span>
        </div>
      );
    }
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    return <div key={i}><Inline text={line} /></div>;
  });
}

export default function Conversation({ showPrompts = true, layout = 'panel' }) {
  const { messages, streaming, pendingConfirm, confirming, send, respondConfirm } = useAIChat();
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingConfirm, streaming]);

  const submit = () => {
    if (!draft.trim() || streaming) return;
    send(draft);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-5 pt-1">
            <div>
              <p className="m-0" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em', color: 'var(--ink)' }}>
                {greeting(user?.name?.split(' ')[0])}
              </p>
              <p className="m-0 mt-1.5" style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.5 }}>
                I'm reading tonight's waste, stock and sales as they happen. What do you want to know?
              </p>
            </div>

            {showPrompts && (
              <div className={layout === 'page' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'flex flex-col gap-3.5'}>
                {PROMPT_GROUPS.map((g) => (
                  <div key={g.label} className="flex flex-col gap-2">
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--label)' }}>
                      {g.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.prompts.map((p) => (
                        <button
                          key={p.short}
                          onClick={() => send(p.full)}
                          className="cursor-pointer transition-colors"
                          style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 11px' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.background = 'var(--paper-3)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--paper-2)'; }}
                        >
                          {p.short}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((m, i) => {
            if (m.role === 'error') {
              return (
                <div key={i} className="flex items-start gap-2 rounded-[10px] px-3 py-2" style={{ background: 'var(--bad-soft)', fontSize: 12.5, color: 'var(--bad)', lineHeight: 1.45, animation: 'ai-rise .25s ease both' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {m.content}
                </div>
              );
            }
            const isUser = m.role === 'user';
            return (
              <div key={i} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className="px-3 py-2"
                  style={{
                    maxWidth: '86%',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    animation: 'ai-rise .25s ease both',
                    ...(isUser
                      ? { background: 'var(--ink)', color: 'var(--accent-on)', borderRadius: '12px 12px 4px 12px' }
                      : { background: 'var(--paper-2)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '12px 12px 12px 4px' }),
                  }}
                >
                  <MessageBody content={m.content} />
                </div>
              </div>
            );
          })}

          {streaming && !messages[messages.length - 1]?.streaming && (
            <div className="flex justify-start">
              <span className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: '11px 11px 11px 4px', fontSize: 12.5, color: 'var(--mute)' }}>
                {ASSISTANT.name} is thinking
                <span className="flex gap-[3px]">
                  <span className="ai-dot" />
                  <span className="ai-dot" style={{ animationDelay: '.15s' }} />
                  <span className="ai-dot" style={{ animationDelay: '.3s' }} />
                </span>
              </span>
            </div>
          )}

          {pendingConfirm && (
            <div className="p-3" style={{ background: 'var(--paper)', border: '1px solid var(--line-2)', borderLeft: '3px solid var(--warn)', borderRadius: '4px 10px 10px 4px', animation: 'ai-rise .25s ease both' }}>
              <p className="m-0" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--warn)' }}>
                Confirm before I act
              </p>
              <p className="m-0 mt-1.5" style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.45 }}>{pendingConfirm.summary}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => respondConfirm(true)} disabled={confirming} className="btn-primary btn-sm">
                  {confirming ? 'Working…' : 'Confirm'}
                </button>
                <button onClick={() => respondConfirm(false)} disabled={confirming} className="btn-secondary btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder={`Message ${ASSISTANT.name}…`}
          className="input flex-1 resize-none"
          style={{ minHeight: 38, maxHeight: 96, lineHeight: 1.4, borderRadius: 9, padding: '9px 12px' }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || streaming}
          title="Send"
          className="grid flex-shrink-0 cursor-pointer place-items-center disabled:opacity-50"
          style={{ width: 38, height: 38, borderRadius: 9, border: 0, background: 'var(--ink)', color: 'var(--accent-on)' }}
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}
