import { parseEventItem, parseJobItem } from '../../resources/listResponse';
import type { EventItem, JobItem, PublicComparisonField, PublicComparisonItem, PublicComparisonValue, PublicFieldValue, PublicResultItem, PublicRoomRateEvidence } from '../../types/api';
import { formatStoredDateTime } from '../../util/formatTemporal';
import type { ComparisonColumn, ComparisonRow } from './ComparisonTable';
import { isRenderableComparison } from './ComparisonTable';

/**
 * Turns an `/api/v1/ask` response's `items` array into display cards (or a
 * comparison table) for the shared `ResultList`/`ComparisonTable` renderers.
 *
 * This is presentation mapping only. Each known wire item shape is mapped to
 * one generic card or comparison row: title, stored URL, a fixed set of
 * labelled stored fields. The mapping never filters, sorts, deduplicates,
 * ranks or judges eligibility — card N is always `items[N-1]`, exactly as RAG
 * ordered them.
 *
 * All-or-nothing: if any item is not a recognised shape, if shapes are mixed
 * across domains, if an identity repeats, or if an event comes from a source
 * the App has no provenance label for, the whole list is refused (`null`) and
 * the turn falls back to the backend's answer text. A partly rendered list
 * would misrepresent the backend's order and population; an unlabelled
 * non-official event could read as an official ANU one.
 *
 * V7 Day 4 (`askanu-rag` PR #38, `carmen/v7-day4-accommodation-vertical`, tip
 * `3c8e35e` — not yet merged): `items` is now a discriminated union on
 * `type`. `type:"job"` is today's Jobs DTO plus one purely-additive field
 * (`parseJobItem` destructures named fields only, so it already tolerates
 * this — verified, not assumed). `type:"result"` is the new generic
 * Accommodation-shaped card, carrying a fixed 7-key `fields` map plus
 * optional `qualifying_evidence` (the one named room whose published rate
 * satisfied an active price constraint — never a claim about affordability,
 * cheapest, vacancy or obtainability). `type:"comparison"` never becomes a
 * card at all; it routes through `toComparisonModel` instead, and its
 * presence anywhere in `items` refuses the card path entirely (a list is
 * either cards or one comparison, never both). Legacy untyped items (the
 * Events forward fixture) keep duck-typing exactly as before.
 */

export interface ResultCardField {
  label: string;
  /** `null` = the source did not publish it. Rendered neutrally, never guessed. */
  value: string | null;
}

export interface QualifyingEvidenceView {
  roomName: string;
  rate: string;
  costPeriod: string;
  contract: string | null;
  inclusions: string | null;
  otherFees: string | null;
}

export interface ResultCardModel {
  /** The stored canonical record identity — never derived from the title. */
  recordId: string;
  domain: string;
  title: string;
  /** Stored URL; `isSafeHttpUrl` still decides at render time whether it links. */
  url: string;
  /** Source provenance shown on the card, e.g. official vs community. */
  provenance: string | null;
  fields: ResultCardField[];
  /**
   * V7 Day 4: the exact identity a `selected_result` request must echo back.
   * Non-null only for a `type:"result"` item (Accommodation/Support today);
   * `null` for Jobs/Events, which keeps their "Ask about this" button hidden
   * — `AssistantTurn` only wires `onSelect` when these are all non-null.
   */
  resultSetId: string | null;
  canonicalId: string | null;
  ordinal: number | null;
  /** The one named room's evidence that satisfied an active price constraint. */
  qualifyingEvidence: QualifyingEvidenceView | null;
}

/**
 * The canonical payload a selected-result action carries: stored identity
 * plus the 1-based position in the backend's order. Never a title string.
 *
 * Unchanged since Day 3 on purpose: this is a generic UI-selection primitive,
 * already asserted against by `tests/v7Day3Results.test.tsx`, and distinct
 * from the exact `{result_set_id, canonical_id, ordinal}` triple RAG
 * revalidates — `AssistantTurn` builds that request payload separately by
 * looking the clicked card back up via `record_id`.
 */
export interface ResultSelection {
  record_id: string;
  domain: ResultCardModel['domain'];
  position: number;
}

const EVENT_PROVENANCE: Record<string, string> = {
  events_anu_official: 'Official ANU Events',
  rubric_unified_search: 'ANU community · via Rubric',
};

/** Fixed order and label for every key `PublicResultItem.fields` may carry. */
const PUBLIC_RESULT_FIELD_LABELS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'catering_options', label: 'Catering' },
  { key: 'advertised_rate', label: 'Advertised rate' },
  { key: 'cost_period', label: 'Cost period' },
  { key: 'audiences', label: 'Audience' },
  { key: 'features', label: 'Features' },
];

const PUBLIC_RESULT_FIELD_KEYS = new Set(
  PUBLIC_RESULT_FIELD_LABELS.map(({ key }) => key),
);

function nonEmpty(value: string | null): string | null {
  return value === null || value.trim() === '' ? null : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** A stable ResultSet position: a finite integer >= 1, matching `askResponse.ts`'s `isOrdinal`. */
function isOrdinal(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isPublicFieldValue(value: unknown): value is PublicFieldValue {
  return value === null || isString(value) || isStringArray(value);
}

function fieldValueToDisplay(value: PublicFieldValue): string | null {
  if (value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? null : value.join(', ');
  }
  return nonEmpty(value);
}

function jobCard(job: JobItem): ResultCardModel {
  return {
    recordId: job.record_id,
    domain: 'jobs',
    title: job.title,
    url: job.url,
    provenance: null,
    resultSetId: null,
    canonicalId: null,
    ordinal: null,
    qualifyingEvidence: null,
    fields: [
      {
        label: 'Type',
        value: job.employment_types.length > 0 ? job.employment_types.join(', ') : null,
      },
      { label: 'Location', value: nonEmpty(job.location) },
      { label: 'Classification', value: nonEmpty(job.classification) },
      { label: 'Salary', value: nonEmpty(job.salary) },
      /*
       * The same closing fact RAG's own answer text states: `closing_text`
       * exactly as stored ("Closes 8 January 2099"), else the stored
       * `closing_date`, which is a date-only value and is shown as a date with
       * no invented time. No open/closed verdict is derived from either —
       * currentness is the server's, already applied.
       */
      {
        label: 'Closes',
        value:
          nonEmpty(job.closing_text) ??
          (nonEmpty(job.closing_date) === null
            ? null
            : formatStoredDateTime(job.closing_date as string)),
      },
    ],
  };
}

function eventCard(event: EventItem): ResultCardModel | null {
  const provenance = EVENT_PROVENANCE[event.source_id];
  if (provenance === undefined) {
    return null;
  }
  return {
    recordId: event.record_id,
    domain: 'events',
    title: event.title,
    url: event.url,
    provenance,
    resultSetId: null,
    canonicalId: null,
    ordinal: null,
    qualifyingEvidence: null,
    fields: [
      { label: 'Starts', value: formatStoredDateTime(event.start_at) },
      {
        label: 'Ends',
        value: event.end_at === null ? null : formatStoredDateTime(event.end_at),
      },
      /* A missing venue stays "not published" — never inferred as online. */
      { label: 'Venue', value: nonEmpty(event.venue) },
      { label: 'Organiser', value: nonEmpty(event.organiser) },
    ],
  };
}

function parsePublicFields(value: unknown): Record<string, PublicFieldValue> | null {
  if (!isRecord(value)) {
    return null;
  }
  const result: Record<string, PublicFieldValue> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (!PUBLIC_RESULT_FIELD_KEYS.has(key) || !isPublicFieldValue(fieldValue)) {
      return null;
    }
    result[key] = fieldValue;
  }
  return result;
}

/** `undefined` = malformed (reject); a legitimate absence is `null`. */
function parseQualifyingEvidence(
  value: unknown,
): PublicRoomRateEvidence | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const { type, room_name, rate, cost_period, contract, inclusions, other_fees } =
    value;
  if (
    type !== 'room_rate' ||
    !isString(room_name) ||
    !isString(rate) ||
    !isString(cost_period) ||
    !isNullableString(contract) ||
    !isNullableString(inclusions) ||
    !isNullableString(other_fees)
  ) {
    return undefined;
  }
  return { type, room_name, rate, cost_period, contract, inclusions, other_fees };
}

function parsePublicResultItem(value: unknown): PublicResultItem | null {
  if (!isRecord(value) || value.type !== 'result') {
    return null;
  }

  const {
    record_id,
    source_id,
    canonical_id,
    title,
    url,
    domain,
    result_set_id,
    ordinal,
    fields,
    qualifying_evidence,
  } = value;

  if (
    !isString(record_id) ||
    !isString(source_id) ||
    !isString(canonical_id) ||
    !isString(title) ||
    !isString(url) ||
    !isString(domain)
  ) {
    return null;
  }

  if (!(result_set_id === null || result_set_id === undefined || isString(result_set_id))) {
    return null;
  }

  if (!(ordinal === null || ordinal === undefined || isOrdinal(ordinal))) {
    return null;
  }

  const parsedFields = parsePublicFields(fields);
  if (parsedFields === null) {
    return null;
  }

  const parsedEvidence = parseQualifyingEvidence(qualifying_evidence);
  if (parsedEvidence === undefined) {
    return null;
  }

  return {
    type: 'result',
    record_id,
    source_id,
    canonical_id,
    title,
    url,
    domain,
    result_set_id: result_set_id ?? null,
    ordinal: ordinal ?? null,
    fields: parsedFields,
    qualifying_evidence: parsedEvidence,
  };
}

function publicResultCard(item: PublicResultItem): ResultCardModel {
  return {
    recordId: item.record_id,
    domain: item.domain,
    title: item.title,
    url: item.url,
    provenance: null,
    resultSetId: item.result_set_id,
    canonicalId: item.canonical_id,
    ordinal: item.ordinal,
    qualifyingEvidence:
      item.qualifying_evidence === null
        ? null
        : {
            roomName: item.qualifying_evidence.room_name,
            rate: item.qualifying_evidence.rate,
            costPeriod: item.qualifying_evidence.cost_period,
            contract: item.qualifying_evidence.contract,
            inclusions: item.qualifying_evidence.inclusions,
            otherFees: item.qualifying_evidence.other_fees,
          },
    /*
     * All 7 keys always appear, in fixed order, whether or not the source
     * published them — a card's shape staying constant across a list is
     * safer than a variable-shaped card silently implying "less is known"
     * for that one record.
     */
    fields: PUBLIC_RESULT_FIELD_LABELS.map(({ key, label }) => ({
      label,
      value: fieldValueToDisplay(item.fields[key] ?? null),
    })),
  };
}

function itemType(item: unknown): string | undefined {
  return isRecord(item) && isString(item.type) ? item.type : undefined;
}

function toCard(item: unknown): ResultCardModel | null {
  const type = itemType(item);

  if (type === 'result') {
    const parsed = parsePublicResultItem(item);
    return parsed === null ? null : publicResultCard(parsed);
  }

  if (type === 'job') {
    // `parseJobItem` destructures only its named fields, so the added `type`
    // discriminator is silently tolerated — verified, not just assumed.
    const job = parseJobItem(item);
    return job === null ? null : jobCard(job);
  }

  if (type !== undefined) {
    // A discriminated `type` this app does not recognise (including
    // `"comparison"`, which never becomes a card) — refuse rather than guess.
    return null;
  }

  // No `type` at all: a legacy untyped shape (the Events forward fixture).
  const job = parseJobItem(item);
  if (job !== null) {
    return jobCard(job);
  }
  const event = parseEventItem(item);
  if (event !== null) {
    return eventCard(event);
  }
  return null;
}

/** Returns cards in backend order, or `null` when the items cannot be shown as cards. */
export function toResultCards(items: readonly unknown[]): ResultCardModel[] | null {
  if (items.length === 0) {
    return null;
  }

  const cards: ResultCardModel[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const card = toCard(item);
    if (card === null || seen.has(card.recordId)) {
      return null;
    }
    if (cards.length > 0 && cards[0].domain !== card.domain) {
      return null;
    }
    seen.add(card.recordId);
    cards.push(card);
  }

  return cards;
}

function parsePublicComparisonValue(value: unknown): PublicComparisonValue | null {
  if (!isRecord(value)) {
    return null;
  }
  const { record_id, value: cellValue, state } = value;
  if (!isString(record_id) || !isPublicFieldValue(cellValue)) {
    return null;
  }
  if (state !== 'published' && state !== 'not_published') {
    return null;
  }
  return { record_id, value: cellValue, state };
}

function parsePublicComparisonField(value: unknown): PublicComparisonField | null {
  if (!isRecord(value)) {
    return null;
  }
  const { name, label, values } = value;
  if (!isString(name) || !isString(label) || !Array.isArray(values)) {
    return null;
  }
  const parsedValues: PublicComparisonValue[] = [];
  for (const entry of values) {
    const parsed = parsePublicComparisonValue(entry);
    if (parsed === null) {
      return null;
    }
    parsedValues.push(parsed);
  }
  return { name, label, values: parsedValues };
}

function parsePublicComparisonItem(value: unknown): PublicComparisonItem | null {
  if (!isRecord(value) || value.type !== 'comparison') {
    return null;
  }
  const { result_set_id, records, fields } = value;
  if (!(result_set_id === null || result_set_id === undefined || isString(result_set_id))) {
    return null;
  }
  if (!Array.isArray(records) || !Array.isArray(fields)) {
    return null;
  }
  const parsedRecords: PublicResultItem[] = [];
  for (const record of records) {
    const parsed = parsePublicResultItem(record);
    if (parsed === null) {
      return null;
    }
    parsedRecords.push(parsed);
  }
  const parsedFields: PublicComparisonField[] = [];
  for (const field of fields) {
    const parsed = parsePublicComparisonField(field);
    if (parsed === null) {
      return null;
    }
    parsedFields.push(parsed);
  }
  return {
    type: 'comparison',
    result_set_id: result_set_id ?? null,
    records: parsedRecords,
    fields: parsedFields,
  };
}

export interface ComparisonModel {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

/**
 * Returns a renderable comparison, or `null` when `items` is not exactly one
 * well-formed `type:"comparison"` item. Mutually exclusive with
 * `toResultCards` by construction — a comparison item never becomes a card,
 * and a result/job item never becomes a comparison row.
 *
 * Cells are looked up by `record_id`, never by array position — defensive
 * against a `values` array ordered differently from `records`. A `state`
 * that disagrees with its own `value` (e.g. `"published"` paired with
 * `null`, or vice versa) is resolved toward the neutral "not published"
 * reading rather than trusted at face value.
 */
export function toComparisonModel(items: readonly unknown[]): ComparisonModel | null {
  if (items.length !== 1) {
    return null;
  }

  const parsed = parsePublicComparisonItem(items[0]);
  if (parsed === null) {
    return null;
  }

  const columns: ComparisonColumn[] = [];
  const seenIds = new Set<string>();
  for (const record of parsed.records) {
    if (seenIds.has(record.canonical_id)) {
      return null;
    }
    seenIds.add(record.canonical_id);
    columns.push({ id: record.canonical_id, title: record.title });
  }

  const rows: ComparisonRow[] = [];
  for (const field of parsed.fields) {
    const values: (string | null)[] = [];
    for (const record of parsed.records) {
      const cell = field.values.find((entry) => entry.record_id === record.record_id);
      if (cell === undefined) {
        return null;
      }
      values.push(cell.state === 'not_published' ? null : fieldValueToDisplay(cell.value));
    }
    rows.push({ label: field.label, values });
  }

  return isRenderableComparison(columns, rows) ? { columns, rows } : null;
}
