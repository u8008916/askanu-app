import type { ClarificationSelectionRequest, SelectedResultRequest } from '../types/api';

/**
 * V7 Day 4 (`askanu-rag` PR #38, `carmen/v7-day4-accommodation-vertical`, tip
 * `3c8e35e` — not yet merged): the composer prefill a card's "Ask about this"
 * or the clarification "Use selection" produces, paired with the exact
 * structured payload it should carry if sent unchanged.
 *
 * Pulled out of `App.tsx` as its own pure function so the pairing rule —
 * attach the structured payload only when the student sends the prefill
 * exactly as given, drop it on any edit — is directly unit-testable without
 * driving the DOM or a transport.
 */
export interface PendingStructuredPrefill {
  prefillText: string;
  selectedResult?: SelectedResultRequest;
  clarificationSelection?: ClarificationSelectionRequest;
}

export interface StructuredTurnRequest {
  selectedResult?: SelectedResultRequest;
  clarificationSelection?: ClarificationSelectionRequest;
}

/**
 * `App.tsx` calls this once per send and always clears the pending prefill
 * afterward regardless of the result — a match is one-shot, and a stale
 * pending prefill must never attach to a later, unrelated send.
 */
export function resolveStructuredPayload(
  pending: PendingStructuredPrefill | null,
  sentText: string,
): StructuredTurnRequest | undefined {
  if (pending === null || pending.prefillText !== sentText) {
    return undefined;
  }
  return {
    selectedResult: pending.selectedResult,
    clarificationSelection: pending.clarificationSelection,
  };
}
