import { JobsIcon } from '../ui/Icon';
import type { JobItem } from '../types/api';
import { FeedPanel } from './FeedPanel';
import { useFeeds } from './FeedsProvider';

/**
 * The secondary line: employment type(s), location and the closing wording,
 * each only when the source published it. `closing_text` is shown as stored
 * ("Closes 8 January 2099") — the App never derives a date or an open/closed
 * verdict from `closing_date`/`closing_at`; currentness is the server's
 * `status`, already applied before the list was sent.
 */
function jobMeta(job: JobItem) {
  const parts = [
    ...(job.employment_types.length > 0 ? [job.employment_types.join(', ')] : []),
    ...(job.location !== null && job.location !== '' ? [job.location] : []),
    ...(job.closing_text !== null && job.closing_text !== '' ? [job.closing_text] : []),
  ];
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** V3: 5 current roles from `/api/v1/jobs/current`; `View all` routes to the Jobs page. */
export function CurrentJobsCard() {
  const { jobs } = useFeeds();

  return (
    <FeedPanel
      Icon={JobsIcon}
      emptyText="No current ANU jobs are listed right now."
      renderMeta={jobMeta}
      state={jobs}
      title="Current Jobs"
      unavailableText="Current jobs are unavailable right now."
      viewAllTo="/jobs"
    />
  );
}
