import assert from 'node:assert/strict';
import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import test, { after, before, describe } from 'node:test';
import { MAX_BODY_BYTES, createServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';

/**
 * The boundary is a pass-through. These tests exist to catch the day someone
 * decides it would be convenient to "fix up" an answer on the way past:
 * API_CONTRACT.md:188-189 makes provenance a property of stored records, and a
 * proxy that rewrites envelopes is where that property would quietly die.
 */

/** A stub standing in for RAG. Records what it was sent; replies as told. */
function startUpstream() {
  const received = [];
  let reply = { status: 200, body: '{"status":"ok"}' };

  const server = createHttpServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      received.push({
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        body: Buffer.concat(chunks).toString('utf8'),
      });
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(reply.body);
    });
  });

  return {
    received,
    setReply(next) {
      reply = next;
    },
    async listen() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      return `http://127.0.0.1:${server.address().port}`;
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Captures the service's stdout so log content can be asserted on. */
async function captureLogs(run) {
  const original = process.stdout.write.bind(process.stdout);
  const lines = [];

  process.stdout.write = (chunk, ...rest) => {
    lines.push(String(chunk));
    return original(chunk, ...rest);
  };

  try {
    await run();
  } finally {
    process.stdout.write = original;
  }

  return lines.join('');
}

const GROUNDED_ENVELOPE = JSON.stringify({
  status: 'ok',
  answer: 'COMP1110 is offered in First Semester.',
  items: [],
  sources: [
    {
      record_id: 'course:COMP1110:2026',
      source_id: 'programs-and-courses',
      title: 'COMP1110 Structured Programming',
      url: 'https://programsandcourses.anu.edu.au/course/COMP1110',
      domain: 'courses',
    },
  ],
  clarification: null,
  request_id: 'req_upstream_1',
});

/**
 * Auth is on by default, and these tests run with it on. A stub provider stands
 * in for the metadata server so the pass-through is exercised exactly as it
 * runs in production, minus GCP.
 */
const STUB_TOKEN = 'stub-identity-token';
const stubProvider = { getIdToken: async () => STUB_TOKEN };

let upstream;
let baseUrl;
let server;

before(async () => {
  upstream = startUpstream();
  const upstreamUrl = await upstream.listen();
  server = createServer(loadConfig({ RAG_SERVICE_URL: upstreamUrl }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await upstream.close();
});

function ask(body, init = {}) {
  return fetch(`${baseUrl}/api/v1/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    ...init,
  });
}

describe('POST /api/v1/ask pass-through', () => {
  test('returns the upstream answer byte for byte', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });

    const response = await ask(JSON.stringify({ question: 'Tell me about COMP1110' }));
    const text = await response.text();

    assert.equal(response.status, 200);
    // Identical bytes: no re-serialisation, no key reordering, no added field.
    assert.equal(text, GROUNDED_ENVELOPE);
    // The source URL is the one RAG stored, untouched by this service.
    assert.equal(
      JSON.parse(text).sources[0].url,
      'https://programsandcourses.anu.edu.au/course/COMP1110',
    );
  });

  test('forwards the request body unchanged to /api/v1/ask', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const body = JSON.stringify({
      question: 'Does it have prerequisites?',
      history: [{ turn_id: 't1', role: 'user', content: 'Tell me about COMP1110' }],
      conversation_state: { pending_clarification: null },
    });

    await ask(body);
    const last = upstream.received.at(-1);

    assert.equal(last.method, 'POST');
    assert.equal(last.url, '/api/v1/ask');
    assert.equal(last.body, body);
  });

  test('passes an upstream error envelope through with its own status', async () => {
    const envelope = JSON.stringify({
      status: 'error',
      answer: 'The request could not be completed.',
      items: [],
      sources: [],
      clarification: null,
      request_id: 'req_upstream_err',
    });
    upstream.setReply({ status: 503, body: envelope });

    const response = await ask(JSON.stringify({ question: 'anything' }));

    // Not rewritten to a boundary 502: RAG answered, so RAG's answer stands.
    assert.equal(response.status, 503);
    assert.equal(await response.text(), envelope);
  });

  test('preserves clarification option order', async () => {
    const envelope = JSON.stringify({
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
      request_id: 'req_upstream_clar',
    });
    upstream.setReply({ status: 200, body: envelope });

    const body = await (await ask(JSON.stringify({ question: 'comp' }))).json();

    // Order is what `first` and `second` refer to (API_CONTRACT.md:128).
    assert.deepEqual(
      body.clarification.options.map((option) => option.id),
      ['course:COMP1110', 'course:COMP1600'],
    );
  });
});

describe('POST /api/v1/ask failures', () => {
  test('rejects an oversized body with 413 and never calls upstream', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const before = upstream.received.length;
    const huge = JSON.stringify({ question: 'x'.repeat(MAX_BODY_BYTES + 1024) });

    const response = await ask(huge);
    const body = await response.json();

    assert.equal(response.status, 413);
    assert.equal(body.status, 'error');
    assert.equal(upstream.received.length, before, 'oversized body reached upstream');
  });

  test('rejects an oversized chunked body with the same 413 envelope', async () => {
    /*
     * The Content-Length path above is caught before a byte is read. This is
     * the other way in: Transfer-Encoding: chunked has no length to check, so
     * the cap is only hit part-way through the stream. Destroying the request
     * there would tear the socket down under the response and hand the client
     * an empty connection instead of the envelope.
     */
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const before = upstream.received.length;
    const url = new URL(`${baseUrl}/api/v1/ask`);

    const { status, body, sentHeaders } = await new Promise((resolve, reject) => {
      const request = httpRequest(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          // Deliberately no Content-Length: Node then uses chunked encoding.
          headers: { 'Content-Type': 'application/json' },
        },
        (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () =>
            resolve({
              status: response.statusCode,
              body: Buffer.concat(chunks).toString('utf8'),
              sentHeaders: request.getHeaders(),
            }),
          );
        },
      );

      request.on('error', reject);

      // 96 KiB in 1 KiB chunks, well past the 64 KiB cap.
      request.write('{"question":"');
      for (let written = 0; written < 96 * 1024; written += 1024) {
        request.write('x'.repeat(1024));
      }
      request.end('"}');
    });

    assert.equal(sentHeaders['content-length'], undefined, 'a length was declared');
    assert.equal(status, 413);

    const envelope = JSON.parse(body);

    // The full controlled envelope, not a truncated or empty response.
    assert.deepEqual(Object.keys(envelope).sort(), [
      'answer',
      'clarification',
      'items',
      'request_id',
      'sources',
      'status',
    ]);
    assert.equal(envelope.status, 'error');
    assert.deepEqual(envelope.items, []);
    assert.deepEqual(envelope.sources, []);
    assert.equal(envelope.clarification, null);
    assert.match(envelope.request_id, /^req_/);

    assert.equal(upstream.received.length, before, 'oversized body reached upstream');
  });

  test('returns a controlled 502 when the upstream is unreachable', async () => {
    // A port that accepted a connection a moment ago and now refuses one.
    const dead = createHttpServer(() => {});
    await new Promise((resolve) => dead.listen(0, '127.0.0.1', resolve));
    const deadPort = dead.address().port;
    await new Promise((resolve) => dead.close(resolve));

    const isolated = createServer(
      loadConfig({ RAG_SERVICE_URL: `http://127.0.0.1:${deadPort}` }),
      stubProvider,
    );
    await new Promise((resolve) => isolated.listen(0, '127.0.0.1', resolve));
    const isolatedUrl = `http://127.0.0.1:${isolated.address().port}`;

    try {
      const response = await fetch(`${isolatedUrl}/api/v1/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'anything' }),
      });
      const text = await response.text();

      assert.equal(response.status, 502);

      const body = JSON.parse(text);

      assert.equal(body.status, 'error');
      assert.deepEqual(body.items, []);
      assert.deepEqual(body.sources, []);
      assert.equal(body.clarification, null);
      assert.match(body.request_id, /^req_/);

      // No stack trace, no upstream diagnostic, no internal address.
      for (const forbidden of ['ECONNREFUSED', 'at ', '127.0.0.1', 'Error:', String(deadPort)]) {
        assert.ok(!text.includes(forbidden), `error body leaked ${forbidden}`);
      }
    } finally {
      await new Promise((resolve) => isolated.close(resolve));
    }
  });

  test('rejects a non-POST method without sending CORS headers', async () => {
    const response = await fetch(`${baseUrl}/api/v1/ask`, { method: 'OPTIONS' });

    assert.equal(response.status, 405);
    // Same-origin by design: the Hosting rewrite means no preflight ever runs.
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

describe('logging', () => {
  test('records status and request id but never the question or history', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const question = 'What are the prerequisites for COMP1110 in 2026?';
    const historyContent = 'my previous private message';

    const logs = await captureLogs(async () => {
      await ask(JSON.stringify({
        question,
        history: [{ turn_id: 't1', role: 'user', content: historyContent }],
      }));
    });

    assert.ok(logs.includes('"status":200'), 'status was not logged');
    assert.match(logs, /"request_id":"req_/);
    // SECURITY_BASELINE.md:25 — default logs avoid raw questions and histories.
    assert.ok(!logs.includes(question), 'the question was logged');
    assert.ok(!logs.includes(historyContent), 'chat history was logged');
    assert.ok(!logs.includes('COMP1110'), 'answer content was logged');
  });
});
