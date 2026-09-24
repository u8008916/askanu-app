import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChatSession } from '../src/chat/useChatSession';
import type { AskRequest, AskResponse } from '../src/types/api';

/**
 * V7 (`askanu-rag` PR #34, merged `a7e9ed4`, Qasim GO 23 Sep 2026):
 * `conversation_state` transport through `useChatSession`, driven directly
 * against a scripted transport rather than through `App` — `chat/sessionState.ts`
 * is opaque by design, so these fixtures use arbitrary shapes on purpose.
 *
 * The property under test throughout, per Qasim's PM review of PR #40
 * (24 Sep 2026): a response that carries `conversation_state` is always the
 * new authority, replacing whatever was held — but a turn that produced no
 * authoritative RAG-authored envelope (a transport failure, or a controlled
 * envelope this App's own boundary server synthesised before reaching RAG)
 * must preserve whatever was held rather than dropping it. Only an explicit
 * Clear Chat, or RAG actually answering, may change what is held. A stale
 * follow-up after Clear Chat, or a response that settles too late to count,
 * must still never resolve against state from before Clear Chat.
 */

function buildResponse(overrides: Partial<AskResponse> = {}): AskResponse {
  return {
    status: 'ok',
    answer: 'Placeholder answer.',
    items: [],
    sources: [],
    clarification: null,
    request_id: 'req_test',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('conversation_state transport (V7 Day 2)', () => {
  it('echoes the previous response state back on the next request, by reference', async () => {
    const requests: AskRequest[] = [];
    const stateA = { schema_version: 1, turn_index: 1 };
    const stateB = { schema_version: 1, turn_index: 2 };
    const scripted = [
      buildResponse({ conversation_state: stateA, request_id: 'r1' }),
      buildResponse({ conversation_state: stateB, request_id: 'r2' }),
      buildResponse({ conversation_state: stateB, request_id: 'r3' }),
    ];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return scripted.shift() as AskResponse;
    });

    const { result } = renderHook(() => useChatSession(transport));

    // A fresh session has no state to echo: the legacy shape, unchanged.
    await act(async () => {
      await result.current.sendMessage('first question');
    });
    expect(requests[0].conversation_state).toEqual({ pending_clarification: null });

    await act(async () => {
      await result.current.sendMessage('second question');
    });
    // Not a deep-equal copy — the exact object the first response returned.
    expect(requests[1].conversation_state).toBe(stateA);

    await act(async () => {
      await result.current.sendMessage('third question');
    });
    expect(requests[2].conversation_state).toBe(stateB);
  });

  it('a stale follow-up after Clear Chat carries no prior state and empty history', async () => {
    const requests: AskRequest[] = [];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return buildResponse({
        conversation_state: { schema_version: 1, turn_index: requests.length },
        request_id: `r${requests.length}`,
      });
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('Tell me about Warrumbul');
    });

    act(() => {
      result.current.clearChat();
    });

    await act(async () => {
      await result.current.sendMessage('how much is it?');
    });

    const staleFollowUp = requests[1];
    expect(staleFollowUp.history).toEqual([]);
    expect(staleFollowUp.conversation_state).toEqual({ pending_clarification: null });
  });

  it('a response that settles after Clear Chat writes neither turns nor state', async () => {
    const requests: AskRequest[] = [];
    const late = deferred<AskResponse>();
    let call = 0;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      call += 1;
      if (call === 1) {
        return buildResponse({
          conversation_state: { turn_index: 1 },
          request_id: 'r1',
        });
      }
      // The second request never observes the abort — it settles anyway,
      // after Clear Chat has already moved on. `generationRef` is the
      // backstop this proves.
      return late.promise;
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('first');
    });

    let pendingSecondSend!: Promise<void>;
    act(() => {
      pendingSecondSend = result.current.sendMessage('second');
    });

    act(() => {
      result.current.clearChat();
    });
    expect(result.current.turns).toHaveLength(0);

    late.resolve(
      buildResponse({ conversation_state: { turn_index: 99 }, request_id: 'r2' }),
    );
    await act(async () => {
      await pendingSecondSend;
    });

    // The late response must not have resurrected a turn or the old state.
    expect(result.current.turns).toHaveLength(0);

    await act(async () => {
      await result.current.sendMessage('third');
    });
    expect(requests[2].conversation_state).toEqual({ pending_clarification: null });
  });

  /**
   * Qasim's PM review of PR #40 (24 Sep 2026): "absence of a new
   * authoritative response is not automatically evidence that the previous
   * authoritative state became invalid." A transport failure — no RAG
   * response was ever produced for that turn — must not itself become a
   * conversation reset. Required by that review: "receive valid state S1 →
   * next request fails before authoritative RAG response → retry still
   * sends S1; and Clear Chat after that still removes S1."
   */
  it('preserves the last authoritative state through a transport failure, and a retry sends it unchanged', async () => {
    const requests: AskRequest[] = [];
    const stateA = { schema_version: 1, turn_index: 1 };
    let call = 0;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      call += 1;
      if (call === 1) {
        return buildResponse({ conversation_state: stateA, request_id: 'r1' });
      }
      if (call === 2) {
        // No authoritative RAG response was ever produced for this turn.
        throw new Error('network down');
      }
      return buildResponse({ conversation_state: stateA, request_id: 'r3' });
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('first');
    });
    await act(async () => {
      // useChatSession catches this internally into a client-side error turn
      // — that turn is not RAG telling the App anything about state.
      await result.current.sendMessage('second');
    });
    await act(async () => {
      await result.current.sendMessage('third');
    });

    // The retry carries S1 byte-identical — not dropped, not the legacy
    // fallback either.
    expect(requests[2].conversation_state).toBe(stateA);
  });

  it('preserves the last authoritative state after a settled envelope with no conversation_state (App-server boundary, not RAG)', async () => {
    const requests: AskRequest[] = [];
    const stateA = { schema_version: 1, turn_index: 1 };
    let call = 0;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      call += 1;
      if (call === 1) {
        return buildResponse({ conversation_state: stateA, request_id: 'r1' });
      }
      // Models server/src/server.js's own errorEnvelope(): a real settled
      // response, but one this App's boundary synthesised (413/502) before
      // ever reaching RAG — it never carries conversation_state. Unlike a
      // RAG-authored error, which always carries the field (even an empty
      // one), this is the "no authoritative response" case.
      return buildResponse({
        status: 'error',
        answer: 'The request could not be completed.',
        request_id: 'r2',
      });
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('first');
    });
    await act(async () => {
      await result.current.sendMessage('second');
    });
    await act(async () => {
      await result.current.sendMessage('third');
    });

    expect(requests[2].conversation_state).toBe(stateA);
  });

  it('Clear Chat after a preserved state still removes it', async () => {
    const requests: AskRequest[] = [];
    const stateA = { schema_version: 1, turn_index: 1 };
    let call = 0;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      call += 1;
      if (call === 1) {
        return buildResponse({ conversation_state: stateA, request_id: 'r1' });
      }
      if (call === 2) {
        throw new Error('network down');
      }
      return buildResponse({ request_id: 'r3' });
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('first');
    });
    await act(async () => {
      await result.current.sendMessage('second');
    });

    // S1 is preserved (proven above) — now clear it explicitly.
    act(() => {
      result.current.clearChat();
    });

    await act(async () => {
      await result.current.sendMessage('third');
    });

    expect(requests[2].conversation_state).toEqual({ pending_clarification: null });
  });

  it('a genuinely RAG-authored error response still replaces the held state, even with an empty reset value', async () => {
    const requests: AskRequest[] = [];
    const stateA = { schema_version: 1, turn_index: 1 };
    const ragEmptyState = { schema_version: 1, turn_index: 0 };
    let call = 0;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      call += 1;
      if (call === 1) {
        return buildResponse({ conversation_state: stateA, request_id: 'r1' });
      }
      // RAG itself answered with a controlled error, but it is still an
      // authoritative envelope: it carries conversation_state (per PR #34,
      // present on every /api/v1/ask status RAG answers), even though the
      // value is a reset/empty one. This must replace stateA, not preserve it.
      return buildResponse({
        status: 'error',
        conversation_state: ragEmptyState,
        request_id: 'r2',
      });
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('first');
    });
    await act(async () => {
      await result.current.sendMessage('second');
    });
    await act(async () => {
      await result.current.sendMessage('third');
    });

    expect(requests[2].conversation_state).toBe(ragEmptyState);
  });

  it('falls back to the legacy pending_clarification shape when no versioned state is held', async () => {
    const requests: AskRequest[] = [];
    const clarification = {
      id: 'clar-1',
      type: 'entity_selection',
      options: [{ id: 'a', label: 'Option A' }],
      allow_multiple: false,
    };
    // A pre-V7 backend: every response omits conversation_state entirely.
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return buildResponse({
        status: 'needs_clarification',
        clarification,
        request_id: `r${requests.length}`,
      });
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('which course do you mean?');
    });
    await act(async () => {
      await result.current.sendMessage('the first one');
    });

    expect(requests[1].conversation_state).toEqual({
      pending_clarification: clarification,
    });
  });
});
