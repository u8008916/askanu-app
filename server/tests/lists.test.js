import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test, { after, before, describe } from 'node:test';
import { createServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';

/**
 * The two deterministic list endpoints are pass-throughs like `/ask`: item
 * order is the contract's deterministic order and every `url` is a stored
 * canonical URL, and a boundary that reshaped the envelope is where either
 * would quietly break.
 */

function startUpstream() {
  const received = [];
  let reply = { status: 200, body: '{"status":"ok","items":[],"request_id":"req_x"}' };

  const server = createHttpServer((req, res) => {
    received.push({
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      requestId: req.headers['x-request-id'],
    });
    res.writeHead(reply.status, { 'Content-Type': 'application/json' });
    res.end(reply.body);
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

/** Field set and order from the RAG repo's reviewed `/api/v1/jobs/current`. */
const JOBS_ENVELOPE = JSON.stringify({
  status: 'ok',
  items: [
    {
      record_id: 'jobs:job:900001',
      source_id: 'jobs_anu_search',
      job_id: '900001',
      title: 'Role B closes later',
      employment_types: ['Full time'],
      location: 'Canberra / ACT',
      classification: null,
      salary: null,
      closing_text: 'Closes 8 January 2099',
      closing_date: '2099-01-08',
      closing_at: null,
      status: 'current',
      url: 'https://jobs.anu.edu.au/jobs/role-b',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900002',
      source_id: 'jobs_anu_search',
      job_id: '900002',
      title: 'Role A closes first',
      employment_types: [],
      location: null,
      classification: null,
      salary: null,
      closing_text: null,
      closing_date: null,
      closing_at: null,
      status: 'current',
      url: 'https://jobs.anu.edu.au/jobs/role-a',
      domain: 'jobs',
    },
  ],
  request_id: 'req_upstream_jobs',
});

const STUB_TOKEN = 'stub-identity-token';
const stubProvider = { getIdToken: async () => STUB_TOKEN };

let upstream;
let baseUrl;
let server;

before(async () => {
  upstream = startUpstream();
  const upstreamUrl = await upstream.listen();
  server = createServer(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), stubProvider);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await upstream.close();
});

describe('GET list endpoints pass-through', () => {
  test('returns /api/v1/jobs/current byte for byte, in upstream order', async () => {
    upstream.setReply({ status: 200, body: JOBS_ENVELOPE });

    const response = await fetch(`${baseUrl}/api/v1/jobs/current`);
    const text = await response.text();

    assert.equal(response.status, 200);
    assert.equal(text, JOBS_ENVELOPE);
    // Upstream order is the deterministic order; the boundary does not re-sort.
    assert.deepEqual(
      JSON.parse(text).items.map((item) => item.record_id),
      ['jobs:job:900001', 'jobs:job:900002'],
    );
    // Stored canonical URLs arrive untouched.
    assert.equal(JSON.parse(text).items[0].url, 'https://jobs.anu.edu.au/jobs/role-b');
  });

  test('forwards /api/v1/events/upcoming to the same upstream path', async () => {
    upstream.setReply({
      status: 200,
      body: '{"status":"ok","items":[],"request_id":"req_upstream_events"}',
    });

    const response = await fetch(`${baseUrl}/api/v1/events/upcoming`);

    assert.equal(response.status, 200);
    assert.equal(upstream.received.at(-1).url, '/api/v1/events/upcoming');
  });

  test('sends the identity token and a request id upstream', async () => {
    upstream.setReply({ status: 200, body: JOBS_ENVELOPE });

    await fetch(`${baseUrl}/api/v1/jobs/current`);
    const last = upstream.received.at(-1);

    assert.equal(last.method, 'GET');
    assert.equal(last.authorization, `Bearer ${STUB_TOKEN}`);
    assert.match(last.requestId, /^req_/);
  });

  test('forwards a numeric limit and drops every other query parameter', async () => {
    upstream.setReply({ status: 200, body: JOBS_ENVELOPE });

    await fetch(`${baseUrl}/api/v1/jobs/current?limit=5&debug=1&foo=bar`);
    assert.equal(upstream.received.at(-1).url, '/api/v1/jobs/current?limit=5');

    await fetch(`${baseUrl}/api/v1/jobs/current?limit=abc`);
    assert.equal(upstream.received.at(-1).url, '/api/v1/jobs/current');

    await fetch(`${baseUrl}/api/v1/jobs/current`);
    assert.equal(upstream.received.at(-1).url, '/api/v1/jobs/current');
  });

  test('passes an upstream error envelope through with its own status', async () => {
    const envelope = '{"status":"error","items":[],"request_id":"req_upstream_err"}';
    upstream.setReply({ status: 503, body: envelope });

    const response = await fetch(`${baseUrl}/api/v1/jobs/current`);

    assert.equal(response.status, 503);
    assert.equal(await response.text(), envelope);
  });

  test('passes an upstream 404 through for an endpoint RAG has not shipped', async () => {
    // Events is completed on the Saturday build day; until then RAG returns
    // 404 and the browser must be told so, not handed invented events.
    upstream.setReply({ status: 404, body: '{"detail":"Not Found"}' });

    const response = await fetch(`${baseUrl}/api/v1/events/upcoming`);

    assert.equal(response.status, 404);
  });

  test('rejects a non-GET method with the controlled envelope', async () => {
    const before = upstream.received.length;

    const response = await fetch(`${baseUrl}/api/v1/jobs/current`, { method: 'POST' });
    const body = await response.json();

    assert.equal(response.status, 405);
    assert.equal(body.status, 'error');
    assert.equal(upstream.received.length, before, 'a POST reached upstream');
  });

  test('returns a controlled 502 when the upstream is unreachable', async () => {
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
      const response = await fetch(`${isolatedUrl}/api/v1/jobs/current`);
      const text = await response.text();

      assert.equal(response.status, 502);
      const body = JSON.parse(text);
      assert.equal(body.status, 'error');
      assert.deepEqual(body.items, []);
      assert.match(body.request_id, /^req_/);
      for (const forbidden of ['ECONNREFUSED', 'at ', '127.0.0.1', 'Error:', String(deadPort)]) {
        assert.ok(!text.includes(forbidden), `error body leaked ${forbidden}`);
      }
    } finally {
      await new Promise((resolve) => isolated.close(resolve));
    }
  });
});
