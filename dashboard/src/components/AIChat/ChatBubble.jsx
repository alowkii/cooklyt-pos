import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X, Maximize2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAIStatus } from '../../hooks/useAI';
import { useAIChat } from '../../context/AIContext';
import Conversation from './Conversation';

export default function ChatBubble() {
  const { panelOpen: open, setPanelOpen: setOpen } = useAIChat();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const allowed = user?.role === 'admin' || user?.role === 'staff';
  const { data: status } = useAIStatus(allowed);

  // Hidden for roles without API access, when the model is down, or on the
  // full-page chat itself
  if (!allowed || status?.ok === false || location.pathname === '/ai-chat') return null;

  return createPortal(
    <>
      {open && (
        <div
          className="fixed z-[55] flex flex-col overflow-hidden inset-x-0 bottom-0 h-[78vh] rounded-t-[12px] sm:inset-x-auto sm:right-5 sm:bottom-[84px] sm:h-[560px] sm:max-h-[calc(100vh-120px)] sm:w-[380px] sm:rounded-[12px]"
          style={{ background: 'var(--paper)', border: '1px solid var(--line-2)', boxShadow: '0 24px 64px -16px rgba(10,10,10,.28)' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              <Sparkles size={14} />
              AI Assistant
            </span>
            <span className="flex items-center gap-1">
              <button
                onClick={() => { setOpen(false); navigate('/ai-chat', { state: { from: location.pathname } }); }}
                title="Open full page"
                className="rounded-md p-1.5 cursor-pointer transition-colors"
                style={{ color: 'var(--mute)', background: 'transparent', border: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; }}
              >
                <Maximize2 size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 cursor-pointer transition-colors"
                style={{ color: 'var(--mute)', background: 'transparent', border: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; }}
              >
                <X size={15} />
              </button>
            </span>
          </div>
          <Conversation />
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        title="AI Assistant"
        className="fixed bottom-5 right-5 z-[55] flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-105"
        style={{
          width: 48,
          height: 48,
          background: 'var(--ink)',
          color: 'var(--accent-on)',
          border: 0,
          boxShadow: '0 10px 28px -8px rgba(10,10,10,.45)',
        }}
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>
    </>,
    document.body,
  );
}
