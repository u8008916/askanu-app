import { apiEndpoint } from '../chat/askApi';
import type { EventItem, JobItem } from '../types/api';
import { parseEventItem, parseJobItem, parseListResponse } from './listResponse';

/**
 * The real clients for the two deterministic list endpoints.
 *
 * Same boundary rules as `chat/askApi.ts`: relative path through the App
 * service (Vite proxy locally, Firebase Hosting rewrite in production), no
 * credentials, schema validation before React state, and logs that carry the
 * HTTP status only.
 *
 * Each returns the items the server sent, in the order it sent them, or
 * throws. Throwing covers every way the panel cannot be trusted to show a
 * list — transport failure, non-2xx (including the controlled `error`
 * envelope and a 404 from a RAG revision that has not shipped the endpoint
 * yet), or an off-contract body. The panel shows one safe "unavailable"
 * state for all of them and never a partial or invented list.
 */

export const JOBS_CURRENT_PATH = '/api/v1/jobs/current';
export const EVENTS_UPCOMING_PATH = '/api/v1/events/upcoming';

/** API_CONTRACT.md: both panels default to 5. */
export const FEED_LIMIT = 5;

/** Lists are small and deterministic; they should answer well inside this. */
export const LIST_TIMEOUT_MS = 15_000;

export type FeedTransport<T> = (signal?: AbortSignal) => Promise<T[]>;

class ListTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListTransportError';
  }
}

function failed(path: string, message: string, status?: number): ListTransportError {
  console.error(`[askanu] ${path} failed`, {
    reason: message,
    ...(status === undefined ? {} : { status }),
  });
  return new ListTransportError(message);
}

async function fetchList<T>(
  path: string,
  parseItem: (item: unknown) => T | null,
  signal?: AbortSignal,
): Promise<T[]> {
  if (signal?.aborted) {
    throw new DOMException('The request was aborted.', 'AbortError');
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), LIST_TIMEOUT_MS);

  let httpStatus = 0;
  let body: unknown;
  try {
    const httpResponse = await fetch(`${apiEndpoint(path)}?limit=${FEED_LIMIT}`, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'omit',
    });
    httpStatus = httpResponse.status;

    const text = await httpResponse.text();
    try {
      body = JSON.parse(text);
    } catch {
      throw failed(path, 'Response body was not JSON.', httpStatus);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (httpStatus < 200 || httpStatus >= 300) {
    throw failed(path, 'Endpoint did not return a successful list.', httpStatus);
  }

  const response = parseListResponse(body, parseItem);
  if (response === null || response.status !== 'ok') {
    throw failed(path, 'Response did not match the v1 list contract.', httpStatus);
  }

  return response.items;
}

export const fetchCurrentJobs: FeedTransport<JobItem> = (signal) =>
  fetchList(JOBS_CURRENT_PATH, parseJobItem, signal);

export const fetchUpcomingEvents: FeedTransport<EventItem> = (signal) =>
  fetchList(EVENTS_UPCOMING_PATH, parseEventItem, signal);
