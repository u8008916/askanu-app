import assert from 'node:assert/strict';
import test, { after, before, describe } from 'node:test';
import { createServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';

/**
 * `/health` is the endpoint Cloud Run polls and the one Day 6's integration
 * check reaches for. API_CONTRACT.md:185-186 says it must not expose secrets,
 * prompts, credentials or stack traces, so these tests pin what it does *not*
 * say as tightly as what it does.
 */

let baseUrl;
let server;

before(async () => {
  const config = loadConfig({ RAG_SERVICE_URL: 'http://127.0.0.1:1/unused' });
  server = createServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('GET /health', () => {
  test('returns exactly the liveness envelope and nothing else', async () => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.deepEqual(body, { status: 'ok' });
    // No version, no config echo, no upstream URL: the whole payload is one key.
    assert.deepEqual(Object.keys(body), ['status']);
  });

  test('leaks no configuration in the response text', async () => {
    const text = await (await fetch(`${baseUrl}/health`)).text();

    for (const forbidden of ['RAG_SERVICE_URL', '127.0.0.1', 'unused', 'ASKANU_ENV']) {
      assert.ok(!text.includes(forbidden), `/health leaked ${forbidden}`);
    }
  });

  test('rejects a non-GET method with the controlled envelope', async () => {
    const response = await fetch(`${baseUrl}/health`, { method: 'POST' });

    assert.equal(response.status, 405);
    assert.equal((await response.json()).status, 'error');
  });
});

describe('unknown routes', () => {
  test('return a contract-shaped 404 rather than a Node default', async () => {
    const response = await fetch(`${baseUrl}/admin`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.status, 'error');
    assert.deepEqual(body.sources, []);
    assert.equal(body.clarification, null);
    assert.match(body.request_id, /^req_/);
  });
});

describe('loadConfig', () => {
  test('refuses to start without an upstream', () => {
    assert.throws(() => loadConfig({}), /RAG_SERVICE_URL is required/);
  });

  test('refuses a non-http upstream', () => {
    assert.throws(
      () => loadConfig({ RAG_SERVICE_URL: 'file:///etc/passwd' }),
      /must be http or https/,
    );
  });

  test('trims trailing slashes so the ask URL never doubles up', () => {
    const config = loadConfig({ RAG_SERVICE_URL: 'http://localhost:8081//' });

    assert.equal(config.askUrl, 'http://localhost:8081/api/v1/ask');
  });

  test('defaults to port 8080, which is what Cloud Run expects', () => {
    assert.equal(loadConfig({ RAG_SERVICE_URL: 'http://localhost:8081' }).port, 8080);
  });
});
