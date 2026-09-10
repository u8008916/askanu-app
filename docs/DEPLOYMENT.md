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

**Only `/api/**` reaches the App service.** Every other path — including
`/health` — matches the SPA fallback and is served `index.html`. So
`https://<hosting-url>/health` returns HTTP 200 with a page of HTML, not the
liveness envelope. `/health` is reachable on the Cloud Run URL only; see the
smoke-test note in the deploy sequence.

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

## Runtime identity

The App service runs as a dedicated, least-privilege service account:

```
askanu-app-runtime@askanu-dev-gdg.iam.gserviceaccount.com
```

**Every deploy must pass `--service-account` explicitly.** Cloud Run does not
default to this account — it defaults to the project's Compute Engine default
service account, which currently holds **Editor** on the project. Omitting the
flag would silently run the public-facing App on an identity with broad write
access to everything, which undoes the least-privilege setup rather than using
it. There is no warning when this happens; the deploy just succeeds.

The App service needs no project permissions of its own. It reads one
environment variable and makes one outbound HTTP call. If it ever appears to
need a role, that is a signal the boundary has grown a responsibility it should
not have.

### Public access — deliberate

The App service is deployed `--allow-unauthenticated`.

Firebase Hosting calls a rewrite target as an anonymous caller; it does not
attach an identity token. A `--no-allow-unauthenticated` App service would make
every `/api/**` request fail with 403, so public access is a requirement of the
rewrite, not an oversight.

What that costs, stated plainly: the Cloud Run URL is reachable directly, not
only through Hosting. That is acceptable because this service holds no
credential, no database access and no model key, and answers only
`POST /api/v1/ask` and `GET /health`. It is also why the rate limit in
`SECURITY_BASELINE.md` (~20 `/ask` per 10 minutes) belongs at this boundary —
tracked, not yet implemented.

**RAG stays private.** It is not public, and App → RAG service-to-service
authentication is Day 7.

## Container registry — deliberate

Images go to the Artifact Registry repository created on Day 6:

```
australia-southeast1-docker.pkg.dev/askanu-dev-gdg/askanu-containers
```

The deploy is therefore two explicit steps — build and push, then deploy that
image — rather than one `gcloud run deploy --source server`.

`--source` is not wrong, but it makes Cloud Build push to its own
`cloud-run-source-deploy` repository, so the project would quietly end up with
two registries and images in whichever one a given deploy happened to use. Two
steps also let us choose the tag and capture the digest, which is what the Day 27
recovery rehearsal needs. `server/Dockerfile` already exists, so nothing is lost
by not using source-based buildpack detection.

### Tags are not immutable — record the digest

Tag the image with the **Git commit SHA** it was built from:

```
australia-southeast1-docker.pkg.dev/askanu-dev-gdg/askanu-containers/app-service:<git-commit-sha>
```

A commit SHA ties a running revision back to exact source, which a label like
`day7` does not.

But a tag is still only a label. Artifact Registry Docker tags are **mutable by
default** — nothing stops a later push from moving `app-service:abc1234` to
different bytes, and then "roll back to that tag" no longer means what it meant
when it was written down.

The only stable reference is the **image digest**:

```
australia-southeast1-docker.pkg.dev/askanu-dev-gdg/askanu-containers/app-service@sha256:<digest>
```

A digest is the content hash, so it cannot be repointed. **Record the digest of
every deployed image in the deployment record, and roll back by digest, not by
tag.**

## What Qasim must supply

| Value | Goes in | Status |
|---|---|---|
| GCP / Firebase project ID | `.firebaserc` → `projects.default` | **`askanu-dev-gdg`** — taken from the runtime service account; confirm it is also the Firebase project ID |
| App Cloud Run service ID | `firebase.json` → `rewrites[0].run.serviceId` | still `replace-me-app-service` |
| Region | `firebase.json` → `rewrites[0].run.region` | `australia-southeast1` |
| Deployed RAG URL | App service env var `RAG_SERVICE_URL` | unknown; local `http://localhost:8081` only |

`firebase deploy` **cannot run** until the service ID is real — Hosting resolves
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

1. Fill in the App Cloud Run service ID and the deployed RAG URL.

2. Build and push the image, tagged with the commit being deployed:

```bash
gcloud builds submit server --tag australia-southeast1-docker.pkg.dev/askanu-dev-gdg/askanu-containers/app-service:$(git rev-parse --short HEAD)
```

3. Deploy that exact image, with the runtime identity named explicitly:

```bash
gcloud run deploy <app-service-id> --image australia-southeast1-docker.pkg.dev/askanu-dev-gdg/askanu-containers/app-service:$(git rev-parse --short HEAD) --region australia-southeast1 --service-account askanu-app-runtime@askanu-dev-gdg.iam.gserviceaccount.com --allow-unauthenticated --set-env-vars RAG_SERVICE_URL=<deployed-rag-url>,ASKANU_ENV=dev
```

Every flag on that line is load-bearing:

| Flag | Why |
|---|---|
| `--image` | the tag built in step 2, so the registry is `askanu-containers` and the running revision traces back to a commit |
| `--service-account` | without it Cloud Run uses the Compute Engine default, which holds **Editor** |
| `--allow-unauthenticated` | Firebase Hosting calls the rewrite target anonymously |
| `--set-env-vars` | the App reads no other configuration; it refuses to start without `RAG_SERVICE_URL` |

4. Confirm the revision actually got the identity — do not assume the flag took:

```bash
gcloud run services describe <app-service-id> --region australia-southeast1 --format="value(spec.template.spec.serviceAccountName)"
```

It must print `askanu-app-runtime@askanu-dev-gdg.iam.gserviceaccount.com`. If it
prints a `-compute@developer.gserviceaccount.com` address, the deploy fell back
to the default identity and must be redone.

5. Capture the digest of what actually got deployed, and write it into the
   deployment record. This is the rollback reference:

```bash
gcloud run services describe <app-service-id> --region australia-southeast1 --format="value(spec.template.spec.containers[0].image)"
```

Resolve it to a digest if it came back as a tag:

```bash
gcloud artifacts docker images describe australia-southeast1-docker.pkg.dev/askanu-dev-gdg/askanu-containers/app-service:<git-commit-sha> --format="value(image_summary.digest)"
```

6. Build the frontend:

```bash
cd frontend && npm run build
```

7. Deploy Hosting:

```bash
firebase deploy --only hosting --project askanu-dev-gdg
```

8. Smoke test. **Two different origins**, because Hosting only rewrites
   `/api/**` — everything else falls through to the SPA:

| Check | Where | Expect |
|---|---|---|
| `GET /health` | **App Cloud Run URL directly** | `{"status":"ok"}` |
| `POST /api/v1/ask` | **Firebase Hosting URL** | a real grounded answer with an official ANU source link |
| hard refresh `/courses` | Firebase Hosting URL | the Courses page, not a 404 |
| `curl -I` a hashed asset, and `/` | Firebase Hosting URL | `immutable` and `no-cache` respectively — the headers the emulator could not verify |

**Do not smoke-test `/health` through Hosting.** `firebase.json` rewrites only
`/api/**` to Cloud Run, so `https://<hosting-url>/health` matches the `**`
fallback and returns `index.html` with **HTTP 200**. A smoke test that only
checks the status code would report a healthy backend while never touching the
App service at all. `/health` is for Cloud Run's own probes and for a direct
operator check; the only path the browser ever uses is `/api/**`.

## Logging

Per-request lines carry routing metadata only — event, `request_id`, status,
upstream status, reason, duration. The question, the history and the answer are
never written to a log.

One startup line is broader:

```json
{"event":"listening","port":8099,"environment":"unknown","upstream":"http://localhost:8081"}
```

Port, `ASKANU_ENV` and the upstream RAG URL. None of it is secret, and it is how
an operator tells which revision points at which backend — but it is more than
"status and request id", so it is written down here rather than glossed over.

## Day 7 carry-over: request-ID correlation

Today the App generates its own `req_...` id for its logs, while a successful
response carries **RAG's** `request_id`. Because the envelope is passed through
untouched, a student can quote an id that appears nowhere in the App's logs.

That has to be closed for the Day 7 gate, which requires tracing one request
across the whole chain. Two options, and they are not exclusive:

1. **Propagate** — App sends its `request_id` to RAG as a correlation header and
   RAG logs it. Needs a small agreement with Carmen on the header name.
2. **Log both** — App reads RAG's `request_id` from the response for its own log
   line while still forwarding the bytes unchanged. No cross-repo change, but it
   means parsing every response at the boundary.

Option 1 is preferable: it costs one header, and it keeps the boundary from
parsing payloads it otherwise never needs to look at.

The code is ready for either. `server/src/server.js` builds `upstreamHeaders` as
a named object immediately above the single outbound `fetch`, which is also
where the Day 7 `Authorization` header goes.

## Open blockers (Day 6)

1. **App Cloud Run service ID unknown** — `firebase.json` still holds
   `replace-me-app-service`, so `firebase deploy` is blocked. The project ID is
   now known (`askanu-dev-gdg`, from the runtime service account) and is set in
   `.firebaserc`; **confirm it is also the Firebase project ID.**
2. **`gcloud` is not installed on the App developer machine** — the container
   cannot be built or pushed from here.
3. **Deployed RAG URL unknown** — only the local value is real.
4. **App → RAG authentication not configured** — Day 7 / Qasim. The App service
   currently calls RAG unauthenticated, which is fine for a health-level local
   chain. Adding an identity token is one header in `upstreamHeaders`.
5. **Hosting cache headers unverified** — the emulator does not apply the
   `headers` block; check with `curl -I` on the deployed URL.

## Deliberately not done yet

- **Security headers (CSP, HSTS, X-Frame-Options)** on Hosting — Day 26's
  security and dependency scan. `firebase.json` currently sets caching headers
  only.
- **Rate limiting** — `SECURITY_BASELINE.md` puts the starting limit at ~20
  `/ask` requests per 10 minutes per session. It belongs at this boundary, but
  it is not Day 6 scope and is not implemented.
- **A CI deploy workflow** — Qasim owns CI/deploy notes.
