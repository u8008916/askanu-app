/**
 * Opaque `conversation_state` transport (V7 Day 2).
 *
 * Reviewed and wired against `askanu-rag` PR #34 ("V7 Day 1 — Freeze shared
 * conversational RAG contracts"), approved and merged by Qasim 23 Sep 2026
 * (merge commit `a7e9ed4`) — the explicit GO `docs/V7_UI_CONTRACT.md` §8/§9
 * required before this shipped. That PR's wire contract is additive and,
 * from the App's side, fully opaque:
 *
 *   request  = existing envelope + optional conversation_state
 *   response = existing envelope + authoritative conversation_state
 *
 * Quoting askanu-rag's own updated `docs/API_CONTRACT.md`: "The App stores it
 * only for the current chat and sends it back unchanged... The App does not
 * semantically interpret it." Because of that, this module never types the
 * internal shape (`recent_entities`, `focus`, `result_sets`, `constraints`,
 * `pending_clarification`, ...) — those fields are Carmen's, versioned
 * (`schema_version: 1`) and validated server-side. It only implements what
 * the App is actually responsible for: store the value an authoritative
 * response returns, send it back unchanged, preserve it — not drop it —
 * across a turn where no authoritative response was received at all (Qasim's
 * PM review of PR #40, 24 Sep 2026: `advanceSessionState`), and drop it only
 * on an explicit Clear Chat.
 *
 * `askanu-rag`'s updated `docs/CONVERSATION_CONTRACT.md` names Clear Chat's
 * App-side half explicitly: "The App... sends the next request with empty
 * `history` and either omits `conversation_state` or sends the empty
 * schema-version-1 state." This module implements the "omit it" form —
 * `toRequestField` returns `undefined`, which a caller spreads away, matching
 * the "optional for backwards compatibility" wire rule RAG already documents.
 *
 * Wired into production in `chat/useChatSession.ts`, at the same three
 * points `pendingClarification` already updates: send, response, Clear Chat.
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
 * Reads the authoritative state out of a response envelope that is known to
 * carry one. Never throws and never inspects the value's shape. An envelope
 * that omits `conversation_state` degrades to `emptySessionState()` here —
 * callers that must instead *preserve* whatever was held before such an
 * envelope (the normal case after a settled turn; see `advanceSessionState`)
 * do not call this function directly for that decision.
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
 * What `useChatSession` holds after a turn settles (V7 Day 2 correction,
 * Qasim's PM review of PR #40, 24 Sep 2026).
 *
 * The rule: *absence of a new authoritative response is not automatically
 * evidence that the previous authoritative state became invalid.*
 * `conversation_state` is present on every `/api/v1/ask` status RAG itself
 * answers — `ok`, `error`, `insufficient_evidence`, all of it — because RAG
 * is telling the App what the state now is, even when that turn failed
 * semantically. It is *absent* only when no RAG-authored envelope was ever
 * produced for this turn: a client-side transport failure (`askApi.ts`
 * throwing before any envelope exists), or a controlled envelope this App's
 * own boundary server synthesised before reaching RAG at all (`413` body too
 * large, `502` upstream unreachable/token failure — `server/src/server.js`'s
 * `errorEnvelope()` never sets the field, exactly so this distinction is
 * visible here). Only that second case — no authoritative response reached
 * — preserves `current` unchanged, so a retry still carries the last state
 * RAG actually acknowledged rather than starting the conversation over.
 * A response that does carry the field always wins, replacing `current`
 * outright, even when the value is RAG's own empty/reset default — that is
 * still RAG being authoritative about what the state is now. An explicit
 * `conversation_state: null` is treated the same as the key being absent
 * (also "no signal" — matches `fromResponseEnvelope`'s existing null/omitted
 * equivalence elsewhere): RAG's own reset value is always a real, if mostly
 * empty, schema-version-1 object, never a bare `null`, so this never fires
 * against a genuine RAG reset in practice — it only makes this primitive
 * correct on its own terms rather than relying on `askResponse.ts` having
 * already normalised null away upstream.
 */
export function advanceSessionState(
  current: SessionStateHolder,
  response: { conversation_state?: OpaqueConversationState } | null | undefined,
): SessionStateHolder {
  if (
    response == null ||
    !('conversation_state' in response) ||
    response.conversation_state === null
  ) {
    return current;
  }
  return fromResponseEnvelope(response);
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

/**
 * What `useChatSession` puts in `AskRequest.conversation_state`.
 *
 * A held opaque state always wins and is sent back byte-for-byte — that is
 * the whole store/echo contract above. When nothing is held (a fresh
 * session, right after Clear Chat, or a pre-V7 backend that has never once
 * returned a versioned state), this falls back to the legacy
 * `{pending_clarification}` shape `API_CONTRACT.md` still documents as
 * accepted input, so clarification keeps working without the versioned
 * state. Never both: the two shapes are alternatives for the same field,
 * never merged. Note this is a *different* question from
 * `advanceSessionState`'s: a transport failure no longer clears what was
 * held (see there), so it does not by itself cause this fallback either —
 * the fallback is for "nothing has ever been acknowledged yet," not "the
 * last request failed."
 */
export function requestConversationState(
  holder: SessionStateHolder,
  legacyPendingClarification: unknown,
): unknown {
  const opaque = toRequestField(holder);
  return opaque !== undefined
    ? opaque
    : { pending_clarification: legacyPendingClarification };
}
