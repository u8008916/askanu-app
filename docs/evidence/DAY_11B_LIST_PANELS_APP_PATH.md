# V6 Tue 15 Sep evidence — Current Jobs / Upcoming Events on the real App → RAG path

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day11-first_three_domain_breadth_regression` (continues from `51457a4`)
**Date:** Tuesday 15 September 2026 — V6 Day 11, follow-on to the breadth audit
**Deliverable:** Close the gap flagged in `DAY_11_BREADTH_AUDIT.md` §5.1 — the two list panels were permanent placeholders. They now render real data through `Browser → App service → RAG`, with loading / list / empty / unavailable states and no invented rows.

Numbers below are real command output, real DOM measurements through the Browser pane's CDP `resize_window`, and real HTTP traffic through a locally run App service. No CI run is attached to this branch.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.7.

---

## 0. Summary

| | |
|---|---|
| App service | `server/src/server.js`: `GET /api/v1/jobs/current` and `GET /api/v1/events/upcoming` forwarded to RAG through the same token / timeout / 401-403 / byte-for-byte pass-through as `/ask` (extracted into one `proxyUpstream`). Only a numeric `limit` is relayed; every other query parameter is dropped. Non-GET → 405. |
| Frontend — new | `resources/listApi.ts` (clients), `resources/listResponse.ts` (runtime validation), `resources/feedTransport.ts` (real/mock seam), `resources/FeedsProvider.tsx` (one fetch per feed per page load, shared), `dev/mockFeeds.ts`, `mocks/feedResponses.ts` |
| Frontend — changed | `resources/FeedPanel.tsx` (real states, no placeholder rows), `CurrentJobsCard.tsx`, `UpcomingEventsCard.tsx`, `Panel.module.css`, `App.tsx` (+`FeedsProvider`), `types/api.ts` (`JobItem` = reviewed RAG shape), `chat/askApi.ts` (+`apiEndpoint(path)`) |
| Tests | server +8 (`tests/lists.test.js`), frontend +28 (`tests/listApi.test.ts`, `tests/feedPanels.test.tsx`); 4 existing tests re-scoped (see §4) |
| Docs | `docs/API_CONTRACT.md` jobs section synced to the RAG-reviewed shape; `docs/DECISION_LOG.md` entry |
| Runtime dependencies added | **0** (server still `node:http` + global `fetch`; frontend adds no package) |
| Browser secrets | none — the browser still calls a relative `/api/v1/...` with `credentials: 'omit'`; the identity token is added only inside the App service |

---

## 1. Contract fidelity

The RAG service (`askanu-rag` `main` at `1314dc0`) serves `GET /api/v1/jobs/current` with the item shape reviewed in its Day 10 PR #22: `employment_types[]`, `job_id`, `classification`, `salary`, `closing_text`, `closing_date`, `closing_at`, `status: "current"`, limit 1–20. This repo's `API_CONTRACT.md` still carried the Day 1 sketch (`employment_type`, `closing_at` only). The App now consumes the reviewed shape and the doc is synced — recorded in `DECISION_LOG.md` as a sync, not a new decision.

`GET /api/v1/events/upcoming` is **not** served by RAG yet (Events is the Saturday build day). The App service forwards it anyway and passes RAG's 404 through; the browser renders "Upcoming events are unavailable right now." The panel will show real records the moment the endpoint ships, with no App change.

What the App does **not** do: derive a closing date from `closing_date`/`closing_at`, decide open/closed (that is the server's `status`), reorder items, cap the list, or fill a missing field. `closing_text` is displayed as stored.

---

## 2. Real path — browser → Vite proxy → App service → stub RAG

Local run: a contract-shaped stub RAG on `127.0.0.1:8081` (serves jobs, 404s events), the real App service on `:8090` (`RAG_AUTH_DISABLED=true`, port 8080 was held by an unrelated system process), Vite proxy → `:8090`, mock transport **off**.

Browser network log, one page load (the aborted/retried pairs are React StrictMode's dev-only double mount; one request per feed completes):

```
GET http://localhost:5173/api/v1/jobs/current?limit=5    → 200 OK
GET http://localhost:5173/api/v1/events/upcoming?limit=5 → 404 Not Found
```

Rendered (DOM read): Current Jobs = `["Stub role via App boundary · Full time · Stub location · Closes 1 January 2099", "Second stub role"]` (second item has no type/location/closing → title only); Upcoming Events = "unavailable"; dev fixture picker absent (real transport).

App service log — routing metadata only, no body, `request_id` correlates with RAG's `X-Request-Id`:

```
{"event":"jobs_current","request_id":"req_b37e…","status":200,"upstream_status":200,"token_source":"none","duration_ms":7}
{"event":"events_upcoming","request_id":"req_6f92…","status":404,"upstream_status":404,"token_source":"none","duration_ms":7}
```

Stub RAG received: `GET /api/v1/jobs/current?limit=5 … rid=req_b37e…` — the same id.

Direct boundary smoke: `GET :8090/health` → `{"status":"ok"}`; `GET :8090/api/v1/jobs/current?limit=5` → the stub's JSON byte for byte; `GET :8090/api/v1/events/upcoming` → 404.

---

## 3. Panel states — dev mock, desktop 1280×720 and mobile 360×740

| State | Jobs | Events |
|---|---|---|
| loading | "Loading…" (`aria-live="polite"`) | same |
| ready, items | 5 rows, server order, each row one `<a target="_blank" rel="noopener noreferrer">` to the stored URL; meta line = `employment_types` joined · `location` · `closing_text`, each only when present | 2 rows; `start_at` rendered in `Australia/Canberra` ("Mon, 2 Mar, 10:00 am"), venue only when present |
| ready, empty | "No current ANU jobs are listed right now." | "No upcoming ANU events are listed right now." |
| unavailable | "Current jobs are unavailable right now." | "Upcoming events are unavailable right now." (default for events today) |
| `View all` | `<Link to="/jobs">` — the Jobs launcher | none: no Events page exists until Saturday; a route to nowhere would be a broken promise |

Placeholder rows ("Placeholder slot n / Awaiting data") appear in **no** state — asserted in `feedPanels.test.tsx`.

**360×740 DOM measurements** (jobs `ok`, events `ok`):

```
documentElement.scrollWidth 360 == clientWidth 360   → no horizontal scroll
panel anchors                 8   (5 jobs + 2 events + View all)
widest panel anchor right   327 px
min outbound row height    50.1 px  (≥ 44 px touch target)
any element in <main> past 360 px: false
mobile drawer: Current Jobs 5 links, Upcoming Events 2 links, drawer right edge 360
```

Feeds are fetched once at `App` level and shared: the rail, the mobile drawer and the mobile home each read the same context, so opening the drawer issues no new request.

---

## 4. Automated tests and build

```
server   npm test        →  46 passed, 0 failed   (was 38 listed; see note)
frontend npm run test    →  16 files, 195 passed  (was 167)
frontend npm run build   →  tsc --noEmit OK · vite build ✓ 103 modules
         dist/assets/index-*.js  270.95 kB │ gzip 86.61 kB
```

Production bundle scan (`grep -c` on `dist/assets/index-*.js`): `Placeholder` 0 · `example.invalid` 0 · `Mock` 0 · `sessionStorage` 0 · `api/v1/jobs/current` 1 · `api/v1/events/upcoming` 1. The `example.invalid` count had been 1 after the Day 11 fixture commit — a top-level `Array.from` call kept `askResponses.ts` alive in the bundle; annotated `/* @__PURE__ */`, now 0.

**Server note.** `tests/ask.test.js` defined a stub token provider but never injected it into its shared server, so 5 of its tests hit the real GCP metadata URL and failed with `token_unavailable` — on `HEAD` before any change today (verified with `git stash`). Injecting the stub (one line) makes the existing 38 green; the 8 new list-route tests bring it to 46.

**Frontend re-scoping.** Four existing tests enumerated every anchor on the page or every "Placeholder role"/date-looking text; the panels now legitimately contain stored-record links and server closing wording. `safeRendering` now recognises the two panels as sanctioned homes for outbound links (same https-only rule); the three launcher "no invented data" tests and the jobs abstention test are scoped to the column the page owns (`tests/helpers.ts`). Those three launcher tests were latently flaky — they only passed because the feed had not resolved yet.

---

## 5. Remaining gaps — reported, not worked around

1. **`/api/v1/events/upcoming` is not implemented in RAG.** Expected; Saturday. The App side is complete and tested against the contract shape.
2. **Quick Links still say "Official links pending approved URLs".** Unchanged; needs Qasim's approved canonical URLs (V3 §Product/UI lists AnuHub, MyTimetable, Canvas, ANU Careers by name only).
3. **No Events resource page**, so no `View all` on that panel. Saturday.
4. **`API_CONTRACT.md` events section** still uses the Day 1 sketch (`venue`, `organiser`, `end_at`). It will be synced when Carmen's Events contract lands, the same way jobs was today.

No hard-coded answers, roles, events, dates or URLs were added to production code. Temporal/status logic stays in RAG.
