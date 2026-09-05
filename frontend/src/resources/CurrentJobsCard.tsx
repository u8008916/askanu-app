import { JobsIcon } from '../ui/Icon';
import { FeedPanel } from './FeedPanel';

/** V3 shows 5 current roles with `View all` routing to the resource page. */
export function CurrentJobsCard() {
  return (
    <FeedPanel
      Icon={JobsIcon}
      note="Placeholder only — awaiting the jobs endpoint."
      slotCount={5}
      title="Current Jobs"
    />
  );
}
