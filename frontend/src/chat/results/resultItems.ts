import { parseEventItem, parseJobItem } from '../../resources/listResponse';
import type { EventItem, JobItem } from '../../types/api';
import { formatStoredDateTime } from '../../util/formatTemporal';

/**
 * Turns an `/api/v1/ask` response's `items` array into display cards for the
 * one shared `ResultList` renderer.
 *
 * This is presentation mapping only. Each known wire item shape (the same
 * `JobItem`/`EventItem` DTOs the list endpoints use) is mapped to one generic
 * card: title, stored URL, a fixed set of labelled stored fields. The mapping
 * never filters, sorts, deduplicates, ranks or judges eligibility — card N is
 * always `items[N-1]`, exactly as RAG ordered them.
 *
 * All-or-nothing: if any item is not a recognised shape, if shapes are mixed
 * across domains, if an identity repeats, or if an event comes from a source
 * the App has no provenance label for, the whole list is refused (`null`) and
 * the turn falls back to the backend's answer text. A partly rendered list
 * would misrepresent the backend's order and population; an unlabelled
 * non-official event could read as an official ANU one.
 */

export interface ResultCardField {
  label: string;
  /** `null` = the source did not publish it. Rendered neutrally, never guessed. */
  value: string | null;
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
}

/**
 * The canonical payload a selected-result action carries: stored identity
 * plus the 1-based position in the backend's order. Never a title string.
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

function nonEmpty(value: string | null): string | null {
  return value === null || value.trim() === '' ? null : value;
}

function jobCard(job: JobItem): ResultCardModel {
  return {
    recordId: job.record_id,
    domain: 'jobs',
    title: job.title,
    url: job.url,
    provenance: null,
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

function toCard(item: unknown): ResultCardModel | null {
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
