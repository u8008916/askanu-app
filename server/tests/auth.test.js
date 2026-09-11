import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test, { after, before, describe } from 'node:test';
import {
  METADATA_IDENTITY_URL,
  TOKEN_FETCH_TIMEOUT_MS,
  createMetadataTokenProvider,
  tokenExpiry,
} from '../src/auth.js';
import { createServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';

/**
 * App -> RAG authentication. RAG is private on Cloud Run; the App must present
 * an identity token for its runtime service account on every call, and the
 * token must never travel anywhere else — not into a response, not into a log.
 *
 * No GCP here. The metadata server is a stub on an ephemeral port, injected via
 * `fetchImpl`; the token provider is injected via `createServer`'s second
 * argument. Same style as ask.test.js: real HTTP, no mocking library.
 */

/** A bearer that could not be mistaken for anything else in a body or a log. */
const STUB_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.STUB_TOKEN_MUST_NOT_LEAK.sig';

const ENVELOPE_KEYS = ['answer', 'clarification', 'items', 'request_id', 'sources', 'status'];

const GROUNDED_ENVELOPE = JSON.stringify({
  status: 'ok',
  answer: 'COMP1110 requires COMP1100 or COMP1130.',
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

/** What Cloud Run's front end sends when the invoker check fails. Not an envelope. */
const CLOUD_RUN_403 = `<html><head><meta http-equiv="content-type" content="text/html;charset=utf-8">
<title>403 Forbidden</title></head><body><h1>Error: Forbidden</h1>
<h2>Your client does not have permission to get URL <code>/api/v1/ask</code> from this server.</h2></body></html>`;

/** Unsigned JWT with the given `exp` (seconds). The provider reads the payload only. */
function fakeJwt(expSeconds) {
  const header = Buffer.from('{"alg":"RS256","typ":"JWT"}').toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: 'x', exp: expSeconds })).toString('base64url');
  return `${header}.${payload}.signature`;
}

/** A stub RAG. Records the headers it was sent; replies as told. */
function startUpstream() {
  const received = [];
  let reply = { status: 200, body: GROUNDED_ENVELOPE, contentType: 'application/json' };

  const server = createHttpServer((req, res) => {
    req.on('data', () => {});
    req.on('end', () => {
      received.push({
        authorization: req.headers.authorization,
        requestId: req.headers['x-request-id'],
      });
      res.writeHead(reply.status, { 'Content-Type': reply.contentType });
      res.end(reply.body);
    });
  });

  return {
    received,
    setReply(next) {
      reply = { contentType: 'application/json', ...next };
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

/**
 * A stub metadata server. `fetchImpl` rewrites the metadata hostname to this
 * stub so the provider's real URL construction is exercised.
 */
function startMetadata() {
  const received = [];
  let mode = 'token';
  let token = fakeJwt(Math.floor(Date.now() / 1000) + 3600);

  const server = createHttpServer((req, res) => {
    received.push({ url: req.url, flavor: req.headers['metadata-flavor'] });

    if (mode === 'hang') {
      return;
    }

    if (mode === 'error') {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('metadata server internal error: audience rejected');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(token);
  });

  let base;

  return {
    received,
    setMode(next) {
      mode = next;
    },
    setToken(next) {
      token = next;
    },
    fetchImpl(url, init) {
      return fetch(url.replace(METADATA_IDENTITY_URL, `${base}/identity`), init);
    },
    async listen() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      base = `http://127.0.0.1:${server.address().port}`;
    },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

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

async function startApp(config, providerOptions) {
  const server = createServer(config, providerOptions);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return {
    url: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function ask(appUrl, body = JSON.stringify({ question: 'What are the prerequisites for COMP1110?' })) {
  return fetch(`${appUrl}/api/v1/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function assertControlledEnvelope(body) {
  assert.deepEqual(Object.keys(body).sort(), ENVELOPE_KEYS);
  assert.equal(body.status, 'error');
  assert.deepEqual(body.items, []);
  assert.deepEqual(body.sources, []);
  assert.equal(body.clarification, null);
  assert.match(body.request_id, /^req_/);
}

let upstream;
let upstreamUrl;

before(async () => {
  upstream = startUpstream();
  upstreamUrl = await upstream.listen();
});

after(async () => {
  await upstream.close();
});

describe('outbound authentication', () => {
  test('sends the identity token as a Bearer header to RAG', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => STUB_TOKEN,
    });

    try {
      const response = await ask(app.url);

      assert.equal(response.status, 200);
      assert.equal(upstream.received.at(-1).authorization, `Bearer ${STUB_TOKEN}`);
      // The envelope is still byte-for-byte RAG's: auth adds nothing to it.
      assert.equal(await response.text(), GROUNDED_ENVELOPE);
    } finally {
      await app.close();
    }
  });

  test('sends no Authorization header when RAG_AUTH_DISABLED is set', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const app = await startApp(
      loadConfig({ RAG_SERVICE_URL: upstreamUrl, RAG_AUTH_DISABLED: 'true' }),
    );

    try {
      const response = await ask(app.url);

      assert.equal(response.status, 200);
      assert.equal(upstream.received.at(-1).authorization, undefined);
    } finally {
      await app.close();
    }
  });

  test('sends its own request id as X-Request-Id and logs the same value', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => STUB_TOKEN,
    });

    try {
      const logs = await captureLogs(async () => {
        await ask(app.url);
      });
      const sent = upstream.received.at(-1).requestId;

      assert.match(sent, /^req_/);
      // The id RAG received is the one an operator can find in the App's log.
      assert.ok(logs.includes(`"request_id":"${sent}"`), 'correlation id absent from App log');
    } finally {
      await app.close();
    }
  });
});

describe('metadata token provider', () => {
  let metadata;

  before(async () => {
    metadata = startMetadata();
    await metadata.listen();
  });

  after(async () => {
    await metadata.close();
  });

  test('requests a token for the RAG audience with the Metadata-Flavor header', async () => {
    metadata.setMode('token');
    const getIdToken = createMetadataTokenProvider({
      audience: 'https://askanu-rag-example.a.run.app',
      fetchImpl: metadata.fetchImpl,
    });

    await getIdToken();
    const last = metadata.received.at(-1);

    assert.equal(last.flavor, 'Google');
    assert.equal(
      new URL(last.url, 'http://x').searchParams.get('audience'),
      'https://askanu-rag-example.a.run.app',
    );
  });

  test('caches the token and refreshes once it nears expiry', async () => {
    metadata.setMode('token');
    let clock = Date.now();
    metadata.setToken(fakeJwt(Math.floor(clock / 1000) + 3600));
    const before = metadata.received.length;
    const getIdToken = createMetadataTokenProvider({
      audience: 'https://rag',
      fetchImpl: metadata.fetchImpl,
      now: () => clock,
    });

    const first = await getIdToken();
    const second = await getIdToken();

    assert.equal(first, second);
    assert.equal(metadata.received.length - before, 1, 'second call hit the metadata server');

    // 56 minutes on: inside the 5 minute margin before the 60 minute exp.
    clock += 56 * 60 * 1000;
    metadata.setToken(fakeJwt(Math.floor(clock / 1000) + 3600));
    const third = await getIdToken();

    assert.notEqual(third, first);
    assert.equal(metadata.received.length - before, 2, 'expired token was not refreshed');
  });

  test('makes one metadata call for concurrent cold-start requests', async () => {
    metadata.setMode('token');
    const before = metadata.received.length;
    const getIdToken = createMetadataTokenProvider({
      audience: 'https://rag',
      fetchImpl: metadata.fetchImpl,
    });

    const tokens = await Promise.all([getIdToken(), getIdToken(), getIdToken(), getIdToken()]);

    assert.equal(new Set(tokens).size, 1);
    assert.equal(metadata.received.length - before, 1);
  });

  test('turns a metadata error into a generic failure with no diagnostic text', async () => {
    metadata.setMode('error');
    const getIdToken = createMetadataTokenProvider({
      audience: 'https://rag',
      fetchImpl: metadata.fetchImpl,
    });

    await assert.rejects(getIdToken(), (error) => {
      assert.equal(error.name, 'TokenAcquisitionError');
      for (const forbidden of ['audience rejected', 'internal error', '127.0.0.1', 'metadata']) {
        assert.ok(!error.message.includes(forbidden), `error carried ${forbidden}`);
      }
      return true;
    });
  });

  test('gives up on a hung metadata server inside the fetch timeout', async () => {
    metadata.setMode('hang');
    const getIdToken = createMetadataTokenProvider({
      audience: 'https://rag',
      fetchImpl: metadata.fetchImpl,
    });

    const startedAt = Date.now();
    await assert.rejects(getIdToken(), { name: 'TokenAcquisitionError' });
    const elapsed = Date.now() - startedAt;

    assert.ok(elapsed < TOKEN_FETCH_TIMEOUT_MS + 500, `took ${elapsed} ms`);
    metadata.setMode('token');
  });

  test('reads exp from the token and applies the safety margin', () => {
    const exp = 1_800_000_000;

    assert.equal(tokenExpiry(fakeJwt(exp), 0), exp * 1000 - 5 * 60 * 1000);
  });

  test('falls back to a conservative lifetime for an unparseable token', () => {
    const now = 1_000_000;

    assert.equal(tokenExpiry('not-a-jwt', now), now + 45 * 60 * 1000);
  });
});

describe('controlled failures', () => {
  test('returns the error envelope when no token can be obtained', async () => {
    upstream.setReply({ status: 200, body: GROUNDED_ENVELOPE });
    const before = upstream.received.length;
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => {
        throw new Error('metadata.google.internal: ECONNREFUSED 169.254.169.254:80');
      },
    });

    try {
      const response = await ask(app.url);
      const text = await response.text();

      assert.equal(response.status, 502);
      assertControlledEnvelope(JSON.parse(text));
      for (const forbidden of ['ECONNREFUSED', '169.254', 'metadata', 'at ']) {
        assert.ok(!text.includes(forbidden), `error body leaked ${forbidden}`);
      }
      assert.equal(upstream.received.length, before, 'RAG was called without a token');
    } finally {
      await app.close();
    }
  });

  test('converts a Cloud Run 403 into the error envelope rather than passing HTML through', async () => {
    upstream.setReply({ status: 403, body: CLOUD_RUN_403, contentType: 'text/html' });
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => STUB_TOKEN,
    });

    try {
      const response = await ask(app.url);
      const text = await response.text();

      assert.equal(response.status, 502);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assertControlledEnvelope(JSON.parse(text));
      for (const forbidden of ['<html', 'Forbidden', 'permission', 'metadata']) {
        assert.ok(!text.includes(forbidden), `error body leaked ${forbidden}`);
      }
    } finally {
      await app.close();
    }
  });

  test('converts a 401 the same way', async () => {
    upstream.setReply({ status: 401, body: 'Unauthorized', contentType: 'text/plain' });
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => STUB_TOKEN,
    });

    try {
      const response = await ask(app.url);

      assert.equal(response.status, 502);
      assertControlledEnvelope(await response.json());
    } finally {
      await app.close();
    }
  });

  test('still passes a RAG-authored error envelope through with its own status', async () => {
    const envelope = JSON.stringify({
      status: 'error',
      answer: 'The request could not be completed.',
      items: [],
      sources: [],
      clarification: null,
      request_id: 'req_upstream_err',
    });
    upstream.setReply({ status: 503, body: envelope });
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => STUB_TOKEN,
    });

    try {
      const response = await ask(app.url);

      // Only 401/403 are intercepted. RAG's own controlled 5xx is RAG's answer.
      assert.equal(response.status, 503);
      assert.equal(await response.text(), envelope);
    } finally {
      await app.close();
    }
  });
});

describe('the token stays server-side', () => {
  for (const [label, reply] of [
    ['a grounded answer', { status: 200, body: GROUNDED_ENVELOPE }],
    ['a Cloud Run 403', { status: 403, body: CLOUD_RUN_403, contentType: 'text/html' }],
  ]) {
    test(`appears in neither the response nor the logs after ${label}`, async () => {
      upstream.setReply(reply);
      const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
        getIdToken: async () => STUB_TOKEN,
      });

      try {
        let text;
        const logs = await captureLogs(async () => {
          const response = await ask(app.url);
          text = await response.text();
          assert.equal(response.headers.get('authorization'), null);
        });

        assert.ok(!text.includes(STUB_TOKEN), 'token in response body');
        assert.ok(!text.includes('STUB_TOKEN'), 'token fragment in response body');
        assert.ok(!logs.includes(STUB_TOKEN), 'token in logs');
        assert.ok(!logs.includes('STUB_TOKEN'), 'token fragment in logs');
        assert.ok(!logs.includes('Bearer'), 'bearer scheme in logs');
      } finally {
        await app.close();
      }
    });
  }

  test('appears in neither the response nor the logs after a token failure', async () => {
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => {
        throw new Error(`partial token ${STUB_TOKEN}`);
      },
    });

    try {
      let text;
      const logs = await captureLogs(async () => {
        text = await (await ask(app.url)).text();
      });

      assert.ok(!text.includes('STUB_TOKEN'), 'token in response body');
      assert.ok(!logs.includes('STUB_TOKEN'), 'token in logs');
      assert.ok(logs.includes('"reason":"token_unavailable"'), 'reason absent from log');
    } finally {
      await app.close();
    }
  });
});

describe('GET /health', () => {
  test('answers without ever asking for a token', async () => {
    let called = false;
    const app = await startApp(loadConfig({ RAG_SERVICE_URL: upstreamUrl }), {
      getIdToken: async () => {
        called = true;
        throw new Error('health must not need a token');
      },
    });

    try {
      const response = await fetch(`${app.url}/health`);

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok' });
      assert.equal(called, false);
    } finally {
      await app.close();
    }
  });
});

describe('loadConfig auth fields', () => {
  test('enables auth by default', () => {
    assert.equal(loadConfig({ RAG_SERVICE_URL: 'https://rag.example' }).authEnabled, true);
  });

  test('disables auth only on an explicit truthy RAG_AUTH_DISABLED', () => {
    for (const value of ['true', '1', 'yes', 'TRUE']) {
      assert.equal(
        loadConfig({ RAG_SERVICE_URL: 'https://rag.example', RAG_AUTH_DISABLED: value }).authEnabled,
        false,
        `RAG_AUTH_DISABLED=${value}`,
      );
    }
    for (const value of ['', 'false', '0', 'no']) {
      assert.equal(
        loadConfig({ RAG_SERVICE_URL: 'https://rag.example', RAG_AUTH_DISABLED: value }).authEnabled,
        true,
        `RAG_AUTH_DISABLED=${value}`,
      );
    }
  });

  test('uses the RAG service URL as the audience, with no path and no trailing slash', () => {
    const config = loadConfig({ RAG_SERVICE_URL: 'https://askanu-rag-example.a.run.app/' });

    assert.equal(config.tokenAudience, 'https://askanu-rag-example.a.run.app');
    assert.ok(!config.tokenAudience.includes('/api/v1/ask'));
  });
});
