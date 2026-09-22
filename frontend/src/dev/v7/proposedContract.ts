/**
 * PROPOSAL — V7 Day 1 UI contract shapes.
 *
 * These types describe what `docs/V7_UI_CONTRACT.md` asks the backend for.
 * They are not in `types/api.ts`, they mirror nothing `docs/API_CONTRACT.md`
 * defines today, and no production module imports this file. Qasim/Carmen own
 * whether, where and under what names any of this actually lands in the v1 (or
 * a versioned v2) envelope; until that freeze happens, this file is scaffolding
 * for the three Day 1 mock states and nothing else may depend on it.
 *
 * Field-by-field rationale lives in `docs/V7_UI_CONTRACT.md` §6. Do not add a
 * field here that section does not also list.
 */

/** ResultSet status — separate from answer epistemic state (master plan §2/§3). */
export type ResultSetStatus = 'RESULTS' | 'EMPTY' | 'INCOMPLETE';

/** Answer epistemic state — separate from ResultSet status. */
export type AnswerState = 'CONFIRMED' | 'DERIVED' | 'PARTIAL' | 'UNKNOWN';

/**
 * One safe, optional, stored field on a result card or comparison row.
 * `value: null` means the source did not publish it — rendered as the neutral
 * unknown label, never blank and never guessed.
 */
export interface ResultField {
  label: string;
  value: string | null;
}

/**
 * One item in a bounded, backend-ordered result set. Shape deliberately
 * mirrors `Source` (`entity_id` plays the role `record_id` already plays) so
 * the App does not need a second identity scheme.
 */
export interface ResultItem {
  entity_id: string;
  domain: string;
  entity_type: string;
  title: string;
  /** Canonical, stored — never guessed or constructed client-side. */
  url: string;
  source_id: string;
  /** As stored; order is the backend's declared dimension order. */
  fields: ResultField[];
}

/** The proposed top-level `result_set` object, `null` when the answer has none. */
export interface ResultSet {
  result_set_id: string;
  status: ResultSetStatus;
  items: ResultItem[];
}

/** Official next step for a useful-unknown answer. Canonical URL only. */
export interface NextAction {
  label: string;
  url: string;
}

/**
 * The canonical result-action payload (§4): what a "the second one" reference
 * or a card action resolves to. `position` is the 1-based index in the
 * `ResultSet.items` array exactly as received — the App never recomputes it
 * after a UI-only change (e.g. filtering the display) and never derives
 * identity from a card's rendered title.
 */
export interface SelectedResultAction {
  result_set_id: string;
  entity_id: string;
  position: number;
}

/**
 * One row's values across the entities being compared. `null` preserves
 * missingness — it must never be dropped, inferred, or treated as equal to
 * another entity's value for the same field.
 */
export interface ComparisonField {
  label: string;
  /** Same order as the compared entities. */
  values: (string | null)[];
}
