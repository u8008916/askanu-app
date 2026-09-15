import { mockEventsFeed, mockJobsFeed } from '../dev/mockFeeds';
import type { EventItem, JobItem } from '../types/api';
import { fetchCurrentJobs, fetchUpcomingEvents } from './listApi';
import type { FeedTransport } from './listApi';

/**
 * The transport seam for the list panels, selected the same way as
 * `chat/askTransport.ts`: the real clients in production, the dev mock only
 * when `VITE_USE_MOCK_TRANSPORT=1`. Vite folds the condition at build time, so
 * the mock and its fixtures are absent from a production bundle.
 */
const useMock =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_TRANSPORT === '1';

export const jobsFeedTransport: FeedTransport<JobItem> = useMock
  ? mockJobsFeed
  : fetchCurrentJobs;

export const eventsFeedTransport: FeedTransport<EventItem> = useMock
  ? mockEventsFeed
  : fetchUpcomingEvents;
