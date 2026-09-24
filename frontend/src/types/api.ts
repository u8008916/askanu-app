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

export interface AskResponse {
  status: AskStatus;
  answer: string;
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

export interface AskRequest {
  question: string;
  history: HistoryTurn[];
  conversation_state: ConversationState;
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
  start_at: string;
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
