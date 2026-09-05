import { CurrentJobsCard } from './CurrentJobsCard';
import { QuickLinksCard } from './QuickLinksCard';
import { UpcomingEventsCard } from './UpcomingEventsCard';

interface ResourceCardsProps {
  quickLinksLayout?: 'grid' | 'row';
}

/**
 * Quick Links + Upcoming Events + Current Jobs.
 *
 * The confirmed UI shows these in the desktop rail, in the mobile drawer, and
 * in the mobile home scroll, so they are grouped once here.
 */
export function ResourceCards({ quickLinksLayout }: ResourceCardsProps) {
  return (
    <>
      <QuickLinksCard layout={quickLinksLayout} />
      <UpcomingEventsCard />
      <CurrentJobsCard />
    </>
  );
}
