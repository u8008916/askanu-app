import type { ResultCardField, ResultCardModel } from './resultItems';

/**
 * How one `ResultCardModel` is laid out on screen — presentation only.
 *
 * `resultItems.ts` maps the wire to a generic card: a title and a fixed,
 * labelled `fields` list per domain. This module decides which of those
 * fields are scannable at a glance (an icon row under the title), which one
 * is the muted source line, and which stay in "More details". It reads only
 * `card.fields`; it never adds a field, changes a value, reorders records or
 * judges anything. Field labels are the ones `resultItems.ts` froze.
 *
 * A field whose value is `null` was not published. A row that leads with such
 * a field still renders, as "Label: Not published", so a missing venue or
 * missing prerequisites is visibly missing — never dropped, never guessed.
 */

export type RowIcon =
  | 'clock'
  | 'pin'
  | 'calendar'
  | 'briefcase'
  | 'book'
  | 'award'
  | 'home'
  | 'info'
  | 'person';

interface RowSpec {
  /** Fields joined into one row, in order. Missing ones drop to "More details". */
  labels: string[];
  icon: RowIcon;
  /** Separator between the joined values. */
  join?: string;
  /** Prefix the row with its field label ("Closes:"); off when the value reads on its own. */
  showLabel?: boolean;
}

interface DomainLayout {
  rows: RowSpec[];
  /** Muted line under the rows; parts are joined with " · ". */
  secondary: { label: string; showLabel?: boolean }[];
}

/** Joins a start and an end into one range row. */
const TIME_RANGE_JOIN = ' – ';

const LAYOUTS: Readonly<Record<string, DomainLayout>> = {
  events: {
    rows: [
      { labels: ['Starts', 'Ends'], icon: 'clock', join: TIME_RANGE_JOIN },
      { labels: ['Venue'], icon: 'pin' },
    ],
    secondary: [{ label: 'Organiser' }],
  },
  jobs: {
    rows: [
      { labels: ['Location'], icon: 'pin' },
      { labels: ['Type'], icon: 'briefcase', showLabel: true },
      { labels: ['Closes'], icon: 'calendar', showLabel: true },
    ],
    secondary: [
      { label: 'Classification', showLabel: true },
      { label: 'Salary', showLabel: true },
    ],
  },
  courses: {
    rows: [
      { labels: ['Code', 'Academic year'], icon: 'book', join: ' · ' },
      { labels: ['Units'], icon: 'info', showLabel: true },
      { labels: ['Prerequisites'], icon: 'info', showLabel: true },
      { labels: ['Offerings'], icon: 'calendar', showLabel: true },
      { labels: ['Description'], icon: 'info' },
    ],
    secondary: [],
  },
  scholarships: {
    rows: [
      { labels: ['Value'], icon: 'award', showLabel: true },
      { labels: ['Study level'], icon: 'book', showLabel: true },
      { labels: ['Opening date'], icon: 'calendar', showLabel: true },
      { labels: ['Closing date'], icon: 'calendar', showLabel: true },
      { labels: ['Official status'], icon: 'info', showLabel: true },
    ],
    secondary: [],
  },
  accommodation: {
    rows: [
      { labels: ['Location'], icon: 'pin' },
      { labels: ['Advertised rate', 'Cost period'], icon: 'info', join: ' · ', showLabel: true },
      { labels: ['Category'], icon: 'home', showLabel: true },
    ],
    secondary: [],
  },
  support: {
    rows: [
      { labels: ['Category'], icon: 'info', showLabel: true },
      { labels: ['Purpose'], icon: 'info', showLabel: true },
      { labels: ['Location'], icon: 'pin' },
      { labels: ['Hours'], icon: 'clock', showLabel: true },
      { labels: ['Email'], icon: 'person', showLabel: true },
      { labels: ['Phone'], icon: 'person', showLabel: true },
    ],
    secondary: [],
  },
};

export interface CardMetaRow {
  icon: RowIcon;
  /** Labels are always kept: visible when `showLabel`, screen-reader-only otherwise. */
  showLabel: boolean;
  parts: CardMetaPart[];
  /** Separator drawn between the parts of a multi-field row. */
  join: string;
}

/** One stored field inside a row, kept as its own label/value pair. */
export interface CardMetaPart {
  label: string;
  /** `null` = not published; the renderer says so. */
  value: string | null;
}

export interface CardView {
  rows: CardMetaRow[];
  /** The muted source line: fields like the organiser, each a label/value pair. */
  secondary: { label: string; value: string; showLabel: boolean }[];
  /** Where the record comes from (official vs community), verbatim from the card. */
  provenance: string | null;
  /** Every field not shown above, in original order, including unpublished ones. */
  rest: ResultCardField[];
}

const EMPTY_LAYOUT: DomainLayout = { rows: [], secondary: [] };

function layoutFor(domain: string): DomainLayout {
  return Object.prototype.hasOwnProperty.call(LAYOUTS, domain)
    ? LAYOUTS[domain]
    : EMPTY_LAYOUT;
}

/** A value that already leads with its own label ("Closes 8 January") needs no second prefix. */
function readsAsLabelled(text: string, label: string): boolean {
  return text.toLowerCase().startsWith(label.toLowerCase());
}

export function toCardView(card: ResultCardModel): CardView {
  const layout = layoutFor(card.domain);
  const byLabel = new Map(card.fields.map((field) => [field.label, field] as const));
  const used = new Set<string>();

  const rows: CardMetaRow[] = [];
  for (const spec of layout.rows) {
    const known = spec.labels.filter((label) => byLabel.has(label));
    if (known.length === 0) {
      continue;
    }
    const present = known.filter((label) => byLabel.get(label)?.value !== null);
    // Every field of the row unpublished: keep the row and say so for its lead field.
    const shown = present.length > 0 ? present : [known[0]];
    shown.forEach((label) => used.add(label));
    const parts = shown.map((label) => ({
      label,
      value: byLabel.get(label)?.value ?? null,
    }));
    /*
     * "Mon, 14 Sept, 11:00 am – Mon, 14 Sept, 2:00 pm" says the date twice.
     * When the end carries the identical date prefix the formatter gave the
     * start, only its time is shown. Nothing is added or dropped that the
     * start does not already state; a different date stays in full.
     */
    if (spec.join === TIME_RANGE_JOIN) {
      // Keep "11:00 am" together when a narrow card has to wrap the row.
      for (const part of parts) {
        part.value = part.value?.replace(/ (am|pm)\b/gi, '\u00a0$1') ?? null;
      }
    }
    if (spec.join === TIME_RANGE_JOIN && parts.length === 2) {
      const [start, end] = parts;
      const cut = start.value?.lastIndexOf(', ') ?? -1;
      if (start.value !== null && end.value !== null && cut > 0) {
        const datePrefix = start.value.slice(0, cut + 2);
        if (end.value.startsWith(datePrefix) && end.value.length > datePrefix.length) {
          end.value = end.value.slice(datePrefix.length);
        }
      }
    }
    const lead = parts[0];
    rows.push({
      icon: spec.icon,
      showLabel:
        present.length === 0 ||
        (spec.showLabel === true &&
          !(lead.value !== null && readsAsLabelled(lead.value, lead.label))),
      parts,
      join: spec.join ?? ' · ',
    });
  }

  const secondary: CardView['secondary'] = [];
  for (const part of layout.secondary) {
    const field = byLabel.get(part.label);
    if (field !== undefined && field.value !== null) {
      used.add(field.label);
      secondary.push({
        label: field.label,
        value: field.value,
        showLabel: part.showLabel === true,
      });
    }
  }

  return {
    rows,
    secondary,
    provenance: card.provenance,
    rest: card.fields.filter((field) => !used.has(field.label)),
  };
}

/** Plural-aware noun for a result count. Counts only: no claim about the results. */
const NOUNS: Readonly<Record<string, [string, string]>> = {
  events: ['event', 'events'],
  jobs: ['job', 'jobs'],
  courses: ['course', 'courses'],
  scholarships: ['scholarship', 'scholarships'],
  accommodation: ['accommodation option', 'accommodation options'],
  support: ['support service', 'support services'],
};

export function resultNoun(domain: string, count: number): string {
  const nouns = Object.prototype.hasOwnProperty.call(NOUNS, domain)
    ? NOUNS[domain]
    : (['result', 'results'] as [string, string]);
  return count === 1 ? nouns[0] : nouns[1];
}
