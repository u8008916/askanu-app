import { EventsIcon } from '../ui/Icon';
import { FeedPanel } from './FeedPanel';

/** V3 shows 5 upcoming events with `View all` routing to the resource page. */
export function UpcomingEventsCard() {
  return (
    <FeedPanel
      Icon={EventsIcon}
      note="Placeholder only — awaiting the events endpoint."
      slotCount={5}
      title="Upcoming Events"
    />
  );
}
