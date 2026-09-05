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
}

export type TurnRole = 'user' | 'assistant';

export interface HistoryTurn {
  turn_id: string;
  role: TurnRole;
  content: string;
}

export interface ConversationState {
  pending_clarification: Clarification | null;
}

export interface AskRequest {
  question: string;
  history: HistoryTurn[];
  conversation_state: ConversationState;
}

/*
 * Events and jobs list endpoints.
 *
 * API_CONTRACT.md notes that the angle-bracket sample values are illustrative
 * and that exact field types/nullability are Day 2 data-schema work. The
 * day-by-day tasks describe the descriptive fields as present "where
 * available", so they are modelled as nullable here and will be confirmed
 * against the shared schema on Day 2.
 */

export interface EventItem {
  record_id: string;
  source_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  venue: string | null;
  organiser: string | null;
  url: string;
  domain: 'events';
}

export interface JobItem {
  record_id: string;
  source_id: string;
  title: string;
  employment_type: string | null;
  location: string | null;
  closing_at: string | null;
  url: string;
  domain: 'jobs';
}

export interface ListResponse<T> {
  status: AskStatus;
  items: T[];
  request_id: string;
}
