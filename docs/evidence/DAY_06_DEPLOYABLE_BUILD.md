# Day 6 evidence — deployable App build + routing config

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day6-EARLY-GCP-FOUNDATION` (from `e305776`)
**Date:** Thursday 10 September 2026 — V3 Day 6
**Phase:** EARLY GCP FOUNDATION
**Deliverable:** PR — deployable App build + routing config

Every number below is real command output, a real DOM measurement from the running
app, or a real HTTP response. Nothing here is an assertion about what should happen.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.4, firebase-tools 15.17.0.
**`gcloud` is not installed on this machine.**

---

## 0. Summary

Day 5 left the App as a frontend only: `server/src` and `server/tests` held a
`.gitkeep` each, and `README.md` recorded *"`server/` stays empty until the App
service is built."* Day 6 builds it, because Qasim's Day 6 deploys a health-only
**App** service and `AGENTS.md:5` puts the App integration boundary in this repo.

Three things were found by measuring rather than by reading, and all three are
recorded below:

1. Port **8080 is already occupied** on this machine by an unrelated process, so
   the live App-service checks ran on 8099 (§3.2). Nothing in the config assumes
   8080 is free; Cloud Run injects `PORT`.
2. A `/index.html` cache-header rule in `firebase.json` **never fires** for
   `/courses`. Hosting matches the request path, and the SPA fallback means HTML
   is served at arbitrary paths. Found by dumping emulator headers; fixed (§4.3).
3. The Hosting emulator **does not apply the `headers` block at all**, so the
   caching rules are config-reviewed but unverified until Day 7 (§4.3).

**No backend was required today** and no file under `frontend/src/` was changed.
The UI is byte-identical to Day 5; the live chat screenshots therefore show the
Day 3 transport-failure state, which is the designed behaviour with no service
behind the preview.

---

## 1. Tasks

### 1.1 Thin App service — DONE

`server/`, zero runtime dependencies (`node:http` + global `fetch`).

| Route | Behaviour |
|---|---|
| `GET /health` | `200 {"status":"ok"}` — nothing else |
| `POST /api/v1/ask` | forwarded to `RAG_SERVICE_URL`, status and bytes returned untouched |
| oversized body | `413` + controlled envelope, upstream never called |
| upstream down/timeout | `502` + controlled envelope, no diagnostic leaked |
| anything else | `404` / `405` + controlled envelope |

The service holds no database credential, model key or prompt. It refuses to boot
without `RAG_SERVICE_URL`:

```
$ node -e "... loadConfig({})"
missing -> RAG_SERVICE_URL is required. See .env.example and docs/DEPLOYMENT.md.
```

### 1.2 Production build config — DONE (no change needed)

`frontend/vite.config.ts` was **not** modified. It already emits a correct
production bundle to `frontend/dist` with no source maps, and adding no-op
settings for the sake of a diff would be churn. §2 is the proof it works.

### 1.3 Environment-based API base URL — ALREADY DONE (Day 3), now pinned in production

`askEndpoint()` (`frontend/src/chat/askApi.ts:35-38`) has returned a relative
`/api/v1/ask` for an empty `VITE_API_BASE_URL` since Day 3, with three cases in
`frontend/tests/askApi.test.ts:89-102`. Day 6 did not rewrite it. What Day 6 adds
is the decision that production **also** leaves it empty, and the Hosting rewrite
that makes that work. Measured in the production build in §3.3.

### 1.4 Firebase Hosting config + fallback routes — DONE

`firebase.json` (new) and `.firebaserc` (new). Verified against the real Hosting
emulator in §4. `.firebaserc` carries the real project ID `askanu-dev-gdg`
(supplied in review, §9.1); the Cloud Run service ID in `firebase.json` is still
a marked placeholder.

---

## 2. Production build

```
$ cd frontend && npm run build

> askanu-frontend@0.1.0 build
> tsc --noEmit && vite build

vite v7.3.6 building client environment for production...
✓ 98 modules transformed.
dist/index.html                   0.95 kB │ gzip:  0.56 kB
dist/assets/index-DR34YFt2.css   22.28 kB │ gzip:  4.32 kB
dist/assets/index-jz-pyoFp.js   262.72 kB │ gzip: 84.51 kB
✓ built in 1.39s
```

`tsc --noEmit` passed before Vite ran. **Today's headline verification: PASS.**

### 2.1 No secret in the bundle

The local `.env` on this machine contains:

```
VITE_API_BASE_URL=
ASKANU_ENV=local
RAG_SERVICE_URL=http://localhost:8000
VITE_DEV_PROXY_TARGET=http://localhost:8000
```

Occurrences of each of these in `frontend/dist/`, counted:

| Needle | Hits |
|---|---|
| `RAG_SERVICE_URL` | 0 |
| `VITE_DEV_PROXY_TARGET` | 0 |
| `ASKANU_ENV` | 0 |
| `localhost` | 0 |
| `127.0.0.1` | 0 |
| `8080` / `8081` | 0 / 0 |
| `AIza` | 0 |
| `BEGIN PRIVATE KEY` | 0 |
| `service_account` | 0 |
| `api_key` / `apiKey` / `secret` | 0 / 0 / 0 |

Dev-only code was also dropped, confirming the claim in `askTransport.ts:26-28`:

| Needle | Hits |
|---|---|
| `MOCK_SCENARIOS` | 0 |
| `askMock` | 0 |
| `FixturePicker` | 0 |
| `req_mock` | 0 |
| `COMP1600` (clarification fixture) | 0 |
| `Structured Programming` (source fixture) | 0 |

Positive control — the relative endpoint **is** present:

```
$ grep -oF '/api/v1/ask' frontend/dist/assets/*.js
/api/v1/ask
```

### 2.2 Frontend test suite

```
Test Files  11 passed (11)
     Tests  113 passed (113)
  Duration  14.42s
```

Nothing under `frontend/src/` changed today, so this is a regression guard, not
new coverage.

---

## 3. The App service, running

### 3.1 Automated tests

```
$ cd server && node --test
ℹ tests 17
ℹ suites 6
ℹ pass 17
ℹ fail 0
```

Covering: `/health` returns exactly one key; a non-GET on `/health` is a 405
envelope; unknown routes give a contract-shaped 404; upstream answers pass
through byte-identical; an upstream 503 keeps its own status rather than being
rewritten to 502; clarification option order survives; oversized bodies 413
without reaching upstream, **both with a declared `Content-Length` and with
chunked transfer** (§9.2); an unreachable upstream gives a 502 with no
`ECONNREFUSED`, stack frame or internal address in the body; `OPTIONS` gets 405
with no `Access-Control-Allow-Origin`; and per-request logs carry status and
`request_id` but never the question, the history or the answer.

### 3.2 Live, with RAG stopped

**Port 8080 was already in use on this machine**, so the process was started on
8099. The `EADDRINUSE` was a real finding, not a config error:

```
Error: listen EADDRINUSE: address already in use :::8080
```

```
$ curl -s http://localhost:8099/health
{"status":"ok"}
```

```
$ curl -s -i -X POST http://localhost:8099/api/v1/ask -d '{"question":"What are the prerequisites for COMP1110?",...}'
HTTP/1.1 502 Bad Gateway
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{"status":"error","answer":"AskANU could not reach the answer service. Please try again.","items":[],"sources":[],"clarification":null,"request_id":"req_36f7b1f1-c186-4255-95cb-b3877ac462ce"}
```

That envelope satisfies `parseAskResponse`, so the browser renders it through the
existing error notice instead of treating it as a transport failure.

```
GET /admin            -> 404
OPTIONS /api/v1/ask   -> 405
```

Everything the process logged during those four requests:

```
{"ts":"2026-09-10T00:46:50.977Z","event":"listening","port":8099,"environment":"unknown","upstream":"http://localhost:8081"}
{"ts":"2026-09-10T00:46:57.819Z","event":"ask","request_id":"req_36f7b1f1-...","status":502,"reason":"upstream_unreachable","duration_ms":20}
{"ts":"2026-09-10T00:46:57.863Z","event":"request","request_id":"req_b0d7e9c8-...","status":404,"path":"/admin"}
{"ts":"2026-09-10T00:46:57.899Z","event":"ask","request_id":"req_c46cea24-...","status":405,"method":"OPTIONS"}
```

`grep -c COMP1110` over that log: **0**. The question was never written down
(`SECURITY_BASELINE.md:25`).

Note the first line. Per-request lines carry status and `request_id`; the
**startup** line also records port, `ASKANU_ENV` and the upstream RAG URL. None
of that is secret, but it is more than "status and request id", so it is stated
rather than glossed over (§9.4).

### 3.3 The production build posts same-origin

`npm run preview` on 4173, one question sent through the real UI, network log:

```
POST http://localhost:4173/api/v1/ask → 500 Internal Server Error
```

An **absolute** path on the preview origin, built from a relative request — which
is exactly what the Hosting rewrite needs. The 500 is the preview server having
no API behind it; the UI degraded to the error turn and `Try asking` disappeared
after the first message, as designed.

The only console errors were that failure and the client's own log line:

```
[askanu] /api/v1/ask failed {reason: Response body was not JSON., status: 500}
```

Status and reason, no question — the browser-side half of the same logging rule.

---

## 4. Firebase Hosting config, against the real emulator

```
$ firebase emulators:start --only hosting --project demo-askanu
i  hosting[demo-askanu]: Serving hosting files from: frontend/dist
+  hosting[demo-askanu]: Local server: http://127.0.0.1:5000
```

### 4.1 SPA fallback route

`frontend/dist/index.html` is 945 bytes.

```
/            -> 200  945
/courses     -> 200  945
/nope/deep   -> 200  945
```

Every non-API path serves the app. Without this rewrite a hard refresh on
`/courses` — a real route since Day 5 — would be a Hosting 404.

Loaded directly in the browser against the production build, `/courses` resolves
rather than bouncing to `/`:

```
{ href: "http://localhost:4173/courses", pathname: "/courses", h1: ["Courses"], fixturePicker: false }
```

One `h1`, and no dev fixture picker in the production build.

### 4.2 API rewrite is not shadowed by the fallback

```
$ curl -X POST http://127.0.0.1:5000/api/v1/ask
HTTP/1.1 500 Internal Server Error

A problem occurred while trying to handle a proxied rewrite: FirebaseError: Error
looking up URL for Cloud Run service: ... /locations/australia-southeast1/services/
replace-me-app-service had HTTP Error: 403, Permission denied on resource project
demo-askanu.
```

This is the result we want today. `/api/v1/ask` was **not** served `index.html`,
which proves the rewrite order is right, and the placeholder service ID failed
loudly rather than silently — the same way a real `firebase deploy` will refuse
until Qasim's values are filled in.

### 4.3 Cache headers — defect found, fixed, still unverified

First configuration used `"source": "/index.html"`. Dumping headers from the
emulator showed the rule never fired, and reasoning about the path made the
larger problem obvious: through the SPA fallback the HTML is served at
`/courses`, and Hosting matches the **request path**, not the resolved file.

Fixed to a broad-then-narrow pair — `**` → `no-cache`, then `/assets/**` →
`immutable` — which is what Vite's content-hashed filenames call for.

```
$ curl -D - http://127.0.0.1:5000/assets/index-DR34YFt2.css
HTTP/1.1 200 OK
Content-Type: text/css; charset=utf-8
Content-Length: 22282
ETag: 27012288a6166b4722ed9b25afcf73ad
Vary: Accept-Encoding
```

**No `Cache-Control` at all.** The Hosting emulator serves files and applies
rewrites but does not apply the `headers` block, so these two rules are
config-reviewed only. They must be checked with `curl -I` against the deployed
URL on Day 7. Recorded rather than claimed.

---

## 5. Responsive check on the production build

Measured `document.documentElement.scrollWidth` against `clientWidth` on the
built bundle, not the dev server:

| Width | scrollWidth | clientWidth | Horizontal scroll |
|---|---|---|---|
| 360 | 360 | 360 | no |
| 390 | 390 | 390 | no |
| 430 | 430 | 430 | no |

Desktop 1280×900 renders chat left, resources right; 430px renders the mobile app
bar, drawer toggle and stacked panels. No layout change was made today, so this
is a regression guard.

---

## 6. Verification checklist

| Check | Result |
|---|---|
| `npm run build` succeeds | PASS |
| No secret in `frontend/dist` | PASS — 12 needles, 0 hits |
| Dev mock/fixtures dropped from the bundle | PASS — 6 needles, 0 hits |
| Frontend suite green | PASS — 113/113 |
| App service suite green | PASS — 17/17 |
| Oversized body 413 with declared `Content-Length` | PASS |
| Oversized body 413 with chunked transfer | PASS (§9.2) |
| Deploy names the least-privilege runtime identity | PASS (§9.1) |
| `/health` exposes nothing but liveness | PASS |
| Boundary failures use the controlled envelope | PASS |
| Logs exclude question, history and answer | PASS |
| Production build posts a same-origin `/api/v1/ask` | PASS |
| SPA fallback serves `/courses` | PASS (emulator + browser) |
| `/api/**` rewrite not shadowed | PASS (emulator) |
| Hosting cache headers | **UNVERIFIED** — emulator does not apply them; Day 7 |
| No horizontal scroll at 360/390/430 | PASS |
| `git diff --check` | PASS |

---

## 7. Blockers / carry-over

| # | Blocker | Owner | Effect |
|---|---|---|---|
| 1 | Cloud Run App service ID unknown | Qasim | `firebase.json` holds `replace-me-app-service`; `firebase deploy` cannot run. Project ID is now known (`askanu-dev-gdg`) and set in `.firebaserc` — needs confirming that it is also the *Firebase* project ID |
| 2 | `gcloud` not installed on this machine | Ben / Qasim | App image cannot be built or pushed from here |
| 3 | Deployed RAG URL unknown | Carmen / Qasim | `RAG_SERVICE_URL` is local-only |
| 4 | App → RAG service-to-service auth not configured | Qasim | Day 7; one header in `upstreamHeaders` in `server/src/server.js` |
| 5 | Hosting cache headers unverified | Ben | Check with `curl -I` on the deployed URL, Day 7 |
| 6 | Request-ID correlation App ↔ RAG | Ben / Carmen | Day 7 gate needs end-to-end tracing; see §9.3 |

None of these blocks today's stated verification, which is a local production
build with no secret in the bundle. All of them block Day 7's deploy.

**Not in scope today, deliberately:** Hosting security headers (CSP/HSTS) are
Day 26; `/ask` rate limiting belongs at this boundary but is not Day 6 scope; CI
deploy workflow is Qasim's.

## 8. Contract / architecture status

No shared contract changed. `docs/API_CONTRACT.md`, `docs/CONVERSATION_CONTRACT.md`
and `docs/V3_LOCKED_DECISIONS.md` are untouched, no file under `frontend/src/`
changed, and no entry was added to `docs/DECISION_LOG.md` — `AGENTS.md:5` already
assigned the App integration boundary to this repo, so building it changes no V3
decision.

---

## 9. Review fixes (Qasim, Day 6 PR review — REQUEST CHANGES)

Two required changes, one Day 7 carry-over, one P2 documentation accuracy fix.

### 9.1 Cloud Run deployment identity — REQUIRED, FIXED

The original command in `docs/DEPLOYMENT.md` was:

```
gcloud run deploy <app-service-id> --source server --region australia-southeast1 --set-env-vars RAG_SERVICE_URL=<deployed-rag-url>
```

No `--service-account`. Cloud Run does not default to the dedicated runtime
identity — it defaults to the project's Compute Engine default service account,
which currently holds **Editor**. The deploy would have succeeded silently while
running the public-facing App on a far more privileged identity, cancelling the
least-privilege work done today.

Fixed. The deploy now names the identity explicitly:

```
--service-account askanu-app-runtime@askanu-dev-gdg.iam.gserviceaccount.com
```

Three related decisions are now written down rather than left implicit:

**Public access.** The App service is deployed `--allow-unauthenticated`, and
that is a requirement rather than a shortcut: Firebase Hosting calls a rewrite
target anonymously, so a private App service would make every `/api/**` request
403. The cost is stated too — the Cloud Run URL is reachable directly, not only
through Hosting — and it is why the `SECURITY_BASELINE.md` rate limit belongs at
this boundary. RAG remains private; App → RAG auth is Day 7.

**Registry.** `--source` was dropped in favour of an explicit
`gcloud builds submit --tag` into `askanu-containers`, then
`gcloud run deploy --image`. `--source` pushes to Cloud Build's own
`cloud-run-source-deploy` repository, which would have left the project with two
registries populated by whichever command happened to run. Two steps also let us
choose the tag and capture the digest, which the Day 27 recovery rehearsal needs.
`server/Dockerfile` already exists, so no buildpack detection is lost. Tagging
and rollback references are corrected in §9.5.

**Verification step.** A `gcloud run services describe` check was added after
the deploy so the identity is confirmed from the live revision rather than
assumed from the flag. If it prints a `-compute@developer.gserviceaccount.com`
address, the deploy fell back to the default identity and must be redone.

The review also supplied the project ID. `.firebaserc` now reads
`askanu-dev-gdg` instead of a placeholder, taken from the runtime service
account. **This still needs confirming as the Firebase project ID**; the Cloud
Run service ID remains a placeholder.

### 9.2 Oversized chunked request handling — REQUIRED, FIXED

Confirmed as a real defect, not a theoretical one.

`readBody()` called `reject(new PayloadTooLargeError())` and then `req.destroy()`.
With a declared `Content-Length` the early check fires first and the socket is
never destroyed, which is why the original test passed. With
`Transfer-Encoding: chunked` there is no length to check, so the streaming cap
was reached and `req.destroy()` tore the socket down underneath the response
that was about to be written.

**Falsification first.** A regression test was written, then the old
`req.destroy()` was temporarily restored to prove the test detects the defect:

```
✖ rejects an oversized chunked body with the same 413 envelope (12.6686ms)
  Error: socket hang up
      at Socket.socketOnEnd (node:_http_client:599:25)
    code: 'ECONNRESET'
```

The client got a dropped connection instead of the envelope — exactly as
reported. `req.destroy()` was then removed again and the test passes.

The fix stops *processing* without destroying the connection. Once the cap is
passed the promise rejects immediately so the 413 is written at once, the
buffered chunks are dropped, and further chunks are read and discarded rather
than accumulated — so memory stays bounded without stalling the socket. The 413
carries `Connection: close`, because a connection whose body was deliberately
left unread must not be reused for a keep-alive request.

The regression test uses `node:http` directly rather than `fetch`, because
`fetch` sets a `Content-Length` for a buffer body and would silently exercise the
wrong path. It asserts, in order:

| Assertion | Result |
|---|---|
| no `Content-Length` on the outgoing request | PASS |
| chunked transfer (96 KiB written in 1 KiB chunks, cap is 64 KiB) | PASS |
| HTTP 413 | PASS |
| body parses and has exactly the six contract fields | PASS |
| `status: "error"`, `items: []`, `sources: []`, `clarification: null`, `request_id` matching `^req_` | PASS |
| upstream request count unchanged — RAG never reached | PASS |

Suite is now 17/17.

### 9.3 Request-ID correlation — Day 7 carry-over, code left extensible

Not implemented, per the review. The App generates its own `req_...` for logs
while the response carries RAG's `request_id`, and because the envelope is passed
through untouched a student can quote an id that appears nowhere in App logs.

Correlation cannot be solved by rewriting the response without giving up the
pass-through property, so it has to be done in the logs or in a request header.
Both options are written up in `docs/DEPLOYMENT.md` with a recommendation
(propagate a correlation header; it costs one header and keeps the boundary from
parsing payloads it never otherwise reads).

What changed in the code today is only the extension point: the outbound headers
are now a named `upstreamHeaders` object immediately above the single `fetch`,
with a comment naming both Day 7 additions — the correlation header and the
`Authorization` identity token. Nothing else has to move for either.

### 9.4 Logging claim vs behaviour — P2, FIXED

The claim was "status and request ID only", but the startup line also logs
`port`, `environment` and the full upstream RAG URL.

None of it is secret and the startup line is genuinely useful — it is how an
operator tells which revision points at which backend — so the line was kept and
the claim was corrected instead. `README.md`, `docs/DEPLOYMENT.md` and the
docstring on `log()` in `server/src/server.js` now all distinguish per-request
lines (routing metadata only) from the single startup line (port, `ASKANU_ENV`,
upstream URL). §3.2 above shows the actual output.

---

## 10. Second review pass (Qasim) — deployment-doc corrections

Documentation only. No App code changed; the suites are unchanged at 17/17 and
113/113.

### 10.1 `/health` must not be smoke-tested through Firebase — FIXED

The Day 7 smoke step said *"`/health` through the rewrite"*. That was wrong, and
wrong in the worst direction: it would have passed.

`firebase.json` rewrites **only** `/api/**` to Cloud Run. `/health` matches the
`**` SPA fallback, so `https://<hosting-url>/health` returns `index.html` with
**HTTP 200**. A smoke test asserting a 200 would have reported a healthy backend
while never once touching the App service — the exact failure mode a smoke test
exists to prevent.

The same shape is already visible in this repo's own evidence: §4.1 records
`/nope/deep` returning 200 with 945 bytes, because every unmatched path serves
the SPA. `/health` is just another unmatched path.

Corrected to three checks against the origin that actually serves each one:

| Check | Where | Expect |
|---|---|---|
| `GET /health` | App Cloud Run URL, directly | `{"status":"ok"}` |
| `POST /api/v1/ask` | Firebase Hosting URL | grounded answer + official ANU source link |
| hard refresh `/courses` | Firebase Hosting URL | Courses page, not a 404 |

A note was also added next to the routing diagram, since the trap is a property
of the routing model rather than of the smoke test: only `/api/**` reaches the
App service, and `/health` is reachable on the Cloud Run URL alone.

### 10.2 `app-service:day7` is not an immutable tag — FIXED

The registry section claimed two steps "give an immutable tag to roll back to".
That is not true of Artifact Registry: Docker tags are **mutable by default**.
Nothing prevents a later push from moving a tag to different bytes, at which
point a recorded rollback target silently stops meaning what it meant when it
was written down — which would surface during the Day 27 recovery rehearsal, at
the worst possible moment.

Two changes:

**Tag with the Git commit SHA**, not a day label:

```bash
gcloud builds submit server --tag .../app-service:$(git rev-parse --short HEAD)
```

`day7` says when someone ran a command. A commit SHA ties a running revision to
exact source.

**Record the digest as the rollback reference.** The digest is a content hash and
cannot be repointed:

```
.../app-service@sha256:<digest>
```

A new step 5 captures it after deploy and writes it into the deployment record,
and the docs now say to roll back by digest rather than by tag. The wording
"immutable tag" is gone from both `docs/DEPLOYMENT.md` and §9.1 above.
