import { useCallback, useState } from 'react';
import type { Clarification, TurnRole } from '../types/api';

export interface ChatTurn {
  id: string;
  role: TurnRole;
  content: string;
}

let turnCounter = 0;

function nextTurnId(): string {
  turnCounter += 1;
  return `turn-${turnCounter}`;
}

/**
 * Current-session chat state.
 *
 * Day 1 is mock-only: sending a message records the user's turn so the empty
 * state can retire. Requesting an answer from `/api/v1/ask` is Day 3.
 */
export function useChatSession() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pendingClarification, setPendingClarification] =
    useState<Clarification | null>(null);

  const sendMessage = useCallback((rawText: string) => {
    const content = rawText.trim();
    if (content === '') {
      return;
    }
    setTurns((current) => [
      ...current,
      { id: nextTurnId(), role: 'user', content },
    ]);
  }, []);

  /**
   * CONVERSATION_CONTRACT.md: Clear Chat clears the visible chat, the
   * current-session context and any pending clarification, which restores the
   * `Try asking` empty state. It does not touch source data or require login.
   */
  const clearChat = useCallback(() => {
    setTurns([]);
    setPendingClarification(null);
  }, []);

  return {
    turns,
    pendingClarification,
    setPendingClarification,
    sendMessage,
    clearChat,
    isEmpty: turns.length === 0,
  };
}
