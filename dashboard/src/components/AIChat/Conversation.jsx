import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, AlertTriangle } from 'lucide-react';
import { useAIChat } from '../../context/AIContext';

const QUICK_PROMPTS = [
  'What got wasted this week, and what did it cost?',
  'Which ingredients need reordering?',
  'Which recipes have the worst food-cost %?',
  'What were the top sellers in the last 7 days?',
];

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

export default function Conversation({ showPrompts = true }) {
  const { messages, streaming, pendingConfirm, confirming, send, respondConfirm } = useAIChat();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingConfirm]);

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
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span style={{ display: 'inline-grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: 'var(--paper-2)', color: 'var(--ink)' }}>
              <Sparkles size={18} />
            </span>
            <div>
              <p className="m-0" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Ask about your restaurant</p>
              <p className="m-0 mt-1" style={{ fontSize: 12, color: 'var(--mute)', maxWidth: 260 }}>
                Waste, stock, recipe margins, sales — answered from your live data.
              </p>
            </div>
            {showPrompts && (
              <div className="flex flex-col gap-1.5 w-full max-w-[300px]">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-[6px] px-3 py-2 text-left cursor-pointer transition-colors"
                    style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--paper)', border: '1px solid var(--line-2)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((m, i) => {
            if (m.role === 'error') {
              return (
                <div key={i} className="flex items-start gap-2 rounded-[6px] px-3 py-2" style={{ background: 'var(--bad-soft)', fontSize: 12.5, color: 'var(--bad)' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {m.content}
                </div>
              );
            }
            const isUser = m.role === 'user';
            return (
              <div key={i} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className="rounded-[8px] px-3 py-2"
                  style={{
                    maxWidth: '85%',
                    fontSize: 13,
                    lineHeight: 1.55,
                    ...(isUser
                      ? { background: 'var(--ink)', color: 'var(--accent-on)' }
                      : { background: 'var(--paper-2)', color: 'var(--ink)', border: '1px solid var(--line)' }),
                  }}
                >
                  <MessageBody content={m.content} />
                </div>
              </div>
            );
          })}

          {streaming && !messages[messages.length - 1]?.streaming && (
            <div className="flex justify-start">
              <span className="rounded-[8px] px-3 py-2" style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--mute)' }}>
                Thinking…
              </span>
            </div>
          )}

          {pendingConfirm && (
            <div className="rounded-[8px] p-3" style={{ background: 'var(--paper)', border: '1px solid var(--line-2)', borderLeft: '3px solid var(--warn)' }}>
              <p className="m-0" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute)', fontWeight: 600 }}>
                Confirm action
              </p>
              <p className="m-0 mt-1.5" style={{ fontSize: 13, color: 'var(--ink)' }}>{pendingConfirm.summary}</p>
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
          placeholder="Ask about waste, stock, sales…"
          className="input flex-1 resize-none"
          style={{ minHeight: 34, maxHeight: 96, lineHeight: 1.4 }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || streaming}
          className="btn-primary"
          style={{ height: 34, paddingLeft: 12, paddingRight: 12 }}
          title="Send"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
