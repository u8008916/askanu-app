import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { EventItem, JobItem } from '../types/api';
import { eventsFeedTransport, jobsFeedTransport } from './feedTransport';
import type { FeedTransport } from './listApi';

/**
 * What a panel can be asked to show. There is no "partial" — the client
 * throws rather than return a shortened list, so `ready` always carries the
 * whole server list, which may legitimately be empty.
 */
export type FeedState<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; items: T[] }
  | { kind: 'unavailable' };

interface Feeds {
  jobs: FeedState<JobItem>;
  events: FeedState<EventItem>;
}

const FeedsContext = createContext<Feeds | null>(null);

function useFeed<T>(transport: FeedTransport<T>): FeedState<T> {
  const [state, setState] = useState<FeedState<T>>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    transport(controller.signal).then(
      (items) => {
        if (active) {
          setState({ kind: 'ready', items });
        }
      },
      () => {
        if (active) {
          setState({ kind: 'unavailable' });
        }
      },
    );

    return () => {
      active = false;
      controller.abort();
    };
  }, [transport]);

  return state;
}

interface FeedsProviderProps {
  children: ReactNode;
  /** Injection seams for tests; production takes the selected transports. */
  jobsTransport?: FeedTransport<JobItem>;
  eventsTransport?: FeedTransport<EventItem>;
}

/**
 * Fetches each deterministic list once per page load and shares it.
 *
 * `ResourceCards` is mounted in the desktop rail, the mobile drawer and the
 * mobile home scroll; without this each mount would issue its own request.
 * One fetch on load is enough for a "short deterministic summary" (V3) — the
 * server owns freshness, and a reload picks up the next collection.
 */
export function FeedsProvider({
  children,
  jobsTransport = jobsFeedTransport,
  eventsTransport = eventsFeedTransport,
}: FeedsProviderProps) {
  const jobs = useFeed(jobsTransport);
  const events = useFeed(eventsTransport);

  return <FeedsContext.Provider value={{ jobs, events }}>{children}</FeedsContext.Provider>;
}

export function useFeeds(): Feeds {
  const feeds = useContext(FeedsContext);
  if (feeds === null) {
    throw new Error('useFeeds must be used inside FeedsProvider.');
  }
  return feeds;
}
