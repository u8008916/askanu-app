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

`firebase.json` (new) and `.firebaserc` (new), both with marked placeholders.
Verified against the real Hosting emulator in §4.

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
ℹ tests 16
ℹ suites 6
ℹ pass 16
ℹ fail 0
```

Covering: `/health` returns exactly one key; a non-GET on `/health` is a 405
envelope; unknown routes give a contract-shaped 404; upstream answers pass
through byte-identical; an upstream 503 keeps its own status rather than being
rewritten to 502; clarification option order survives; oversized bodies 413
without reaching upstream; an unreachable upstream gives a 502 with no
`ECONNREFUSED`, stack frame or internal address in the body; `OPTIONS` gets 405
with no `Access-Control-Allow-Origin`; and logs carry status and `request_id`
but never the question, the history or the answer.

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
| App service suite green | PASS — 16/16 |
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
| 1 | Firebase project ID and Cloud Run App service ID unknown | Qasim | `firebase deploy` cannot run; `firebase.json` / `.firebaserc` hold placeholders |
| 2 | `gcloud` not installed on this machine | Ben / Qasim | App image cannot be built or pushed from here |
| 3 | Deployed RAG URL unknown | Carmen / Qasim | `RAG_SERVICE_URL` is local-only |
| 4 | App → RAG service-to-service auth not configured | Qasim | Day 7; one header on the single `fetch` in `server/src/server.js` |
| 5 | Hosting cache headers unverified | Ben | Check with `curl -I` on the deployed URL, Day 7 |

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
