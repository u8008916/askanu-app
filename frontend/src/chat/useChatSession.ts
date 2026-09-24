import { useCallback, useEffect, useRef, useState } from 'react';
import { HISTORY_MAX_TURNS } from '../types/api';
import type { AskRequest, AskResponse, Clarification, HistoryTurn } from '../types/api';
import { askTransport } from './askTransport';
import type { AskTransport } from './askTransport';
import {
  advanceSessionState,
  clearSessionState,
  emptySessionState,
  requestConversationState,
} from './sessionState';
import type { SessionStateHolder } from './sessionState';

/**
 * A turn as the UI holds it.
 *
 * `pending` is the in-flight placeholder; it is replaced in place by the
 * `assistant` turn that answers it, which is why they share an id.
 */
export type ChatTurn =
  | { kind: 'user'; id: string; content: string }
  | { kind: 'pending'; id: string }
  | { kind: 'assistant'; id: string; response: AskResponse };

let turnCounter = 0;

function nextTurnId(): string {
  turnCounter += 1;
  return `turn-${turnCounter}`;
}

/**
 * Client-side transport failure — the request never produced an envelope, so
 * there is no `request_id`. This is not backend copy: it is the App reporting
 * that it could not reach the service, using the `error` status the contract
 * already defines for that class of failure.
 */
const TRANSPORT_FAILURE: AskResponse = {
  status: 'error',
  answer: 'AskANU could not be reached. Please try again.',
  items: [],
  sources: [],
  clarification: null,
  request_id: '',
};

/**
 * API_CONTRACT.md: `history` carries at most the last 10 prior turns. Pending
 * turns have no content yet and are skipped; an assistant turn contributes the
 * answer text it displayed.
 */
function toHistory(turns: ChatTurn[]): HistoryTurn[] {
  const history: HistoryTurn[] = [];
  for (const turn of turns) {
    if (turn.kind === 'user') {
      history.push({ turn_id: turn.id, role: 'user', content: turn.content });
    } else if (turn.kind === 'assistant') {
      history.push({
        turn_id: turn.id,
        role: 'assistant',
        content: turn.response.answer,
      });
    }
  }
  return history.slice(-HISTORY_MAX_TURNS);
}

/**
 * Current-session chat state.
 *
 * `transport` defaults to the selected transport — the real `/api/v1/ask`
 * client, or the dev mock when `VITE_USE_MOCK_TRANSPORT=1`. It stays a
 * parameter so tests can inject their own without touching a component.
 *
 * CONVERSATION_CONTRACT.md: context is current-session only. Nothing here is
 * persisted, and no profile or account is involved.
 */
export function useChatSession(transport: AskTransport = askTransport) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pendingClarification, setPendingClarification] =
    useState<Clarification | null>(null);
  const [isSending, setIsSending] = useState(false);
  /*
   * The V7 `conversation_state` last acknowledged by an authoritative RAG
   * response — not simply "what the last response returned": a turn that
   * produced no RAG-authored envelope (transport failure, App-server
   * boundary error) leaves this untouched rather than clearing it
   * (`advanceSessionState` in `chat/sessionState.ts`, which documents the
   * full store/echo/preserve/clear contract). `sessionStateRef` (not React
   * state) because it is never read for rendering — only `sendMessage` reads
   * it, at send time, and it must not itself trigger a re-render.
   */
  const sessionStateRef = useRef<SessionStateHolder>(emptySessionState());

  /*
   * A cleared or superseded request must not be able to write into the chat
   * when it finally settles. The controller cancels the request itself; the
   * generation counter is the backstop for a transport that ignores the signal.
   */
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      generationRef.current += 1;
      controllerRef.current?.abort();
    },
    [],
  );

  const sendMessage = useCallback(
    async (rawText: string) => {
      const content = rawText.trim();
      // One question at a time: the contract's history model cannot represent
      // two overlapping requests.
      if (content === '' || isSending) {
        return;
      }

      const request: AskRequest = {
        question: content,
        history: toHistory(turns),
        conversation_state: requestConversationState(
          sessionStateRef.current,
          pendingClarification,
        ),
      };

      const pendingId = nextTurnId();
      setTurns((current) => [
        ...current,
        { kind: 'user', id: nextTurnId(), content },
        { kind: 'pending', id: pendingId },
      ]);
      setIsSending(true);

      const generation = generationRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;

      let response: AskResponse;
      try {
        response = await transport(request, controller.signal);
      } catch {
        if (generation !== generationRef.current) {
          return;
        }
        response = TRANSPORT_FAILURE;
      }

      if (generation !== generationRef.current) {
        return;
      }

      setTurns((current) =>
        current.map((turn) =>
          turn.id === pendingId
            ? { kind: 'assistant', id: pendingId, response }
            : turn,
        ),
      );
      // The response's clarification is the whole pending state: a response
      // without one clears it, which is what the contract requires when a
      // clarification is resolved, corrected or the topic switches.
      setPendingClarification(response.clarification);
      // Same rule for the versioned state, with one asymmetry from
      // `pendingClarification` above (Qasim's PM review of PR #40, 24 Sep
      // 2026): a response that actually carries `conversation_state` is
      // always the new sole authority, even a RAG-authored error envelope —
      // but a response with no state at all (a transport failure, or a
      // controlled envelope this App's own boundary server synthesised
      // before ever reaching RAG) means no authoritative reply was received
      // for this turn, so the previously held state is preserved rather than
      // dropped. A failed request must not itself become a conversation
      // reset — only an explicit Clear Chat, or RAG actually answering, may
      // change what is held.
      sessionStateRef.current = advanceSessionState(sessionStateRef.current, response);
      setIsSending(false);
      controllerRef.current = null;
    },
    [isSending, pendingClarification, transport, turns],
  );

  /**
   * CONVERSATION_CONTRACT.md: Clear Chat clears the visible chat, the
   * current-session context and any pending clarification, which restores the
   * `Try asking` empty state. It does not touch source data or require login.
   */
  const clearChat = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setTurns([]);
    setPendingClarification(null);
    sessionStateRef.current = clearSessionState();
    setIsSending(false);
  }, []);

  return {
    turns,
    pendingClarification,
    isSending,
    sendMessage,
    clearChat,
    isEmpty: turns.length === 0,
  };
}
