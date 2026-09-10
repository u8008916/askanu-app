# AskANU App

React student-facing UI + thin application/integration layer.

**Primary owner:** Ben
**Integration/release:** Qasim
**AI:** Claude Code

Start with:
1. `AGENTS.md`
2. `docs/MY_DAY_BY_DAY_TASKS.md`
3. `docs/V3_LOCKED_DECISIONS.md`
4. `docs/AI_SETUP.md`

The repo is synchronised to AskANU Project Execution Plan V3.

## Run the frontend

Requires Node 20+ (developed on Node 24).

```bash
cd frontend && npm install && npm run dev
```

Other scripts, all run from `frontend/`:

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | Type-check (`tsc --noEmit`) then production build to `frontend/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Vitest + React Testing Library, single run |

## Configuration

Copy `.env.example` to `.env` at the repository root — the Vite config reads env
files from there, so there is one `.env` per repo rather than a second copy
inside `frontend/`. Only `VITE_`-prefixed values reach browser code.

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | The App integration boundary the browser posts to. Leave **empty** for same-origin `/api/v1/ask`, in local development *and* in production. |
| `VITE_DEV_PROXY_TARGET` | Dev only. Where the dev server forwards `/api`. Used only when `VITE_API_BASE_URL` is empty. Defaults to `http://localhost:8080`. |
| `VITE_USE_MOCK_TRANSPORT` | Dev only. `1` selects the mock transport. |
| `RAG_SERVICE_URL` | App service only. Where `server/` forwards `/api/v1/ask`. Never `VITE_`-prefixed, so it cannot reach browser code. |
| `PORT` | App service only. Defaults to `8080`; Cloud Run supplies it at runtime. |

### Running against the local RAG service

Clone `askanu-rag` as a sibling of this repo and start it:

```bash
python -m venv .venv && .venv/Scripts/python -m pip install -e ".[test]"
```

```bash
.venv/Scripts/python -m uvicorn askanu_rag.main:app --app-dir src --host 127.0.0.1 --port 8081
```

Then use **proxy mode** in this repo's `.env`:

```bash
VITE_API_BASE_URL=
VITE_DEV_PROXY_TARGET=http://localhost:8081
```

Proxy mode is the local default **because the RAG service sends no CORS
headers**. Pointing `VITE_API_BASE_URL` straight at it makes the browser fail
the preflight (`OPTIONS` → 405) and block the request. Going through the dev
server keeps the request same-origin, so CORS never applies and neither repo
needs to change.

Direct mode still works against any boundary that does send CORS headers for
`http://localhost:5173`:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

The proxy is dev-server configuration only. It has no effect on a build, and
`server/` stays empty until the App service is built.

### Running with no backend

```bash
VITE_USE_MOCK_TRANSPORT=1
```

Adds a picker to the composer for stepping through every response state in
`docs/API_CONTRACT.md`. The mock and its fixtures are dropped from a production
build.

## Run the App service

`server/` is the thin App integration boundary from `V3_LOCKED_DECISIONS.md`:

```
Browser/React -> App service -> REST -> RAG service -> Cloud SQL/pgvector -> Gemini
```

It does two things and nothing else — `GET /health`, and `POST /api/v1/ask`
forwarded to `RAG_SERVICE_URL` and returned untouched. No runtime dependencies,
so there is nothing to install:

```bash
cd server && RAG_SERVICE_URL=http://localhost:8081 npm start
```

| Script | Purpose |
|---|---|
| `npm start` | Serve on `PORT` (default 8080) |
| `npm test` | `node --test`, no test framework to install |

To exercise the full chain the way GCP will, point the dev proxy at the App
service instead of straight at RAG:

```bash
VITE_DEV_PROXY_TARGET=http://localhost:8080
```

The service holds no database credential, model key or prompt. It refuses to
start without `RAG_SERVICE_URL`, so a misconfigured deployment fails loudly
rather than answering every question with a 502.

Per-request log lines carry routing metadata only — status, `request_id`,
duration — never the question, the history or the answer. One startup line also
records the port, `ASKANU_ENV` and the upstream RAG URL; none of that is secret,
and it is how an operator tells which revision points at which backend.

## Deploying

`firebase.json` serves `frontend/dist` and rewrites `/api/**` to the App Cloud
Run service, which keeps the deployed browser same-origin — so
`VITE_API_BASE_URL` stays empty in production and CORS never applies. A second
rewrite sends every other path to `index.html`, which is what makes a hard
refresh on `/courses` work.

The project and service IDs are **placeholders**; `firebase deploy` cannot run
until they are filled in. See `docs/DEPLOYMENT.md` for the values needed, the
deploy sequence and the open blockers.

## API integration

The browser posts to `POST /api/v1/ask` per `docs/API_CONTRACT.md`. Responses
are schema-validated before rendering; 400 / 413 / 429 / 5xx carry the same
controlled `error` envelope and render as an answer turn. Failures log the HTTP
status and `request_id` only — never the question or the history.
