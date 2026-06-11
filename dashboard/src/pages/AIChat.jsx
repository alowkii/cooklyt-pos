import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, RotateCcw, Minimize2 } from 'lucide-react';
import { useAIChat } from '../context/AIContext';
import { useAIStatus } from '../hooks/useAI';
import Conversation from '../components/AIChat/Conversation';

export default function AIChat() {
  const { reset, messages, setPanelOpen } = useAIChat();
  const { data: status, isLoading } = useAIStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const minimize = () => {
    setPanelOpen(true);
    navigate(location.state?.from || '/overview');
  };

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-2" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--ink)' }}>
            <Sparkles size={17} />
            AI Assistant
          </h1>
          <p className="m-0 mt-0.5" style={{ fontSize: 12.5, color: 'var(--mute)' }}>
            Answers from your live waste, inventory, recipe, and sales data. Changes always ask for confirmation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={reset} className="btn-secondary btn-sm" title="Start a new conversation">
              <RotateCcw size={12} />
              New chat
            </button>
          )}
          <button onClick={minimize} className="btn-secondary btn-sm" title="Collapse to floating panel">
            <Minimize2 size={12} />
            Minimize
          </button>
        </div>
      </div>

      {!isLoading && status?.ok === false ? (
        <div className="rounded-[8px] p-4" style={{ background: 'var(--warn-soft)', fontSize: 13, color: 'var(--ink-2)' }}>
          The AI service is offline right now. Everything else in the dashboard keeps working — try again in a bit.
        </div>
      ) : (
        <div className="flex-1 min-h-0 rounded-[10px] overflow-hidden" style={{ background: 'var(--paper)', border: '1px solid var(--line-2)' }}>
          <Conversation />
        </div>
      )}
    </div>
  );
}
