import { mockCurrentJobs, mockUpcomingEvents } from '../mocks/feedResponses';
import type { FeedTransport } from '../resources/listApi';
import type { EventItem, JobItem } from '../types/api';

/**
 * Development-only transports for the two list panels.
 *
 * Reached only when `VITE_USE_MOCK_TRANSPORT=1` in a dev build, through
 * `resources/feedTransport.ts`; a production build drops this module and the
 * fixtures behind it. The mock never inspects the request.
 *
 * `unavailable` models every failure the real client turns into a throw:
 * transport error, controlled `error` envelope, or a RAG revision that has not
 * shipped the endpoint. Events defaults to that, because that is the truthful
 * state of the deployed service until the Events build day.
 */

export type MockFeedScenario = 'ok' | 'empty' | 'unavailable';

const DEFAULT_SCENARIOS: Record<'jobs' | 'events', MockFeedScenario> = {
  jobs: 'ok',
  events: 'unavailable',
};

const scenarios = { ...DEFAULT_SCENARIOS };

/** Set by tests and the dev picker. No production caller exists. */
export function setMockFeedScenario(
  feed: 'jobs' | 'events',
  scenario: MockFeedScenario,
): void {
  scenarios[feed] = scenario;
}

export function resetMockFeedScenarios(): void {
  Object.assign(scenarios, DEFAULT_SCENARIOS);
}

/**
 * Feeds are fetched once at page load, before any picker can be clicked, so
 * a browser session can pin a scenario for the next reload:
 *
 *     sessionStorage.setItem('askanu-dev-feed-jobs', 'empty')
 *
 * Read only under the dev mock; absent from a production build.
 */
function scenarioFor(feed: 'jobs' | 'events'): MockFeedScenario {
  try {
    const pinned = window.sessionStorage.getItem(`askanu-dev-feed-${feed}`);
    if (pinned === 'ok' || pinned === 'empty' || pinned === 'unavailable') {
      return pinned;
    }
  } catch {
    // No storage (private mode, jsdom without it): fall through.
  }
  return scenarios[feed];
}

/** Enough for the loading state to be real, short enough not to drag. */
export const MOCK_FEED_LATENCY_MS = 200;

function mockFeed<T>(feed: 'jobs' | 'events', items: T[]): FeedTransport<T> {
  return (signal) =>
    new Promise<T[]>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('The request was aborted.', 'AbortError'));
        return;
      }

      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        switch (scenarioFor(feed)) {
          case 'ok':
            resolve(items);
            return;
          case 'empty':
            resolve([]);
            return;
          case 'unavailable':
            reject(new Error('Mock feed unavailable.'));
        }
      }, MOCK_FEED_LATENCY_MS);

      function onAbort() {
        clearTimeout(timer);
        reject(new DOMException('The request was aborted.', 'AbortError'));
      }

      signal?.addEventListener('abort', onAbort, { once: true });
    });
}

export const mockJobsFeed: FeedTransport<JobItem> = mockFeed('jobs', mockCurrentJobs);
export const mockEventsFeed: FeedTransport<EventItem> = mockFeed('events', mockUpcomingEvents);
