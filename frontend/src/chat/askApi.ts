import type { AskResponse } from '../types/api';
import { parseAskResponse } from './askResponse';
import type { AskTransport } from './askTransport';

/**
 * The real `/api/v1/ask` client.
 *
 * Written to the `AskTransport` signature that `useChatSession` has depended on
 * since Day 2, so connecting the backend changes no component: the session
 * already builds a real `AskRequest` and already renders every status in the
 * frozen enum.
 *
 * SECURITY_BASELINE.md: no credentials are sent, the response is schema
 * validated before it reaches React state, and failures are logged with the
 * HTTP status and `request_id` only — never the question or the history.
 */

const ASK_PATH = '/api/v1/ask';

/**
 * API_CONTRACT.md sets a backend timeout target of about 30 seconds. The client
 * gives the service a little longer than its own target before giving up, so a
 * backend that answers slowly still wins the race against this abort.
 */
export const REQUEST_TIMEOUT_MS = 35_000;

/**
 * The App integration boundary.
 *
 * `VITE_API_BASE_URL` unset or empty means "same origin", which resolves to a
 * relative `/api/v1/ask`. That is what the Vite dev proxy serves locally and
 * what App-service hosting will serve later; an absolute value points the
 * browser straight at the boundary instead.
 */
export function askEndpoint(): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
  return base === '' ? ASK_PATH : `${base}${ASK_PATH}`;
}

class AskTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AskTransportError';
  }
}

/**
 * A request that produced no usable envelope.
 *
 * `useChatSession` turns a thrown error into its own client-side `error` turn
 * with an empty `request_id`, because no request completed. Nothing is logged
 * beyond the status: the request body carries the student's question.
 */
function failed(message: string, status?: number): AskTransportError {
  console.error('[askanu] /api/v1/ask failed', {
    reason: message,
    ...(status === undefined ? {} : { status }),
  });
  return new AskTransportError(message);
}

export const askApi: AskTransport = async (request, signal) => {
  if (signal?.aborted) {
    throw new DOMException('The request was aborted.', 'AbortError');
  }

  /*
   * One controller drives both cancellation paths: the caller's signal (Clear
   * Chat, unmount) and the client timeout. `AbortSignal.any` is not available
   * across the Node/jsdom versions this repo runs on, so the two are wired by
   * hand.
   */
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let httpStatus = 0;
  let body: unknown;
  try {
    const httpResponse = await fetch(askEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
      // No cookies, no credentials. The browser never authenticates to the API.
      credentials: 'omit',
    });
    httpStatus = httpResponse.status;

    const text = await httpResponse.text();
    try {
      body = JSON.parse(text);
    } catch {
      // An HTML error page, an empty body or a truncated response. There is no
      // envelope to render, so this is a transport failure.
      throw failed('Response body was not JSON.', httpStatus);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  /*
   * The body is parsed whatever the HTTP status is. API_CONTRACT.md returns the
   * same controlled `error` envelope for 400, 413, 429 and 5xx, so a valid
   * envelope is a real response and renders through the existing error notice.
   * Only an unparseable or off-contract body is treated as a failure.
   */
  const response: AskResponse | null = parseAskResponse(body);
  if (response === null) {
    throw failed('Response did not match the v1 contract envelope.', httpStatus);
  }

  if (response.status === 'error') {
    console.error('[askanu] /api/v1/ask returned an error envelope', {
      status: httpStatus,
      request_id: response.request_id,
    });
  }

  return response;
};
