# V5 Mon 14 Sep evidence — Jobs guided page + all-domain component maturity

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/jobs_launcher+all-domain-component-maturity` (from `4de92ba`)
**Date:** Monday 14 September 2026 — V5 Day 3 (calendar Day 10)
**Deliverable:** Jobs resource page on the shared `DomainLauncher`; chat handles list-oriented / closing-date / source-heavy job answers; three-domain regression

Numbers below are real command output or real DOM measurements taken
locally through the Browser pane's CDP `resize_window` (the same mechanism
Day 8/9 used); there is no CI run attached to this branch.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.7.

---

## 0. Summary

Same shape as Day 9: the `DomainLauncherConfig` needed no change — Jobs is
"one config + one route". No API contract, schema, shared-persistence or
cloud change is made or required. The App consumes `/api/v1/ask` only; it
does not call `/api/v1/jobs/current` and does not decide whether a role is
open.

| | |
|---|---|
| New | `src/pages/JobsPage.tsx`; `JOBS_DOMAIN` in `domains/domainConfig.ts`; `tests/jobsPage.test.tsx`; `okCurrentJobsResponse` + `partialClosingSoonResponse` fixtures; `ok-jobs-current` + `partial-jobs-closing` mock scenarios |
| Changed | `App.tsx` (+route `/jobs`), `layout/DomainNav.tsx` (Jobs nav item now links instead of `aria-disabled`), `tests/navigation.test.tsx`, `tests/domainLauncher.test.tsx` (three-domain shared-component regression), `tests/sourceCards.test.tsx`, `mocks/askResponses.ts`, `dev/mockTransport.ts` |
| Deleted | none |
| Runtime dependencies added | **0** |

**No backend call was required or made.** Card click only prefills the composer.

---

## 1. Official links — verified, not guessed

All three URLs were opened in a real browser today and returned HTTP 200,
reached from ANU's own navigation:

- `https://www.anu.edu.au/jobs` — "Jobs at ANU" hub (h1 `Jobs at ANU`, 200)
- `https://jobs.anu.edu.au/jobs/search` — the hub's **Search Jobs** link; the
  official ANU Jobs listing (`https://jobs.anu.edu.au/` itself redirects
  here). This is the source the scraper collects from
  (`ALL_TEAM_DAY_BY_DAY_TASKS.md` Day 10, Will: `jobs.anu.edu.au/jobs/search`).
- `https://www.anu.edu.au/jobs/applying-for-a-position-at-anu` — the search
  page's own **Information for applicants** link (h1 `Applying for a
  position at ANU`, 200); the natural escape hatch for the "Job
  requirements" intent.

Individual roles were seen at `https://jobs.anu.edu.au/jobs/<slug>`. Those
are evidence URLs that arrive in `sources[]`; the App never constructs one.
`internaljobs.anu.edu.au` (staff-only) and the casual-jobs register hosted
off-domain were deliberately left out of the compact list.

### 1a. Two kinds of link (same rule as Day 9)

| Kind | Examples | Subject to a record-identity check? |
|---|---|---|
| Navigation / resource | the three links above, static in `domainConfig.ts` | **No** — trusted official escape hatches, no slug, no `record_id` |
| Evidence / source | `https://jobs.anu.edu.au/jobs/<slug>` in `/api/v1/ask` `sources[]` | **Yes** — Scraper/RAG enforce it |

**Open checkpoint:** unlike Scholarships (Day 9), no Jobs identity/status
contract (`source_id`, `entity_id`, `record_id` shape, open/closed rule) is
frozen in this repo yet. The fixture `record_id`s use the Day 9 pattern
(`jobs:job:<slug>`) as a placeholder only; the App never parses them. This
is the "coordinate current/closed status semantics with Carmen" dependency
from the day plan — App work proceeded on `API_CONTRACT.md` alone (server
computes current/open and `closing_at` order; client renders as sent) and
this line is here so the checkpoint is not silently skipped.

---

## 2. Cards — no invented data

None of the four card titles/descriptions state a role, a closing date, a
salary or an open/closed verdict — pinned by `jobsPage.test.tsx › shows no
invented job data` and, for all three domains, by
`domainLauncher.test.tsx › shows no invented data in card copy`.

| Card | Prompt placed in composer |
|---|---|
| Find current ANU jobs | `What ANU jobs are currently open?` |
| Jobs for my background or degree | `Which current ANU jobs suit my background or degree?` |
| Closing soon | `Which ANU jobs are closing soon?` |
| Job requirements | `What are the requirements for this ANU job?` |

---

## 3. Desktop no-scroll gate (1280×720) — all three domains

Measured on the launcher root (`main > div > :first-child`) at a real
1280×720 viewport (`innerWidth/innerHeight` confirmed 1280×720, DPR 2):

```
/courses       clientHeight: 672   scrollHeight: 672   → no scroll
/scholarships  clientHeight: 672   scrollHeight: 672   → no scroll
/jobs          clientHeight: 672   scrollHeight: 672   → no scroll
```

`document.documentElement.scrollWidth` = 1280 on `/jobs` (no horizontal
overflow). Console: no errors on any of the three routes.

Explore nav on `/jobs`: links `Home, Courses, Scholarships, Jobs`;
`aria-current="page"` on `Jobs`; still `aria-disabled`: `Accommodation,
Events, Support Services`.

Saved file: `docs/evidence/day10/jobs-1280x720-dark.png` — a static
headless-Chrome render of `/jobs` at `--window-size=1280,720` (headless
Chrome defaults to dark `prefers-color-scheme` on this machine, as on Day 9).
Per the Day 9 tooling note its real inner size is ~1258×622, so it is a
visual reference only; the 672/672 numbers above are the pixel-exact claim.
Light mode, dark mode with a card's gold focus ring, and every chat capture
in §5 were viewed in-session through the CDP-driven Browser pane, which
returns images to the session but does not save files.

---

## 4. Card → chat hand-off, measured

Real pointer click on **"Find current ANU jobs"** at 1280×720, with
`window.fetch` wrapped to record any `/api/v1/ask` call:

```
path      : /
draft     : "What ANU jobs are currently open?"
focused   : true      (document.activeElement === #chat-input)
Try asking: present   (empty state intact)
network   : no /api/v1/ask request
```

Real click on **"Closing soon"**: `path /`, draft
`Which ANU jobs are closing soon?`, focused `true`.

Real tap on **"Find current ANU jobs"** at 390×844: `path /`, draft
prefilled, focused `true`.

---

## 5. Result UX — the two flows from the day plan

Driven through the dev mock transport (`VITE_USE_MOCK_TRANSPORT=1` in a
gitignored `.env.local`, removed afterwards). Fixtures are placeholder copy
with 2099 dates so nothing can be mistaken for a real ANU role.

### 5a. Current-jobs flow (`ok-jobs-current`)

After sending the prefilled question, DOM read of the assistant turn:

```
roles (one <ol>, server order):
  1. Placeholder role A — closes 1 January 2099 · Placeholder employment type · Placeholder location
  2. Placeholder role B — closes 8 January 2099 · …
  3. Placeholder role C with a deliberately long title … — closes 15 January 2099 · …
  4. Placeholder role D — closes 22 January 2099 · Placeholder employment type
  5. Placeholder role E — no closing date listed · …
sources: 5 links, all domain "jobs", each card 736px wide (no overflow)
  #3 href is a 100+ char single-token URL; title wraps inside the card
chat column width: 824px; document scrollWidth: 1280
```

The conversation region scrolls (364px viewport / 879px content) — that is
the chat's own scroll, by design; the domain page itself is the no-scroll
surface (§3). Nothing is truncated: every closing date and the undated
role's own wording are present in the DOM and on screen.

Viewed in-session (list, then scrolled to the five source cards); not saved
as files — see §3.

### 5b. Closing-date flow (`partial-jobs-closing`)

```
role="alert"            : none
notice heading          : none  (not "Not enough evidence", not "Something went wrong")
items                   : 2  (closes 1 January 2099 / closes 8 January 2099)
service caveat verbatim : "One further open role lists no closing date, so it cannot be placed in this order. …"
sources                 : 2
```

`partial` renders as an answer in the service's own words, with no App-made
banner — consistent with V3 ("no separate presentation rule for partial")
and today's "client displays server facts" rule.

Viewed in-session; not saved as a file — see §3.

### 5c. Mobile (390×844)

Jobs page: 4 cards stacked, each 358px wide, no horizontal overflow
(`scrollWidth` 390), exactly one `h1`. Chat with the five-role list as a
**second turn in the same session** (first turn `ok`, then the jobs list):
all 5 list items and all 5 source cards end at x=349 inside the 390px
viewport; 4 turns in one `Conversation` list (session kept).

Viewed in-session through CDP `resize_window` (the check Day 9 established
as the trustworthy one on this machine); not saved as files — see §3.

### 5d. Insufficient evidence after a jobs card

Covered by `jobsPage.test.tsx › insufficient evidence after a jobs card
stays compact and adds no roles`: the compact notice renders, no `Sources`
region, no role text appears.

---

## 6. Regression / accessibility (8–12h block)

### Keyboard, measured in the browser

Focus log from a fresh `/jobs` load, Tab ×7:

```
Find current ANU jobs → Jobs for my background or degree → Closing soon →
Job requirements → Search ANU Jobs → Jobs at ANU → Applying for a position at ANU
```

Shift+Tab walks back in the same order. A focused card shows the gold
focus ring in dark mode (viewed in-session).

**Tooling note (not an app defect):** the Browser pane's `key` action
dispatches `keydown`/`keyup` only — no native activation text — so pressing
Enter/Space on a focused card through this tooling does not fire `click`
(verified by an event log: `keydown:Enter:BUTTON`, `keyup:Enter:BUTTON`, no
`click`). The cards are native `<button type="button">`, whose Enter/Space
activation is browser behaviour; it is exercised by
`jobsPage.test.tsx › activates by keyboard with Enter and Space` and
`domainLauncher.test.tsx › cards are reachable by Tab in order and activate
with Enter and Space` (user-event follows native button semantics), and by
the equivalent Courses/Scholarships tests unchanged since Day 8/9.

### Shared-component regression (new in `domainLauncher.test.tsx`)

`describe.each` over `COURSES_DOMAIN`, `SCHOLARSHIPS_DOMAIN`, `JOBS_DOMAIN`:

- four cards, four distinct non-empty prompts, four distinct ids;
- Tab reaches every card in config order, then every official link;
- every resource is `https://`, host ends `.anu.edu.au`, safe per
  `isSafeHttpUrl`, `target="_blank"`, `rel` contains `noopener`;
- no `$`/date data in card copy;

plus one long-title / long-label / long-URL case on the throwaway domain.

### Long titles / URLs

- Source card title with a 100+ character single sentence and a 100+
  character single-token URL: card stays 736px (desktop) / ends at 349px
  (mobile); the title wraps (global `li { overflow-wrap: anywhere }`).
- `sourceCards.test.tsx › renders a five-role jobs list in full, long
  title and long URL included` pins that the full title text is present.

---

## 7. Automated tests and build

```
$ cd frontend && npx vitest run
 Test Files  14 passed (14)
      Tests  163 passed (163)

$ npm run build          # tsc --noEmit && vite build
dist/assets/index-BR8WAt9k.js   266.50 kB │ gzip: 85.36 kB
✓ built in 1.34s
```

135 (Day 9) → 163 (+28): 12 new in `jobsPage.test.tsx`; 2 new in
`navigation.test.tsx` (routes to Jobs; opens Jobs from its own URL) and the
"unbuilt domains" test narrowed 4 → 3 with the nav link count 3 → 4; 13 new
in `domainLauncher.test.tsx` (1 long-content case + 4 × 3 domains); 1 new in
`sourceCards.test.tsx`.

---

## 8. Security

- No `dangerouslySetInnerHTML`; card copy renders as text (same
  `DomainLauncher`/`RecommendedQuestionCard` as Courses/Scholarships).
- All official links go through `ExternalLink` → `isSafeHttpUrl`;
  `target="_blank" rel="noopener noreferrer"`; hosts restricted to
  `jobs.anu.edu.au` / `www.anu.edu.au` in `jobsPage.test.tsx`.
- Fixture URLs stay on `example.invalid`; no ANU record URL is guessed.
- No new dependency.

---

## 9. Acceptance criteria (`my_day_by_day_tasks.md`, Mon 14 Sep)

| # | Criterion | Result |
|---|---|---|
| 1 | Jobs page uses shared pattern and no-scroll desktop target | PASS — same `DomainLauncher`, 672/672 at 1280×720 (§3) |
| 2 | Guided cards route correctly and chat renders current-job lists/source cards | PASS — hand-off measured (§4); five-role list + five `jobs` source cards rendered in server order with every closing date intact, desktop and mobile (§5) |
| 3 | Three-domain regression passes | PASS — 163/163 incl. `describe.each` over the three configs; all three routes 672/672 in the browser (§3, §6) |

### Not in scope (deferred, per today's "Do not / escalate")

- No separate Jobs search app inside the domain page — the page is four
  cards plus three links.
- The right-rail **Current Jobs** panel stays the labelled placeholder
  ("awaiting the jobs endpoint"): the App has no `/api/v1/jobs/current`
  client yet, and rendering roles there would mean inventing data or
  wiring an endpoint the day plan did not schedule. Its `View all` will
  route to `/jobs` when that panel is built.
- Real jobs answers, open/closed semantics and closing-date ordering are
  Carmen's (RAG) and Will's (scraper) deliverables; the App renders what it
  is sent.

---

## 10. Qasim integration checkpoint

Per today's plan: **Jobs gate + scheduler/freshness decision.** No shared
contract/source/schema/cloud change was made in this PR. Two items are
recorded here for the checkpoint rather than resolved silently:

1. **Jobs identity/status contract** is not yet frozen in this repo (§1a);
   fixture ids are placeholders the App never parses.
2. **Freshness** — the current-jobs fixture text says closing dates are "as
   published by the source at the time of the last collection". Whether the
   real answer should carry a collected-at line is a backend/PM decision;
   the App will render whatever text is sent and adds no claim of its own.
