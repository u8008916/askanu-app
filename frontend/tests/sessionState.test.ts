import { describe, expect, it } from 'vitest';
import {
  clearSessionState,
  emptySessionState,
  fromResponseEnvelope,
  toRequestField,
} from '../src/chat/sessionState';

/**
 * Pins the App-side transport contract reviewed against `askanu-rag` PR #34
 * (`docs/V7_UI_CONTRACT.md` §9): store the authoritative `conversation_state`
 * a response returns, echo it back unchanged, and drop it on Clear Chat.
 * Deliberately never constructs or inspects a realistic `conversation_state`
 * shape — that shape is Carmen's, still under review, and this module (and
 * this test) must stay correct regardless of what it ends up containing.
 */
describe('V7 session-state transport architecture', () => {
  it('starts empty and omits the field entirely from the first request', () => {
    const holder = emptySessionState();
    expect(holder.state).toBeNull();
    expect(toRequestField(holder)).toBeUndefined();
  });

  it('stores an opaque value from a response and echoes it back unchanged', () => {
    // An arbitrary, unrealistic shape on purpose: this module must not care.
    const opaque = { anything: 'at all', nested: [1, 2, 3] };
    const holder = fromResponseEnvelope({ conversation_state: opaque });

    // Identity-preserved, not cloned or re-serialized.
    expect(holder.state).toBe(opaque);
    expect(toRequestField(holder)).toBe(opaque);
  });

  it('degrades to empty state when the response omits conversation_state', () => {
    const holder = fromResponseEnvelope({});
    expect(holder.state).toBeNull();
    expect(toRequestField(holder)).toBeUndefined();
  });

  it('degrades to empty state for a null/undefined response (transport failure)', () => {
    expect(fromResponseEnvelope(null).state).toBeNull();
    expect(fromResponseEnvelope(undefined).state).toBeNull();
  });

  it('treats an explicit null conversation_state the same as omitted', () => {
    const holder = fromResponseEnvelope({ conversation_state: null });
    expect(holder.state).toBeNull();
    expect(toRequestField(holder)).toBeUndefined();
  });

  it('Clear Chat drops a previously stored state entirely', () => {
    const stored = fromResponseEnvelope({ conversation_state: { turn_index: 7 } });
    expect(toRequestField(stored)).toEqual({ turn_index: 7 });

    const cleared = clearSessionState();
    expect(cleared.state).toBeNull();
    expect(toRequestField(cleared)).toBeUndefined();

    // The cleared holder is independent: nothing from `stored` survives in it.
    expect(cleared).not.toBe(stored);
  });

  it('a full round trip (store -> next request -> Clear Chat -> next request) never leaks stale state', () => {
    let holder = emptySessionState();
    expect(toRequestField(holder)).toBeUndefined();

    holder = fromResponseEnvelope({ conversation_state: { turn_index: 1, focus: 'COMP1110' } });
    expect(toRequestField(holder)).toEqual({ turn_index: 1, focus: 'COMP1110' });

    holder = fromResponseEnvelope({ conversation_state: { turn_index: 2, focus: 'COMP1110' } });
    expect(toRequestField(holder)).toEqual({ turn_index: 2, focus: 'COMP1110' });

    holder = clearSessionState();
    // A stale follow-up sent right after Clear Chat carries no field at all —
    // there is nothing left anywhere for the backend to resolve against.
    expect(toRequestField(holder)).toBeUndefined();
  });
});
