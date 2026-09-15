import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EVENTS_UPCOMING_PATH,
  FEED_LIMIT,
  JOBS_CURRENT_PATH,
  fetchCurrentJobs,
  fetchUpcomingEvents,
} from '../src/resources/listApi';
import { parseJobItem, parseListResponse } from '../src/resources/listResponse';
import { mockCurrentJobs, mockUpcomingEvents } from '../src/mocks/feedResponses';

/**
 * The real list clients against a stubbed `fetch`. They must obey the reviewed
 * contracts, return items in server order, and turn every untrustworthy
 * response — non-2xx, error envelope, 404 from an unshipped endpoint,
 * off-contract body — into a throw rather than a partial list.
 */

function httpResponse(status: number, body: unknown) {
  return {
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => httpResponse(status, body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchCurrentJobs', () => {
  it('GETs the contract path with the default limit, no credentials', async () => {
    const fetchMock = stubFetch(200, {
      status: 'ok',
      items: mockCurrentJobs,
      request_id: 'req_jobs',
    });

    await fetchCurrentJobs();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${JOBS_CURRENT_PATH}?limit=${FEED_LIMIT}`);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('omit');
  });

  it('returns the items in the order the server sent them', async () => {
    const reversed = [...mockCurrentJobs].reverse();
    stubFetch(200, { status: 'ok', items: reversed, request_id: 'req_jobs' });

    const items = await fetchCurrentJobs();

    expect(items.map((job) => job.record_id)).toEqual(reversed.map((job) => job.record_id));
  });

  it('returns an empty list for a successful empty envelope', async () => {
    stubFetch(200, { status: 'ok', items: [], request_id: 'req_jobs_empty' });
    await expect(fetchCurrentJobs()).resolves.toEqual([]);
  });

  it.each([
    ['controlled error envelope', 503, { status: 'error', items: [], request_id: 'req_e' }],
    ['404 from an unshipped endpoint', 404, { detail: 'Not Found' }],
    ['non-JSON body', 200, '<html>proxy error</html>'],
    ['off-contract item', 200, { status: 'ok', items: [{ title: 'no ids' }], request_id: 'r' }],
    ['missing request_id', 200, { status: 'ok', items: [] }],
  ])('throws on %s instead of returning a list', async (_label, status, body) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch(status, body);

    await expect(fetchCurrentJobs()).rejects.toThrow();
  });

  it('logs the status only, never the response body', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch(503, { status: 'error', items: [], request_id: 'req_secret_id' });

    await fetchCurrentJobs().catch(() => {});

    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).toContain('503');
    expect(logged).not.toContain('req_secret_id');
  });
});

describe('fetchUpcomingEvents', () => {
  it('GETs the events contract path and returns items in order', async () => {
    const fetchMock = stubFetch(200, {
      status: 'ok',
      items: mockUpcomingEvents,
      request_id: 'req_events',
    });

    const items = await fetchUpcomingEvents();

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe(`${EVENTS_UPCOMING_PATH}?limit=${FEED_LIMIT}`);
    expect(items.map((event) => event.record_id)).toEqual(
      mockUpcomingEvents.map((event) => event.record_id),
    );
  });
});

describe('parseJobItem — the reviewed RAG shape', () => {
  const valid = mockCurrentJobs[0];

  it('accepts every fixture item', () => {
    for (const job of mockCurrentJobs) {
      expect(parseJobItem(job)).toEqual(job);
    }
  });

  it('accepts nulls in every nullable field and an empty employment_types', () => {
    expect(
      parseJobItem({
        ...valid,
        employment_types: [],
        location: null,
        classification: null,
        salary: null,
        closing_text: null,
        closing_date: null,
        closing_at: null,
      }),
    ).not.toBeNull();
  });

  it.each([
    ['missing record_id', { ...valid, record_id: undefined }],
    ['non-array employment_types', { ...valid, employment_types: 'Full time' }],
    ['status other than current', { ...valid, status: 'closed' }],
    ['wrong domain', { ...valid, domain: 'courses' }],
    ['missing url', { ...valid, url: undefined }],
  ])('rejects %s', (_label, item) => {
    expect(parseJobItem(item)).toBeNull();
  });

  it('rejects the whole envelope when one item is malformed', () => {
    const envelope = {
      status: 'ok',
      items: [valid, { ...valid, status: 'closed' }],
      request_id: 'req_mixed',
    };
    expect(parseListResponse(envelope, parseJobItem)).toBeNull();
  });
});
