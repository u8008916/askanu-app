/**
 * Display formatting for stored date/time strings — presentation only.
 *
 * The App owns how a time *looks*; the backend owns what it *means*. So this
 * never adds information the stored value does not carry:
 *
 * - An ISO datetime with an explicit offset (`2026-10-01T18:00:00+10:00`, or
 *   `Z`) is a real instant. It is shown in `Australia/Canberra`, the timezone
 *   the Events contract names, with its time.
 * - A date-only value (`2026-10-01`) has no time. It is shown as a date only.
 *   It is never passed to `Date.parse`, which would read it as UTC midnight
 *   and display an invented "10:00 am" in Canberra.
 * - A datetime without an offset (`2026-10-01T18:00`) has no stated timezone.
 *   Picking one — the browser's, or Canberra's — would be inventing it, so it
 *   is shown exactly as stored.
 * - Anything else is shown exactly as stored, never dropped.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Australia/Canberra',
});

/*
 * A date-only value is a calendar date, not an instant. Formatting it in UTC
 * from its own year/month/day keeps the same calendar day in every browser
 * timezone; no time component is requested, so none can be shown. The year
 * is kept: a date-only value is typically a deadline (a job's closing date)
 * that can fall in a later year, and dropping it would change its meaning.
 */
const DATE_ONLY_FORMAT = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatStoredDateTime(value: string): string {
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const time = Date.UTC(Number(year), Number(month) - 1, Number(day));
    const date = new Date(time);
    // Reject impossible dates such as 2026-02-30 rather than rolling them over.
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day)
    ) {
      return value;
    }
    return DATE_ONLY_FORMAT.format(time);
  }

  if (OFFSET_DATETIME.test(value)) {
    const time = Date.parse(value);
    return Number.isNaN(time) ? value : DATE_TIME_FORMAT.format(time);
  }

  return value;
}
