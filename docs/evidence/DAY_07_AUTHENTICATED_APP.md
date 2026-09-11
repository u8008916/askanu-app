# Day 7 evidence — App → private RAG authentication

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day7-deployed-real` (from `62b4e48`)
**Date:** Friday 11 September 2026 — V3 Day 7
**Phase:** DEPLOYED REAL COURSE SLICE
**Deliverable:** PR — App → RAG identity-token authentication, production routing preserved

Every number below is real command output, a real DOM measurement from the running
app, or a real HTTP response. Nothing here is an assertion about what should happen.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.4.
**`gcloud` is not installed on this machine** (Day 6 blocker, still open).

---

## 0. Summary

Qasim's Day 7 message made RAG private and granted `roles/run.invoker` on
`askanu-rag` to `askanu-app-runtime`. The IAM half is done; this PR is the code
half: the App now sends `Authorization: Bearer <identity token>` on its one
outbound RAG call, with `RAG_SERVICE_URL` as the audience.

What changed, and what deliberately did not:

| | |
|---|---|
| Changed | `server/src/auth.js` (new), `server/src/server.js`, `server/src/config.js`, `server/src/main.js`, tests, `firebase.json` service ID, docs |
| Unchanged | everything under `frontend/src/`; the `POST /api/v1/ask` request and response shapes; the status enum; the byte-for-byte pass-through of RAG's envelope |
| Runtime dependencies added | **0** — the token comes from the Cloud Run metadata server via global `fetch` |
| Key files added | **0** — Application Default Credentials on Cloud Run *is* the metadata server |

Three things were found by measuring rather than by reading:

1. A missing metadata server fails in **19 ms**, not at the 2 s timeout — DNS for
   `metadata.google.internal` fails immediately off Cloud Run (§3.2). The
   timeout is for a hung server, not an absent one.
2. The RAG venv on this machine had gone stale since Day 3 (`ModuleNotFoundError:
   dotenv`); re-running the documented `pip install -e ".[test]"` fixed it. No
   RAG repo change (§3.1).
3. Port 8080 is still occupied by an unrelated process, as on Day 6. Live checks
   ran on 8099 and 8098 (§3).

**Not proven here, stated plainly:** a real identity token was never obtained on
this machine — there is no metadata server off Cloud Run and no `gcloud`. Every
auth test runs against a stub metadata server on an ephemeral port and an
injected provider. The first real App → RAG authenticated call happens in
Qasim's deploy; §5 says exactly what to look for.

---

## 1. What was built

### 1.1 Token provider — `server/src/auth.js`

One GET to
`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=<RAG_SERVICE_URL>`
with `Metadata-Flavor: Google`. The response body is the token.

- cached until 5 minutes before the JWT `exp` (read from the payload, not
  verified — this service is the bearer, not the audience);
- single-flight, so concurrent cold-start requests make one metadata call;
- 2 s `AbortController` cap; 2 s + the existing 32 s upstream timeout stays
  under the browser's 35 s abort;
- any failure throws a generic `TokenAcquisitionError` carrying **no** response
  text, so nothing from Google can reach an envelope.

### 1.2 The boundary — `server/src/server.js`

`createServer(config, { getIdToken })` — the second argument is the injection
seam. Production takes the default; tests inject a stub. `/health` never calls it.

`upstreamHeaders`, the object Day 6 left immediately above the single outbound
`fetch`, gains two entries:

| Header | Value | When |
|---|---|---|
| `Authorization` | `Bearer <token>` | auth enabled (default) |
| `X-Request-Id` | this boundary's `req_...` | always — the Day 6 correlation carry-over |

Three failure paths, all the controlled envelope from `API_CONTRACT.md:45-56`:

| Failure | HTTP | Log `reason` | RAG called? |
|---|---|---|---|
| token unobtainable | 502 | `token_unavailable` | no |
| RAG front end 401/403 | 502 | `upstream_auth_rejected` | yes, body discarded |
| RAG unreachable / timeout | 502 | `upstream_unreachable` / `upstream_timeout` | attempted |

401/403 are intercepted because they come from Cloud Run's front end with an
HTML body, not a contract envelope. Every other status is still returned byte
for byte — `ask.test.js` "passes an upstream error envelope through with its
own status" (503) is unchanged and green.

### 1.3 Configuration — `server/src/config.js`

- `authEnabled` — **true unless `RAG_AUTH_DISABLED` is truthy.** Fail-secure: a
  deploy that sets nothing is authenticated. Qasim's `--set-env-vars` line in
  `DEPLOYMENT.md` needs no new flag.
- `tokenAudience` — `RAG_SERVICE_URL` exactly, already trailing-slash-trimmed.
  Cloud Run validates `aud` against the service URL, not a path under it.

### 1.4 Not changed

- **`frontend/src/`** — nothing. `askEndpoint()` still returns a relative
  `/api/v1/ask`; the browser stays same-origin through the Hosting rewrite and
  never learns the RAG URL, let alone a token.
- **`docs/DECISION_LOG.md`** — no entry. No shared contract, architecture,
  source policy or security rule changed; this implements Day 7's existing V3
  decision (`QASIM_CROSS_REPO_TASKS.md:118`).

---

## 2. Automated tests

### 2.1 App service — 38/38

```
$ cd server && npm test
ℹ tests 38
ℹ suites 12
ℹ pass 38
ℹ fail 0
ℹ duration_ms 2421.4534
```

16 existing (all green with auth **on** via an injected stub) + 22 new in
`server/tests/auth.test.js`:

| Group | What it pins |
|---|---|
| outbound authentication | Bearer header reaches RAG with the injected token; envelope still byte-identical · `RAG_AUTH_DISABLED=true` → no `Authorization` header at all · `X-Request-Id` reaches RAG and the same value is in the App's log line |
| metadata token provider | audience query param + `Metadata-Flavor: Google` reach the stub · cached across calls; refreshed after `now` passes `exp − 5 min` · 4 concurrent calls → 1 metadata request · metadata 500 → generic error with none of `audience rejected` / `internal error` / `127.0.0.1` / `metadata` in the message · hung metadata server → rejects in **2008 ms** (cap 2000 + 500 slack) · `tokenExpiry` reads `exp` and applies the margin; falls back to 45 min for a non-JWT |
| controlled failures | provider throws `ECONNREFUSED 169.254.169.254` → 502 six-key envelope, body contains none of `ECONNREFUSED` / `169.254` / `metadata` / `at `, RAG never called · Cloud Run HTML 403 → 502 JSON envelope, body contains none of `<html` / `Forbidden` / `permission` / `metadata` · 401 same · RAG-authored 503 envelope still passed through as 503 |
| the token stays server-side | after a grounded answer, after a 403, after a token failure: the token string and the fragment `STUB_TOKEN` appear in neither the response body nor captured stdout; `Bearer` never appears in a log; no `authorization` response header |
| `/health` | 200 `{"status":"ok"}` with a provider that throws if called — it was not called |
| `loadConfig` | `authEnabled` true by default; false for `true`/`1`/`yes`/`TRUE`; true for `''`/`false`/`0`/`no` · `tokenAudience` has no `/api/v1/ask` and no trailing slash |

The one slow test is the hung-metadata case, which genuinely waits out the 2 s
cap. Total suite: 2.4 s.

### 2.2 Frontend — unchanged, 113/113

```
$ cd frontend && npm test
 Test Files  11 passed (11)
      Tests  113 passed (113)
```

### 2.3 Production build and bundle scan

```
$ cd frontend && npm run build
✓ 98 modules transformed.
dist/index.html                   0.95 kB │ gzip:  0.56 kB
dist/assets/index-DR34YFt2.css   22.28 kB │ gzip:  4.32 kB
dist/assets/index-jz-pyoFp.js   262.72 kB │ gzip: 84.51 kB
✓ built in 1.29s
```

Needle grep of `frontend/dist` — files matching each:

```
Bearer: 0
metadata.google: 0
RAG_AUTH: 0
run.app: 0
RAG_SERVICE_URL: 0
askanu-app-runtime: 0
Metadata-Flavor: 0
identity: 0
GEMINI: 0
askanu_backend: 0
positive control  /api/v1/ask: 1
```

Nothing about the auth path, the RAG URL, the runtime identity, the DB user or
Gemini is in the bundle. The positive control proves the grep works.

---

## 3. Live local chain

Same shape as production, one machine smaller: RAG on 8081, App on 8099, Vite
dev server on 5173 proxying `/api` to the App.

### 3.1 RAG

```
$ cd ../askanu-rag && .venv/Scripts/python -m uvicorn askanu_rag.main:app --app-dir src --host 127.0.0.1 --port 8081
ModuleNotFoundError: No module named 'dotenv'
```

Stale venv. `pip install -e ".[test]"` per `README.md`, then:

```
$ curl http://127.0.0.1:8081/health
{"status":"ok"} [200]
```

### 3.2 App, auth disabled (local mode)

```
$ cd server && PORT=8099 RAG_AUTH_DISABLED=true RAG_SERVICE_URL=http://localhost:8081 ASKANU_ENV=local node src/main.js
{"ts":"2026-09-11T02:04:36.362Z","event":"listening","port":8099,"environment":"local","upstream":"http://localhost:8081","auth":"disabled"}
```

```
$ curl http://127.0.0.1:8099/health
{"status":"ok"} [200]

$ curl -X POST http://127.0.0.1:8099/api/v1/ask -H "Content-Type: application/json" \
    -d '{"question":"What are the prerequisites for COMP1110?","history":[],"conversation_state":{"pending_clarification":null}}'
{"answer":"The stored evidence for COMP1110 (2026) does not establish its prerequisites.","items":[],"sources":[{"record_id":"courses:course:COMP1110_2026","source_id":"courses_programs_and_courses","title":"COMP1110 representative fixture","url":"https://programsandcourses.anu.edu.au/2026/course/COMP1110","domain":"courses"}],"request_id":"req_54bae232832c4d75bc5bf63fba8ba942","status":"insufficient_evidence","clarification":null}
[200]
```

RAG's envelope, RAG's `request_id`, RAG's stored canonical URL — passed through
untouched. (`insufficient_evidence` is what the local Day 5 fixture says about
prerequisites; the deployed answer comes from Carmen's Cloud SQL record.)

App log for that request:

```
{"ts":"2026-09-11T02:05:50.215Z","event":"ask","request_id":"req_dbcca59f-781f-4e07-a2b9-e24603383a8f","status":200,"upstream_status":200,"token_source":"none","duration_ms":40}
```

Status, both request ids, `token_source`, duration. Not the question, not the
answer.

### 3.3 App, auth at its default, against a local RAG — the negative control

Same RAG, second App instance, `RAG_AUTH_DISABLED` **not** set:

```
$ PORT=8098 RAG_SERVICE_URL=http://localhost:8081 ASKANU_ENV=local node src/main.js
{"ts":"2026-09-11T02:06:13.043Z","event":"listening","port":8098,"environment":"local","upstream":"http://localhost:8081","auth":"identity-token"}

$ curl http://127.0.0.1:8098/health
{"status":"ok"} [200]

$ time curl -X POST http://127.0.0.1:8098/api/v1/ask -H "Content-Type: application/json" -d '{"question":"What are the prerequisites for COMP1110?"}'
{"status":"error","answer":"AskANU could not reach the answer service. Please try again.","items":[],"sources":[],"clarification":null,"request_id":"req_7cf56965-3bd2-4a9f-9cd1-a8cd2ae99d13"}
[502]
real    0m0.063s
```

```
{"ts":"2026-09-11T02:06:15.141Z","event":"ask","request_id":"req_7cf56965-3bd2-4a9f-9cd1-a8cd2ae99d13","status":502,"reason":"token_unavailable","duration_ms":19}
```

This is the default doing its job: no metadata server → controlled envelope in
19 ms, reason in the log only, `/health` unaffected, RAG never called. It is
also what a Cloud Run revision would show if its metadata server were ever
unreachable — and the line an operator should look for.

### 3.4 Browser → App → RAG

Vite dev server with `VITE_DEV_PROXY_TARGET=http://localhost:8099` (set
temporarily in the git-ignored `.env`, restored after). Typed *What are the
prerequisites for COMP1110?* and clicked Send.

| Check | Result |
|---|---|
| network | `POST http://localhost:5173/api/v1/ask → 200 OK` — same-origin, relative path, no CORS |
| rendered state | `Not enough evidence to answer` notice + the answer text + a SOURCES card |
| source card `href` | `https://programsandcourses.anu.edu.au/2026/course/COMP1110` — the stored canonical URL, verbatim |
| source card attrs | `target="_blank"`, `rel="noopener noreferrer"` |
| console errors | none |
| desktop 1280 × 800 | chat left, resources right, source card rendered |
| App log | `"status":200,"upstream_status":200,"token_source":"none","duration_ms":6` |

The frontend needed no change to ride the authenticated boundary, because the
boundary is the only thing that knows RAG exists.

---

## 4. Changes outside `server/`

| File | Change |
|---|---|
| `firebase.json` | `serviceId`: `replace-me-app-service` → `askanu-app`, per Qasim's Day 7 message. **Qasim to confirm at deploy time**; a mismatch makes `firebase deploy` fail loudly, which is the preferred failure. |
| `.env.example` | `RAG_AUTH_DISABLED=true` under the App service block, marked local-only |
| `README.md` | local `npm start` line; `RAG_AUTH_DISABLED` in the config table; deploy paragraph |
| `docs/DEPLOYMENT.md` | new "App → RAG authentication" section; real RAG URL and service ID; smoke table gains the startup-log and anonymous-RAG-403 checks; correlation carry-over closed on the App side; blockers rewritten |
| `server/Dockerfile` | comment only — notes the metadata server and that no auth library or key is baked in |

---

## 5. What Qasim's deploy proves that this machine cannot

After `gcloud run deploy askanu-app ... --service-account askanu-app-runtime@... --set-env-vars RAG_SERVICE_URL=https://askanu-rag-6gqn2xc7ca-ts.a.run.app,ASKANU_ENV=dev`:

| Look for | Means |
|---|---|
| startup line `"auth":"identity-token"` | the default held; no `RAG_AUTH_DISABLED` leaked into the deploy |
| per-request `"token_source":"metadata","upstream_status":200` | a real token was minted for the App's runtime identity and RAG's invoker check accepted it — **the first real authenticated App → RAG call** |
| `"reason":"upstream_auth_rejected","upstream_status":403` | token minted but RAG rejected it: check the invoker grant is on `askanu-rag` and `RAG_SERVICE_URL` matches `status.url` exactly (audience) |
| `"reason":"token_unavailable"` | metadata server unreachable from the revision — should not happen on Cloud Run |
| `curl -X POST <RAG URL>/api/v1/ask` anonymously → 403 | RAG is still private; the only working path is through the App |

Then the Day 7 deployed smoke from `MY_DAY_BY_DAY_TASKS.md:115-124` — Firebase
URL, loading state, grounded COMP1110 answer, source card opening Programs &
Courses, controlled error state, desktop + one mobile width — is the second
half of today's deliverable and follows the deploy.

---

## 6. Open blockers

1. `gcloud` not installed here — build, push and real-token verification are Qasim's.
2. `askanu-app` service ID assumed from the Day 7 message, not read from `gcloud`.
3. Hosting cache headers still unverified (emulator does not apply them) — `curl -I` after deploy.
4. Carry-over for Carmen: log the inbound `X-Request-Id` next to RAG's own `request_id` so one request can be followed across both services.
