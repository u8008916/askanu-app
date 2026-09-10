# DEPLOYMENT.md — askanu-app

How the App repo reaches GCP. Written on Day 6 (EARLY GCP FOUNDATION); the real
deployment happens on Day 7.

**Nothing in this repo has been deployed yet.** The IDs below are placeholders.

## The routing model

One rule decides everything else: **the browser only ever talks to its own
origin.**

```
                    Firebase Hosting  (askanu-web.web.app)
                             |
        +--------------------+--------------------+
        |                                         |
   /api/**  -->  rewrite                     everything else
        |                                         |
        v                                         v
  App service (Cloud Run)                   frontend/dist
        |                                   index.html + assets
        v
  RAG service (Cloud Run)
        |
        v
  Cloud SQL / pgvector  ->  Gemini
```

Because `/api/**` is a **rewrite** and not a redirect, the browser's request URL
stays `https://askanu-web.web.app/api/v1/ask`. Same origin, so:

- no CORS, no preflight, nothing to configure on the App service;
- `VITE_API_BASE_URL` stays **empty** in production, and `askEndpoint()` in
  `frontend/src/chat/askApi.ts` keeps returning the relative `/api/v1/ask` it
  already returns locally;
- the Cloud Run URL never appears in the frontend bundle.

This is the same trick the local dev proxy already uses (`README.md`), so local
and production behave identically.

### Why the App service exists at all

`V3_LOCKED_DECISIONS.md` fixes the architecture as
`Browser/React -> App service -> REST -> RAG service`. The App service is the
only thing that knows where RAG lives. Nothing else changes shape as it passes
through: `server/src/server.js` returns RAG's status and bytes untouched, so
answers and source URLs stay exactly as RAG produced them.

It holds **no** database credential, model key or prompt. There is nothing here
for Secret Manager to inject yet.

### Caching

Two rules in `firebase.json`, and the order is the whole point:

1. `**` → `Cache-Control: no-cache`
2. `/assets/**` → `public, max-age=31536000, immutable`

The broad rule comes first and the narrow one overrides it. Vite gives every
asset a content hash in its filename (`index-DR34YFt2.css`), so those files can
be cached forever — a new build produces a new name. Everything else is HTML
served through the SPA rewrite and must not be cached, or a deploy would leave
students on the previous build.

A rule matching only `/index.html` would **not** work: through the fallback
rewrite the HTML is served at `/courses`, `/scholarships` and every other route,
and Hosting matches the request path, not the file it resolves to.

**Unverified locally.** The Hosting emulator serves the files and applies the
rewrites, but it does not apply the `headers` block — a request for a hashed
asset came back from the emulator with no `Cache-Control` at all. These two
rules must be checked with `curl -I` against the deployed URL on Day 7.

## What Qasim must supply

Four values. Each has exactly one home.

| Value | Goes in | Placeholder today |
|---|---|---|
| Firebase project ID | `.firebaserc` → `projects.default` | `replace-me-askanu-project` |
| App Cloud Run service ID | `firebase.json` → `rewrites[0].run.serviceId` | `replace-me-app-service` |
| Region | `firebase.json` → `rewrites[0].run.region` | `australia-southeast1` (Day 6 assumption) |
| Deployed RAG URL | App service env var `RAG_SERVICE_URL` | local `http://localhost:8081` only |

`firebase deploy` **cannot run** until the first two are real — Hosting resolves
the Cloud Run service at deploy time and fails on an unknown service ID. That
failure is deliberate: better a refused deploy than a live site whose `/api/**`
silently falls through to `index.html`.

## Running the whole chain locally

Three terminals. This is the same shape as production, one machine smaller.

```bash
cd ../askanu-rag && .venv/Scripts/python -m uvicorn askanu_rag.main:app --app-dir src --host 127.0.0.1 --port 8081
```

```bash
cd server && RAG_SERVICE_URL=http://localhost:8081 npm start
```

```bash
cd frontend && npm run dev
```

With `VITE_DEV_PROXY_TARGET=http://localhost:8080` in `.env`, the browser now
goes React → App service → RAG, exactly as it will in GCP.

Health check:

```bash
curl http://localhost:8080/health
```

`{"status":"ok"}` and nothing else. `API_CONTRACT.md` forbids `/health` from
exposing secrets, prompts, credentials or stack traces, so it deliberately does
not report a version, echo config, or probe RAG.

## Day 7 deploy sequence

1. Fill in the four values above.
2. Build and deploy the App service:

```bash
gcloud run deploy <app-service-id> --source server --region australia-southeast1 --set-env-vars RAG_SERVICE_URL=<deployed-rag-url>
```

3. Build the frontend:

```bash
cd frontend && npm run build
```

4. Deploy Hosting:

```bash
firebase deploy --only hosting --project <firebase-project-id>
```

5. Smoke test the deployed URL: `/health` through the rewrite, one real course
   question, and a hard refresh on `/courses` to prove the SPA fallback.

## Open blockers (Day 6)

1. **Deployment target unknown** — no Firebase project ID and no Cloud Run
   service ID. Config ships with placeholders; deploy is blocked. This is the
   documented Day 6 fallback: complete the config and docs, open the blocker.
2. **`gcloud` is not installed on the App developer machine** — the container
   cannot be built or pushed from here.
3. **Deployed RAG URL unknown** — only the local value is real.
4. **App → RAG authentication not configured** — Day 7 / Qasim. The App service
   currently calls RAG unauthenticated, which is fine for a health-level local
   chain. Adding an identity token is one header on the single `fetch` in
   `server/src/server.js`.

## Deliberately not done yet

- **Security headers (CSP, HSTS, X-Frame-Options)** on Hosting — Day 26's
  security and dependency scan. `firebase.json` currently sets caching headers
  only.
- **Rate limiting** — `SECURITY_BASELINE.md` puts the starting limit at ~20
  `/ask` requests per 10 minutes per session. It belongs at this boundary, but
  it is not Day 6 scope and is not implemented.
- **A CI deploy workflow** — Qasim owns CI/deploy notes.
