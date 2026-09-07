import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUEST_TIMEOUT_MS, askApi, askEndpoint } from '../src/chat/askApi';
import { HISTORY_MAX_TURNS } from '../src/types/api';
import type { AskRequest } from '../src/types/api';

/**
 * The real `/api/v1/ask` client, driven against a stubbed `fetch`.
 *
 * No new dependency and no live network: the point is to prove the client obeys
 * `docs/API_CONTRACT.md` — including the controlled error envelope for 400 /
 * 413 / 429 / 5xx, which must render as an answer turn rather than crash.
 */

const OK_ENVELOPE = {
  status: 'ok',
  answer: 'An answer from the service.',
  items: [],
  sources: [
    {
      record_id: 'course:COMP1110:2026',
      source_id: 'programs-and-courses',
      title: 'A stored record title',
      url: 'https://example.invalid/stored-record',
      domain: 'courses',
    },
  ],
  clarification: null,
  request_id: 'req_test_ok',
};

const CONTROLLED_ERROR = {
  status: 'error',
  answer: 'The request could not be completed.',
  items: [],
  sources: [],
  clarification: null,
  request_id: 'req_test_error',
};

function request(overrides: Partial<AskRequest> = {}): AskRequest {
  return {
    question: 'What are the prerequisites for COMP1110?',
    history: [],
    conversation_state: { pending_clarification: null },
    ...overrides,
  };
}

/** Minimal stand-in: the client reads `status` and `text()` and nothing else. */
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

/** A `fetch` that never settles until the request is aborted. */
function stubHangingFetch() {
  const fetchMock = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  // Failure paths log deliberately; keep the suite output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('askEndpoint', () => {
  it('is same-origin relative when no base URL is configured', () => {
    expect(askEndpoint()).toBe('/api/v1/ask');
  });

  it('uses the configured base URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8099');
    expect(askEndpoint()).toBe('http://localhost:8099/api/v1/ask');
  });

  it('trims trailing slashes and surrounding whitespace', () => {
    vi.stubEnv('VITE_API_BASE_URL', '  http://localhost:8099//  ');
    expect(askEndpoint()).toBe('http://localhost:8099/api/v1/ask');
  });
});

describe('askApi request', () => {
  it('POSTs the contract request as JSON without credentials', async () => {
    const fetchMock = stubFetch(200, OK_ENVELOPE);
    await askApi(request());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/v1/ask');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });

    const sent = JSON.parse(init.body as string);
    expect(sent).toEqual({
      question: 'What are the prerequisites for COMP1110?',
      history: [],
      conversation_state: { pending_clarification: null },
    });
  });

  it('sends history and pending clarification exactly as built', async () => {
    const fetchMock = stubFetch(200, OK_ENVELOPE);
    const history = Array.from({ length: HISTORY_MAX_TURNS }, (_, index) => ({
      turn_id: `turn-${index}`,
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `turn ${index}`,
    }));
    const pending = {
      id: 'clar-42',
      type: 'entity_selection',
      options: [
        { id: 'course:COMP1110', label: 'COMP1110' },
        { id: 'course:COMP1600', label: 'COMP1600' },
      ],
      allow_multiple: true,
    };

    await askApi(
      request({
        history,
        conversation_state: { pending_clarification: pending },
      }),
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const sent = JSON.parse(init.body as string);
    expect(sent.history).toHaveLength(HISTORY_MAX_TURNS);
    expect(sent.conversation_state.pending_clarification).toEqual(pending);
  });
});

describe('askApi response', () => {
  it('returns a validated ok envelope', async () => {
    stubFetch(200, OK_ENVELOPE);
    const response = await askApi(request());

    expect(response.status).toBe('ok');
    expect(response.answer).toBe('An answer from the service.');
    expect(response.sources).toHaveLength(1);
    expect(response.sources[0].url).toBe(
      'https://example.invalid/stored-record',
    );
    expect(response.request_id).toBe('req_test_ok');
  });

  it('drops fields the contract does not define', async () => {
    stubFetch(200, {
      ...OK_ENVELOPE,
      confidence: 'high',
      vector_score: 0.91,
      sources: [{ ...OK_ENVELOPE.sources[0], vector_score: 0.91 }],
    });
    const response = await askApi(request());

    expect(response).not.toHaveProperty('confidence');
    expect(response).not.toHaveProperty('vector_score');
    expect(response.sources[0]).not.toHaveProperty('vector_score');
  });

  it('defaults items, sources and clarification when they are absent', async () => {
    stubFetch(200, { status: 'ok', answer: 'Answer.', request_id: 'req_1' });
    const response = await askApi(request());

    expect(response.items).toEqual([]);
    expect(response.sources).toEqual([]);
    expect(response.clarification).toBeNull();
  });

  it('keeps clarification option order', async () => {
    stubFetch(200, {
      status: 'needs_clarification',
      answer: 'Do you mean COMP1110 or COMP1600?',
      items: [],
      sources: [],
      clarification: {
        id: 'clar-42',
        type: 'entity_selection',
        options: [
          { id: 'course:COMP1110', label: 'COMP1110' },
          { id: 'course:COMP1600', label: 'COMP1600' },
        ],
        allow_multiple: true,
      },
      request_id: 'req_clar',
    });
    const response = await askApi(request());

    expect(
      response.clarification?.options.map((option) => option.label),
    ).toEqual(['COMP1110', 'COMP1600']);
  });

  // API_CONTRACT.md: these all return the controlled `error` envelope, which is
  // a real response. It must reach the UI, not be discarded as a failure.
  it.each([400, 413, 429, 500, 503])(
    'returns the controlled error envelope on HTTP %i',
    async (status) => {
      stubFetch(status, CONTROLLED_ERROR);
      const response = await askApi(request());

      expect(response.status).toBe('error');
      expect(response.answer).toBe('The request could not be completed.');
      expect(response.request_id).toBe('req_test_error');
    },
  );
});

describe('askApi failures', () => {
  it('throws when the body is not JSON', async () => {
    stubFetch(502, '<html><body>Bad Gateway</body></html>');
    await expect(askApi(request())).rejects.toThrow();
  });

  it('throws on a status outside the frozen enum', async () => {
    stubFetch(200, { ...OK_ENVELOPE, status: 'high_confidence' });
    await expect(askApi(request())).rejects.toThrow();
  });

  it('throws when a source is missing contract fields', async () => {
    stubFetch(200, {
      ...OK_ENVELOPE,
      sources: [{ title: 'No record_id, source_id, url or domain' }],
    });
    await expect(askApi(request())).rejects.toThrow();
  });

  it('throws rather than rendering a half-valid clarification', async () => {
    stubFetch(200, {
      ...OK_ENVELOPE,
      status: 'needs_clarification',
      clarification: { id: 'clar-42', type: 'entity_selection' },
    });
    await expect(askApi(request())).rejects.toThrow();
  });

  it('never logs the question or the history', async () => {
    const logged = vi.mocked(console.error);
    stubFetch(500, '<html>upstream failure</html>');
    await expect(askApi(request())).rejects.toThrow();

    const text = JSON.stringify(logged.mock.calls);
    expect(text).not.toContain('COMP1110');
    expect(text).toContain('500');
  });
});

describe('askApi cancellation', () => {
  it('rejects immediately when the caller signal is already aborted', async () => {
    const fetchMock = stubFetch(200, OK_ENVELOPE);
    const controller = new AbortController();
    controller.abort();

    await expect(askApi(request(), controller.signal)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts the request when the caller aborts mid-flight', async () => {
    stubHangingFetch();
    const controller = new AbortController();
    const pending = askApi(request(), controller.signal);
    controller.abort();

    await expect(pending).rejects.toThrow();
  });

  it('aborts once the client timeout elapses', async () => {
    vi.useFakeTimers();
    stubHangingFetch();

    const pending = askApi(request());
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
  });
});
