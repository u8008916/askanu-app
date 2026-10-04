/**
 * Types transcribed from `docs/API_CONTRACT.md` (version v1).
 *
 * These mirror the frozen contract. Do not add fields, statuses or confidence
 * labels that the contract does not define. Nothing in this file performs a
 * request: the API client is Day 3 work.
 */

/** Frozen status enum. No Relief Mate confidence labels. */
export type AskStatus =
  | 'ok'
  | 'partial'
  | 'needs_clarification'
  | 'insufficient_evidence'
  | 'off_topic'
  | 'error';

/** Documented V3 request limits. */
export const QUESTION_MAX_CHARS = 2000;
export const HISTORY_MAX_TURNS = 10;

export interface Source {
  /** Evidence record, e.g. `course:COMP1110:2026`. */
  record_id: string;
  /** Source-registry identifier. */
  source_id: string;
  title: string;
  /** Comes programmatically from the stored canonical URL, never from Gemini. */
  url: string;
  domain: string;
}

export interface ClarificationOption {
  id: string;
  label: string;
}

export interface Clarification {
  id: string;
  type: string;
  /** Order is significant: it backs `first` / `second` answers. */
  options: ClarificationOption[];
  /** When true, `both` is a valid answer. */
  allow_multiple: boolean;
}

/**
 * V7 Day 4 additions (`askanu-rag` PR #38, `carmen/v7-day4-accommodation-vertical`,
 * tip `3c8e35e` — **not yet merged to `askanu-rag` main**; verified directly
 * against the branch's `models/contracts.py`/`conversation_state.py` and its
 * test suite, not just a relayed description). All of it lives at the top
 * level of the envelope, alongside `conversation_state` — none of it is
 * nested inside the opaque state, which stays exactly as opaque as before.
 */
export type AnswerState = 'CONFIRMED' | 'DERIVED' | 'PARTIAL' | 'UNKNOWN';

/**
 * A validated backend action. Only ever built from a stored, model-validated
 * `application_url` — never synthesized from `answer` prose or user text.
 * `url` is still checked with `isSafeHttpUrl` at render time like every other
 * stored URL in this app; the contract's own validation is not trusted blindly.
 */
export interface ResponseAction {
  type: 'application';
  label: string;
  url: string;
  record_id: string;
  source_id: string;
}

/**
 * Server-authored metadata for one stable ResultSet presentation page.
 * `next_ordinal` is `null` exactly when `has_more` is `false`.
 */
export interface ResultPage {
  result_set_id: string;
  start_ordinal: number;
  returned: number;
  has_more: boolean;
  next_ordinal: number | null;
}

/**
 * One named room whose published weekly rate proved a numeric price match.
 * Proves only that exact room passed the active bound — never that the room
 * or residence is affordable overall, cheapest, vacant, or obtainable.
 */
export interface PublicRoomRateEvidence {
  type: 'room_rate';
  room_name: string;
  rate: string;
  cost_period: string;
  contract: string | null;
  inclusions: string | null;
  other_fees: string | null;
}

/** The 7 fixed field keys `PublicResultItem.fields` may carry, each optional. */
export type PublicFieldValue = string | string[] | null;

/**
 * A reusable ordered result card backed by one approved stored record.
 * Discriminated from `PublicComparisonItem`/`PublicJobItem` by `type`.
 */
export interface PublicResultItem {
  type: 'result';
  record_id: string;
  source_id: string;
  canonical_id: string;
  title: string;
  url: string;
  domain: string;
  result_set_id: string | null;
  /** 1-based backend position in the retained ResultSet's ordering. */
  ordinal: number | null;
  fields: Record<string, PublicFieldValue>;
  qualifying_evidence: PublicRoomRateEvidence | null;
}

export interface PublicComparisonValue {
  record_id: string;
  value: PublicFieldValue;
  state: 'published' | 'not_published';
}

export interface PublicComparisonField {
  name: string;
  label: string;
  values: PublicComparisonValue[];
}

/**
 * Backend-authored comparison. The client renders these rows directly and
 * never reconstructs a comparison from answer prose or infers a missing cell.
 * `records[].fields` is always `{}` on a comparison item — per-record display
 * fields are not repeated here.
 */
export interface PublicComparisonItem {
  type: 'comparison';
  result_set_id: string | null;
  records: PublicResultItem[];
  fields: PublicComparisonField[];
}

/**
 * Today's Jobs item DTO plus one purely-additive discriminator field. Every
 * existing `JobItem` field is unchanged; `parseJobItem` (`resources/listResponse.ts`)
 * destructures named fields only, so this needs no parsing change there.
 */
export type PublicJobItem = JobItem & { type: 'job' };

export interface AskResponse {
  status: AskStatus;
  answer: string;
  /**
   * Deliberately untyped here. `chat/results/resultItems.ts` is the deep-
   * validation boundary for this field: every consumer goes through
   * `toResultCards`/`toComparisonModel`/`parsePublicResultItem`, which
   * classify by `type`, validate each of the 7 fixed `fields` keys and
   * `qualifying_evidence`, and reject the whole array on any malformed
   * entry rather than rendering a partially-trusted item. Do not read this
   * field directly anywhere else, and do not narrow its type here — that
   * would let a caller skip the adapter's validation.
   */
  items: unknown[];
  sources: Source[];
  clarification: Clarification | null;
  request_id: string;
  /**
   * V7 addition, present on every status per `askanu-rag` PR #34. Optional
   * here because a pre-V7 backend, or a controlled error envelope built
   * before RAG is reached (the App server's own 413/502), may omit it —
   * `chat/sessionState.ts`'s `fromResponseEnvelope` degrades that to "no
   * state held" rather than treating it as a parse failure.
   */
  conversation_state?: OpaqueConversationState;
  /**
   * V7 Day 4 (PR #38, unmerged): always populated for an Accommodation
   * response, `null`/absent for a domain PR #38 does not touch yet.
   */
  answer_state?: AnswerState | null;
  /**
   * V7 Day 4 (PR #38, unmerged): empty/absent when no validated action
   * applies. Optional here (rather than required) so the many existing
   * pre-#38 `AskResponse` fixtures don't all need a mechanical `actions: []`
   * added — `askResponse.ts` still normalizes an absent wire field to `[]`
   * for a real parsed response, and the one production reader treats
   * `undefined` the same as `[]`.
   */
  actions?: ResponseAction[];
  /** V7 Day 4 (PR #38, unmerged): present for a discovery or continuation page. */
  result_page?: ResultPage | null;
}

export type TurnRole = 'user' | 'assistant';

export interface HistoryTurn {
  turn_id: string;
  role: TurnRole;
  content: string;
}

/**
 * The legacy request shape: `pending_clarification` only. Still accepted by
 * the backend (`API_CONTRACT.md`: "Old pending-only callers remain
 * accepted") — `chat/sessionState.ts`'s `requestConversationState` sends
 * this only when no versioned state is held yet.
 */
export interface LegacyConversationState {
  pending_clarification: Clarification | null;
}

/**
 * V7 (`askanu-rag` PR #34, merged `a7e9ed4`, Qasim GO 23 Sep 2026): a bounded,
 * versioned, server-defined structure (`schema_version`, `recent_entities`,
 * `focus`, `student_facts`, `constraints`, `result_sets`, `selected_result`,
 * `pending_clarification`). The App stores it, echoes it back unchanged and
 * drops it on Clear Chat — it never types the internal shape or reads a
 * field out of it (`chat/sessionState.ts`).
 */
export type OpaqueConversationState = unknown;

export type ConversationState = LegacyConversationState | OpaqueConversationState;

/**
 * The untrusted clicked-result identity, revalidated by RAG before use.
 * Must exactly echo a card's own `resultSetId`/`canonicalId`/`ordinal` —
 * never a title, never a locally-computed index.
 */
export interface SelectedResultRequest {
  result_set_id: string;
  canonical_id: string;
  ordinal: number;
}

/**
 * Structured clarification answer: exact backend option ids, never labels.
 * When present, RAG bypasses free-text re-parsing of `question` entirely for
 * resolving the selection.
 */
export interface ClarificationSelectionRequest {
  clarification_id: string;
  option_ids: string[];
}

/**
 * A bounded presentation request over one retained ResultSet. Must equal the
 * server's own retained cursor (`start_ordinal` = the last response's
 * `result_page.next_ordinal`) or RAG rejects it.
 */
export interface ResultPageRequest {
  result_set_id: string;
  start_ordinal: number;
  limit: number;
}

export interface AskRequest {
  question: string;
  history: HistoryTurn[];
  conversation_state: ConversationState;
  /**
   * V7 Day 4 (`askanu-rag` PR #38, unmerged): independently optional siblings
   * of `conversation_state`, never nested inside it. Omitting all three is
   * exactly today's request shape.
   */
  selected_result?: SelectedResultRequest;
  clarification_selection?: ClarificationSelectionRequest;
  result_page?: ResultPageRequest;
}

/*
 * Events and jobs list endpoints.
 *
 * `JobItem` is the reviewed shape the RAG service ships for
 * `GET /api/v1/jobs/current` (askanu-rag `docs/API_CONTRACT.md`, Day 10 PR #22;
 * synced into this repo's `docs/API_CONTRACT.md` on Day 11). Every descriptive
 * field is nullable and `employment_types` may be empty — the App displays what
 * is present and never fills a gap. `status` is the server's currentness
 * verdict; the App does not compute it.
 *
 * `EventItem` mirrors the shape the RAG service ships on its Events build day
 * (askanu-rag `carmen/day15-events-rag-api`, synced 2026-09-19): the dedicated
 * upcoming endpoint serves official ANU records only; `end_at`, `venue`,
 * `organiser` and `status` are nullable. `status` is the stored source-backed
 * wording (a cancellation status when the source published one, otherwise the
 * source status, e.g. "published"). The App parses and carries this field for
 * contract compatibility but does not currently present or interpret it —
 * the value mixes two different concepts with no frozen student-facing
 * semantics yet (see `resources/UpcomingEventsCard.tsx`).
 */

export interface EventItem {
  record_id: string;
  source_id: string;
  title: string;
  start_at: string | null;
  /** Canberra-local calendar evidence when the source publishes no exact time. */
  start_date?: string | null;
  end_date?: string | null;
  date_precision?: 'date' | 'timestamp' | null;
  end_at: string | null;
  venue: string | null;
  organiser: string | null;
  status: string | null;
  url: string;
  domain: 'events';
}

export interface JobItem {
  record_id: string;
  source_id: string;
  job_id: string;
  title: string;
  employment_types: string[];
  location: string | null;
  classification: string | null;
  salary: string | null;
  /** The closing wording as published, e.g. "Closes 8 January 2099". */
  closing_text: string | null;
  /** Canberra-local `YYYY-MM-DD`. */
  closing_date: string | null;
  closing_at: string | null;
  status: 'current';
  url: string;
  domain: 'jobs';
}

export interface ListResponse<T> {
  status: AskStatus;
  items: T[];
  request_id: string;
}
