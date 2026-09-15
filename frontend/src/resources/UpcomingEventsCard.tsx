import { EventsIcon } from '../ui/Icon';
import type { EventItem } from '../types/api';
import { FeedPanel } from './FeedPanel';
import { useFeeds } from './FeedsProvider';

/**
 * Display formatting only. The server has already decided the event is
 * upcoming and put it in ascending order; this renders the stored `start_at`
 * in `Australia/Canberra` for reading. A value that does not parse is shown
 * as stored rather than dropped or guessed.
 */
const startFormat = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Australia/Canberra',
});

function formatStart(startAt: string): string {
  const time = Date.parse(startAt);
  return Number.isNaN(time) ? startAt : startFormat.format(time);
}

function eventMeta(event: EventItem) {
  const parts = [
    formatStart(event.start_at),
    ...(event.venue !== null && event.venue !== '' ? [event.venue] : []),
  ];
  return parts.join(' · ');
}

/**
 * V3: 5 upcoming events from `/api/v1/events/upcoming`. No `View all` yet —
 * the Events resource page is built on the Events build day, and until then
 * a route to nowhere would be a broken promise. The panel already renders
 * real records the moment the endpoint ships.
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
    />
  );
}
