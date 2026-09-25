import { EventsIcon } from '../ui/Icon';
import { formatStoredDateTime } from '../util/formatTemporal';
import type { EventItem } from '../types/api';
import { FeedPanel } from './FeedPanel';
import { useFeeds } from './FeedsProvider';

/*
 * Display formatting only. The server has already decided the event is
 * upcoming and put it in ascending order; `formatStoredDateTime` renders the
 * stored `start_at` for reading without inventing a time or a timezone the
 * stored value does not carry (see `util/formatTemporal.ts`).
 */

/**
 * The secondary line: start time, then venue and organiser, each only when
 * the source published it.
 *
 * `event.status` is intentionally not rendered here. The App accepts and
 * parses it (contract-compatibility with the RAG service), but the stored
 * value currently mixes two different concepts — a cancellation wording and
 * a general source/publishing status — with no frozen semantics the App can
 * safely turn into student-facing UI (a badge, a filter, a hidden row).
 * Interpreting it in the browser would move meaning-making out of the
 * backend, which is exactly what this contract avoids elsewhere (see
 * `docs/API_CONTRACT.md`). Rendering nothing is safer than surfacing an
 * internal/source status string that was never designed as UI copy. If a
 * normalized semantic field is frozen later (e.g. a dedicated cancellation
 * flag), this is the place to add it.
 */
function eventMeta(event: EventItem) {
  const parts = [
    formatStoredDateTime(event.start_at),
    ...(event.venue !== null && event.venue !== '' ? [event.venue] : []),
    ...(event.organiser !== null && event.organiser !== '' ? [event.organiser] : []),
  ];
  return parts.join(' · ');
}

/**
 * V3: 5 upcoming events from `/api/v1/events/upcoming` — the official ANU
 * Events surface only, already filtered and ordered by the server. `View all`
 * routes to the Events guided page.
 */
export function UpcomingEventsCard() {
  const { events } = useFeeds();

  return (
    <FeedPanel
      Icon={EventsIcon}
      emptyText="No upcoming ANU events are listed right now."
      renderMeta={eventMeta}
      state={events}
      title="Upcoming Events"
      unavailableText="Upcoming events are unavailable right now."
      viewAllTo="/events"
    />
  );
}
