import { createServer as createHttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createMetadataTokenProvider, noAuthProvider } from './auth.js';

/**
 * The thin App integration boundary.
 *
 * Two responsibilities, and deliberately no third:
 *
 *   GET  /health        liveness for Cloud Run and for the Day 6 health-level
 *                       App -> RAG deployment check
 *   POST /api/v1/ask    forward to RAG, authenticated as the App's runtime
 *                       service account, and return its answer untouched
 *
 * It is a pass-through, not a second opinion. API_CONTRACT.md:188-189 states
 * source URLs come programmatically from stored records; if this service
 * reshaped the envelope it would become a place where provenance could be
 * rewritten. So the upstream status and bytes are returned exactly as received,
 * and the frozen status enum stays owned by RAG.
 *
 * Zero runtime dependencies: `node:http` and global `fetch` cover all of it,
 * and every dependency added here is one the Day 26 dependency scan has to
 * justify for a service that does two things.
 */

/*
 * Self-protection byte cap on the request body.
 *
 * SECURITY_BASELINE.md:19-21 sets the semantic limits: question max 2,000
 * characters, history max 10 prior turns, output target ~800 tokens. Ten prior
 * turns at roughly 800 tokens each is on the order of 32,000 characters, plus
 * the question and JSON overhead — so a legitimate request can be tens of
 * kilobytes. 64 KiB leaves real headroom above that while still bounding what
 * an abusive client can push through this process.
 *
 * This is a byte cap, not the contract limit. RAG still enforces the 2,000
 * character and 10 turn rules; a request can be well under 64 KiB and still be
 * rejected upstream. API_CONTRACT.md:41 maps oversized input to 413, so that is
 * what this returns.
 */
export const MAX_BODY_BYTES = 64 * 1024;

/**
 * API_CONTRACT.md:23 sets a backend timeout target of about 30 seconds. This
 * boundary waits a little longer so a slow-but-successful RAG response still
 * wins; the browser's own 35 s abort in frontend/src/chat/askApi.ts:25 sits
 * just above this.
 */
export const UPSTREAM_TIMEOUT_MS = 32_000;

const ASK_PATH = '/api/v1/ask';

class PayloadTooLargeError extends Error {}

/**
 * The controlled error envelope from API_CONTRACT.md:45-56.
 *
 * It is a valid v1 envelope, which matters: `parseAskResponse` in the frontend
 * accepts it, so a boundary failure renders through the existing error notice
 * instead of becoming a transport failure with no `request_id` to trace.
 *
 * The answer text is a safe, user-facing sentence. Never a stack trace, an
 * upstream error body, a credential or a prompt.
 */
function errorEnvelope(answer, requestId) {
  return {
    status: 'error',
    answer,
    items: [],
    sources: [],
    clarification: null,
    request_id: requestId,
  };
}

/**
 * Structured single-line log.
 *
 * SECURITY_BASELINE.md:25: default logs avoid raw questions and full chat
 * histories. Per-request lines carry routing metadata only — path, method,
 * status, `request_id`, duration — and the request body is never read into a
 * log line, the same rule frontend/src/chat/askApi.ts:47-60 follows in the
 * browser.
 *
 * One exception, at startup only: `main.js` logs the port, `ASKANU_ENV` and the
 * upstream RAG URL. None of it is secret and it is how an operator tells which
 * revision is pointed at which backend, but it is more than the per-request
 * lines carry, so the docs say so rather than claiming "status and request id
 * only" across the board.
 */
export function log(fields) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...fields });
  process.stdout.write(line + '\n');
}

function sendJson(res, statusCode, payload, { closeConnection = false } = {}) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.byteLength,
    'Cache-Control': 'no-store',
  };

  /*
   * Used when the request body was cut short. The connection carries a body we
   * deliberately stopped reading, so it is not safe to reuse for a keep-alive
   * request; Node closes the socket once this response has flushed.
   */
  if (closeConnection) {
    headers.Connection = 'close';
  }

  res.writeHead(statusCode, headers);
  res.end(body);
}

/**
 * Buffers the request body, giving up as soon as the cap is passed.
 *
 * Two ways a client can send an oversized body, and both have to end in the
 * same controlled 413:
 *
 *   Content-Length declared — rejected below before a byte is read.
 *   Transfer-Encoding: chunked — no length to check, so the cap can only be
 *   hit part-way through the stream.
 *
 * In the second case the promise rejects immediately so the 413 is written at
 * once, but the request stream is deliberately **not** destroyed. Destroying it
 * here tears down the socket underneath the response, and the client gets an
 * empty connection instead of the envelope. Later chunks are read and thrown
 * away rather than buffered, so memory stays bounded either way.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const declared = Number.parseInt(req.headers['content-length'] ?? '', 10);

    // Reject an oversized body before reading a byte of it, where the client
    // was honest enough to declare its length.
    if (Number.isInteger(declared) && declared > MAX_BODY_BYTES) {
      reject(new PayloadTooLargeError());
      return;
    }

    const chunks = [];
    let size = 0;
    let settled = false;

    req.on('data', (chunk) => {
      // Already over the cap: drain without buffering. The response is on its
      // way; the socket must not stall waiting for someone to read this.
      if (settled) {
        return;
      }

      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        settled = true;
        chunks.length = 0;
        reject(new PayloadTooLargeError());
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });
  });
}

/**
 * Forwards one `/api/v1/ask` request.
 *
 * App -> RAG service-to-service authentication (QASIM_CROSS_REPO_TASKS.md:116-119)
 * is one extra header on the `fetch` below and nothing else, which is why the
 * outbound call is kept in a single place.
 */
async function forwardAsk(req, res, config, getIdToken, requestId, startedAt) {
  let body;

  try {
    body = await readBody(req);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      log({ event: 'ask', request_id: requestId, status: 413, reason: 'body_too_large' });
      sendJson(
        res,
        413,
        errorEnvelope('That request was too large to process.', requestId),
        // The rest of the body is being discarded, so do not reuse the socket.
        { closeConnection: true },
      );
      return;
    }

    log({ event: 'ask', request_id: requestId, status: 400, reason: 'body_read_failed' });
    sendJson(res, 400, errorEnvelope('The request could not be completed.', requestId));
    return;
  }

  /*
   * Obtained before the upstream timer starts so token acquisition has its own
   * budget (auth.js) and cannot eat into RAG's. A failure here is the App's own
   * misconfiguration or a metadata-server fault, never the student's doing, so
   * it is a controlled 502 with the reason in the log and nothing in the body.
   */
  let token;

  try {
    token = await getIdToken();
  } catch {
    log({
      event: 'ask',
      request_id: requestId,
      status: 502,
      reason: 'token_unavailable',
      duration_ms: Date.now() - startedAt,
    });
    sendJson(
      res,
      502,
      errorEnvelope('AskANU could not reach the answer service. Please try again.', requestId),
    );
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    /*
     * The single place anything is added to an outbound RAG call.
     *
     *   - `Authorization`: the identity token for the App's runtime service
     *     account, audience = RAG's URL. Absent only when auth is disabled for
     *     local development. The browser never sees it; it is not echoed, not
     *     logged, and not part of any response.
     *   - `X-Request-Id`: this boundary's own id, so a RAG log line can be
     *     matched to ours. Correlation cannot be done by rewriting the response
     *     — the envelope passes through untouched, so the `request_id` the
     *     student sees is RAG's. The link has to be made in the logs.
     */
    const upstreamHeaders = {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    };

    if (token !== null) {
      upstreamHeaders.Authorization = `Bearer ${token}`;
    }

    const upstream = await fetch(config.askUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body,
      signal: controller.signal,
    });

    /*
     * 401/403 come from Cloud Run's front end, not from RAG's handler — the
     * body is HTML, not a contract envelope, and API_CONTRACT.md:37-43 gives
     * those statuses no meaning. Passing it through would hand the browser a
     * transport failure with no `request_id`. It is an infrastructure rejection
     * (wrong audience, missing invoker role, expired token), so it becomes the
     * controlled envelope with the reason logged for the operator.
     */
    if (upstream.status === 401 || upstream.status === 403) {
      await upstream.arrayBuffer();
      log({
        event: 'ask',
        request_id: requestId,
        status: 502,
        upstream_status: upstream.status,
        reason: 'upstream_auth_rejected',
        token_source: token === null ? 'none' : 'metadata',
        duration_ms: Date.now() - startedAt,
      });
      sendJson(
        res,
        502,
        errorEnvelope('AskANU could not reach the answer service. Please try again.', requestId),
      );
      return;
    }

    // Bytes, not text: the answer is returned exactly as RAG produced it.
    const upstreamBody = Buffer.from(await upstream.arrayBuffer());

    res.writeHead(upstream.status, {
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'Content-Length': upstreamBody.byteLength,
      'Cache-Control': 'no-store',
    });
    res.end(upstreamBody);

    log({
      event: 'ask',
      request_id: requestId,
      status: upstream.status,
      upstream_status: upstream.status,
      token_source: token === null ? 'none' : 'metadata',
      duration_ms: Date.now() - startedAt,
    });
  } catch (error) {
    /*
     * RAG unreachable, DNS failure, connection reset, or our own timeout. The
     * student sees one safe sentence; the operator gets the reason and the
     * request id. The upstream error text is never forwarded — it is exactly
     * the kind of internal dependency diagnostic API_CONTRACT.md:58 forbids.
     */
    const timedOut = error && error.name === 'AbortError';

    log({
      event: 'ask',
      request_id: requestId,
      status: 502,
      reason: timedOut ? 'upstream_timeout' : 'upstream_unreachable',
      duration_ms: Date.now() - startedAt,
    });
    sendJson(
      res,
      502,
      errorEnvelope('AskANU could not reach the answer service. Please try again.', requestId),
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `getIdToken` is the injection seam for tests: a stub provider means no test
 * needs GCP credentials or a metadata server. Production takes the default.
 * `/health` never calls it, so liveness does not depend on auth.
 */
export function createServer(config, { getIdToken } = {}) {
  const tokenProvider =
    getIdToken ??
    (config.authEnabled
      ? createMetadataTokenProvider({ audience: config.tokenAudience })
      : noAuthProvider);

  return createHttpServer((req, res) => {
    const startedAt = Date.now();
    const requestId = 'req_' + randomUUID();

    // Query strings are not part of any App-boundary route; compare the path.
    const path = (req.url ?? '/').split('?')[0];

    /*
     * API_CONTRACT.md:185-186: /health must not expose secrets, prompts,
     * credentials or stack traces. So it reports liveness and nothing else — no
     * version, no config echo, no upstream probe. Anything richer is a free
     * reconnaissance endpoint on a public URL.
     */
    if (path === '/health') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, errorEnvelope('Method not allowed.', requestId));
        return;
      }

      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (path === ASK_PATH) {
      if (req.method !== 'POST') {
        /*
         * Includes OPTIONS. No CORS headers are sent on purpose: the deployed
         * browser reaches this service through the Firebase Hosting rewrite in
         * firebase.json, so requests are same-origin and never preflight. See
         * docs/DEPLOYMENT.md.
         */
        log({ event: 'ask', request_id: requestId, status: 405, method: req.method });
        sendJson(res, 405, errorEnvelope('Method not allowed.', requestId));
        return;
      }

      void forwardAsk(req, res, config, tokenProvider, requestId, startedAt);
      return;
    }

    log({ event: 'request', request_id: requestId, status: 404, path });
    sendJson(res, 404, errorEnvelope('Not found.', requestId));
  });
}
