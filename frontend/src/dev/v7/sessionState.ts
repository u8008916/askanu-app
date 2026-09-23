/**
 * ARCHITECTURE PREP — opaque `conversation_state` transport.
 *
 * Reviewed against `askanu-rag` PR #34 ("V7 Day 1 — Freeze shared
 * conversational RAG contracts", open, not yet merged as of 23 Sep 2026).
 * That PR's wire contract is additive and, from the App's side, fully
 * opaque:
 *
 *   request  = existing envelope + optional conversation_state
 *   response = existing envelope + authoritative conversation_state
 *
 * Quoting askanu-rag's own updated `docs/API_CONTRACT.md`: "The App stores it
 * only for the current chat and sends it back unchanged... The App does not
 * semantically interpret it." Because of that, this module never types the
 * internal shape (`recent_entities`, `focus`, `result_sets`, `constraints`,
 * `pending_clarification`, ...) — those fields are Carmen's to define, and
 * Carmen's own contract doc says they can keep changing during review without
 * this module changing. It only implements the three operations the App is
 * actually responsible for: store the value the backend returned, send it
 * back unchanged, and drop it on Clear Chat.
 *
 * `askanu-rag`'s updated `docs/CONVERSATION_CONTRACT.md` names Clear Chat's
 * App-side half explicitly: "The App... sends the next request with empty
 * `history` and either omits `conversation_state` or sends the empty
 * schema-version-1 state." This module implements the "omit it" form —
 * `toRequestField` returns `undefined`, which a caller spreads away, matching
 * the "optional for backwards compatibility" wire rule RAG already documents.
 *
 * NOT WIRED INTO PRODUCTION. `frontend/src/types/api.ts` and
 * `chat/useChatSession.ts` do not import this file, and no `AskRequest`/
 * `AskResponse` field named `conversation_state` beyond the existing
 * `pending_clarification` one exists in the frozen v1 contract yet. Per
 * Qasim's 23 Sep instruction, App implementation does not lock onto
 * `askanu-rag` PR #34's schema until that PR is approved, merged, and Qasim
 * gives an explicit GO — this module exists so that wiring it in at that
 * point is a small additive change to `useChatSession.ts`, not a redesign.
 */

/**
 * The value RAG returns in `conversation_state`. Deliberately `unknown`, not
 * a typed interface — see the module doc comment. The App never inspects it.
 */
export type OpaqueConversationState = unknown;

export interface SessionStateHolder {
  /** `null` means "no state yet": a fresh session, or right after Clear Chat. */
  readonly state: OpaqueConversationState | null;
}

/** A fresh session, or the state immediately after Clear Chat. */
export function emptySessionState(): SessionStateHolder {
  return { state: null };
}

/**
 * What the next request's `conversation_state` field should be. Returns
 * `undefined` rather than `null` when nothing is held, so a caller can spread
 * it into a request object (`{ ...base, conversation_state: toRequestField(holder) }`
 * — or omit the key entirely with a conditional spread) and have an empty
 * session send no field at all, matching RAG's own "optional for backwards
 * compatibility" rule rather than sending an explicit `null` RAG would have
 * to special-case.
 */
export function toRequestField(holder: SessionStateHolder): OpaqueConversationState | undefined {
  return holder.state ?? undefined;
}

/**
 * Reads the authoritative state back out of a response envelope after a
 * successful turn. Never throws and never inspects the value's shape — an
 * envelope that omits `conversation_state` (a pre-V7 backend, or a controlled
 * error envelope that carries no state) degrades to `emptySessionState()`,
 * not a silently `undefined` field the next request would forget to omit
 * correctly.
 */
export function fromResponseEnvelope(
  response: { conversation_state?: OpaqueConversationState } | null | undefined,
): SessionStateHolder {
  if (response == null || !('conversation_state' in response)) {
    return emptySessionState();
  }
  return { state: response.conversation_state ?? null };
}

/**
 * Clear Chat's session-state half of the reset (`docs/V7_UI_CONTRACT.md` §5,
 * option A; confirmed by askanu-rag PR #34's `CONVERSATION_CONTRACT.md`
 * update). Pairs with clearing visible turns/`pendingClarification` exactly as
 * `chat/useChatSession.ts`'s `clearChat` already does for those two today —
 * this function exists only so the same "nothing is left anywhere to find"
 * property can be proven and tested on its own, independent of wiring it into
 * that hook once the schema is frozen.
 */
export function clearSessionState(): SessionStateHolder {
  return emptySessionState();
}
