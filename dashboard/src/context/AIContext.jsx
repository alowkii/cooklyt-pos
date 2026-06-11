import { createContext, useContext } from 'react';
import { useAIChatInternal } from '../hooks/useAI';

// Holds the single chat conversation so the floating panel and the /ai-chat
// page show the same messages.
const AIContext = createContext(null);

export function AIProvider({ children }) {
  const chat = useAIChatInternal();
  return <AIContext.Provider value={chat}>{children}</AIContext.Provider>;
}

export const useAIChat = () => useContext(AIContext);
