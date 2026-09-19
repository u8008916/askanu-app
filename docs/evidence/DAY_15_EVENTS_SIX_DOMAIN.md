# V6 Sat 19 Sep evidence — Events guided page, accepted feedback, six-domain UX

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day14+day15` · continues from HEAD `d327453`
**Date:** Saturday 19 September 2026 — V6 Day 15 (`my_day_by_day_tasks.md`: "Events guided page + six-domain UX + accepted feedback")
**Deliverable:** Ship the sixth guided domain (Events) against Carmen's real Events contract with no
hard-coded event data, implement only the feedback Qasim classified and accepted, and run the
six-domain desktop/mobile/accessibility regression with refreshed screenshot assets.

No CI is attached to this branch. Numbers below are real `npm test`/`npm run build` output, real
HTTP responses from the RAG service's Day 15 code running locally, real DOM measurements taken by a
scratchpad CDP driver against the dev build, and real `curl` results from the public URL — same
convention as `DAY_08`–`DAY_14`.

Environment: Node v24.12.0, Vite 7, Vitest 3, Python 3.13 (RAG worktree), Chrome headless (CDP).

---

## 0. Summary

| | |
|---|---|
| Scope | Events launcher + `/events` route + nav + panel `View all`; `status` contract sync; Events chat/panel states against the real Events service code; Qasim's Day 15 classification recorded and applied; six-domain matrix at 360/390/430/1280 |
| Changed in `frontend/` | 11 source files, 3 test files; new `pages/EventsPage.tsx`, `tests/eventsPage.test.tsx` |
| Tests | `frontend npm test` → **21 files, 280 passed** (Day 14: 20/256; +1 file, +24 tests, the 2 tests that encoded "Events is unbuilt" were rewritten, not deleted) |
| Build | `npm run build` → `tsc --noEmit` OK, `vite build` ✓ → `dist/assets/index-968dcKdU.js` (277.56 kB / gzip 88.06 kB), `index-BSPtm6RR.css`; bundle scan for `Placeholder\|example.invalid\|Mock` → **0 files** |
| Real backend | askanu-rag `origin/carmen/day15-events-rag-api` (`f79de1f`, 19 Sep 10:25) run locally on `:8081` from its own `fixtures/day15_event_records.json`; Carmen's `tests/test_events.py` + `test_event_time.py` → 27 passed in the same worktree (§4) |
| Deployed | `https://askanu-dev-gdg.web.app` still 404s `/api/v1/events/upcoming` (branch unmerged/undeployed) → panel truthfully "unavailable" there; five other domains answer (§6.3) |
| Headline | Events works end-to-end from stored records with official sources: launcher → prefilled chat → deterministic answer + official/Rubric source cards; panel shows official-only records with venue/organiser/status as stored; no-match/partial/error/empty/unavailable states all honest. **No hard-coded event fact anywhere; no frontend source or status filtering.** |

---

## 1. Qasim's Day 15 PM classification (recorded verbatim, 19 Sep 2026)

The Day 14 board (`DAY_14_PRESENTATION_SMOKE_FEEDBACK.md` §6) had no acceptance marks. Qasim supplied
this classification in the Day 15 session; it is the *only* feedback treated as accepted today.

> **Accepted App feedback / requirements:**
> - Clear Chat remains the wording; don't revert to "New Chat".
> - Login/profile control remains removed from the bottom-right.
> - "Try asking" suggestions are initial-state guidance only rather than something that should keep cluttering the conversation after chat starts.
> - Domain pages should stay compact and guided, not become dense information pages.
> - Recommended questions should launch the chat with the relevant question/context, rather than creating separate rigid workflows.
> - Keep the same general guided-question pattern across the supported domains.
> - Preserve the existing official ANU navigation/source actions.
> - Mobile/responsive behaviour is part of the accepted requirement, not optional polish.
>
> **Events-specific Day 15 requirement:**
> - Build the dedicated Upcoming Events UI against Carmen's official-only Events API contract.
> - The dedicated Upcoming Events panel/page must show official ANU Events only.
> - Do not put Rubric events into that dedicated Upcoming surface.
> - Broader event discovery through chat can use official ANU + approved Rubric data, but that distinction is enforced by Carmen/backend — don't implement source filtering yourself in the frontend.
> - Keep the first Events UI compact: title, date/time, organiser/location where available, source/action.
> - Optional Event fields must degrade cleanly when absent.
> - Don't fabricate ticket availability, price, location or other missing information.
> - Include sensible empty/loading/error/stale behaviour and make sure it works on mobile.
>
> The Events "Try asking" row can be fixed as part of shipping the actual Events capability; don't create a fake Events suggestion before the underlying route is supported. Do not use "None accepted yet." […] Also don't expand Day 15 into V7 conversational redesign or unrelated UI work.

### How each accepted item was handled

| Accepted item | Status today | Where verified |
|---|---|---|
| `Clear Chat` wording | Unchanged; verified on desktop + drawer | §5 step 7, `day15/events-drawer-390x844-mobile.png` |
| No login/profile control | Unchanged; DOM scan for login/sign/profile buttons → only `Clear Chat` | §5 step 7 |
| `Try asking` initial-state only | Unchanged; disappears after first send, restored by Clear Chat | §5 steps 3, 7; `emptyState.test.tsx` |
| Compact guided domain pages | Events built as the same `DomainLauncher` config; every 1280×720 launcher has **no page scroll** (`scrollHeight == clientHeight`) | §6.1 |
| Cards launch the single chat, pre-filled | Events cards prefill + focus, do not send (fetch spy asserts 0 calls) | §5 step 2; `eventsPage.test.tsx` |
| Same guided pattern across domains | `domainLauncher.test.tsx` `describe.each` now runs the shared invariants over **six** configs | §3 |
| Official ANU navigation/source actions preserved | 4 verified `www.anu.edu.au` links on Events; other five domains' link counts unchanged | §2.2, §6.1 |
| Mobile/responsive is a requirement | 360/390/430 matrix, drawer, mobile answer state | §6.1, §6.2 |
| Events: official-only dedicated surface | Panel reads `/api/v1/events/upcoming`, which the RAG service serves from `events_anu_official` only; the App adds **no** `source_id` filter (per Qasim) — the Rubric record in the same fixture appears in chat sources and never in the panel | §4.1, §5 step 3 |
| Compact first Events UI | Panel line = title + `start · venue · organiser · status`, each only when published | §2.1 |
| Optional fields degrade cleanly | Real record with only `start_at` renders time only, no separators; test pins it | §4.1, `feedPanels.test.tsx` |
| No fabrication | Launcher copy banned-regex test (dates, times, `$`, ticket/register/online/hybrid); answer text shown verbatim | `eventsPage.test.tsx` |
| Empty/loading/error/stale | All four panel states + chat no-match/error exercised against the real service | §5 |
| Events `Try asking` row | Fixed *with* the capability: `'What events are happening this week?'` → `'What ANU events are coming up?'` (the backend does not resolve "this week"; §7) | `EmptyState.tsx` |

**Not accepted today, left untouched (Qasim's list did not include them):** board row 3
(personalisation-implying card copy, P2) and row 5 (`DEPLOYMENT.md` stale URL, P2 docs). Rows 1, 2, 6
are backend-owned. Nothing else on the board was changed.

## 2. What shipped

### 2.1 Contract sync — `status` on the event item (see `DECISION_LOG.md` 2026-09-19)

The RAG branch's `UpcomingEventItem` adds `status: str | None` (= stored `cancellation_status`, else
stored `source_status`, e.g. `"published"`) and fixes `source_id` to `events_anu_official`,
`record_id = events:event:<entity_id>`, limit 1–20. Synced in:

- `frontend/src/types/api.ts` `EventItem.status: string | null`
- `frontend/src/resources/listResponse.ts` `parseEventItem` — required nullable string, same strictness as jobs (a malformed item still rejects the envelope → "unavailable", never a partial row)
- `frontend/src/resources/UpcomingEventsCard.tsx` — meta `start · venue · organiser · status`, shown **as stored**; `viewAllTo="/events"`
- `frontend/src/mocks/feedResponses.ts` — fixture identity corrected (`events_anu_official`), + a third item with `status: 'cancelled'` so the as-stored path is exercised
- `docs/API_CONTRACT.md` events section rewritten to the shipped shape; `docs/DECISION_LOG.md` row added

Design call: `status` is rendered verbatim (like Jobs' `closing_text`) rather than hidden or
classified. A stored cancellation wording is therefore never silently dropped from an "upcoming"
row; the cost is a `· published` suffix on ordinary rows — reported in §7 as a backend shaping gap,
not worked around with frontend semantics.

### 2.2 `EVENTS_DOMAIN` launcher (`frontend/src/domains/domainConfig.ts`)

Four guided intents. Every prompt contains "events" (the RAG routing word) and uses only period
wording the service resolves in `Australia/Canberra` — `today`, `next week`, or no period (→ next
upcoming). "this week"/"weekend" are unsupported and "this Friday" has no answer on Sat/Sun, so no
card promises them (asserted by `eventsPage.test.tsx`).

| Card | Prompt | Real answer today (§4.2) |
|---|---|---|
| What's coming up? | `What ANU events are coming up?` | `ok`, 3 events, 3 sources |
| Events on today | `What events are on at ANU today?` | `insufficient_evidence` (no 19 Sep record — honest no-match) |
| Events next week | `What events are on at ANU next week?` | `ok`, 1 event |
| Where is it and who runs it? | `Where are the upcoming ANU events held and who is organising them?` | `ok`, venue/organiser lines incl. "not published in the stored source record" |

Official resources — each opened in the Browser pane, HTTP 200, reached via the site's own nav:

| Label | URL | Reached via |
|---|---|---|
| ANU Events | `https://www.anu.edu.au/events` | site nav ("Experience ANU") |
| Event Calendar | `https://www.anu.edu.au/events/calendar` | `/events` → "Event Calendar" |
| Student life: events & stories | `https://www.anu.edu.au/students/student-life/events-stories` | `/students/student-life` → "Events & stories" |
| Student life | `https://www.anu.edu.au/students/student-life` | students nav |

Rejected (404 by curl): `/events/all-events`, `/news-events`.

Also: `pages/EventsPage.tsx` (12-line wrapper), `/events` route in `App.tsx`, `DomainNav.tsx` Events
gets `to: '/events'` — with every domain now routable the disabled-button branch, the
"Remaining resource pages coming soon." note and their CSS were removed (`to` is now required).

### 2.3 Mock fixtures

`okEventsResponse` / `partialEventsResponse` mirror the backend's paragraph-per-event text format
(ISO timestamp, "not published in the stored source record" line, one official + one Rubric source,
`example.invalid` URLs, 2099 dates), registered as `ok-events` / `partial-events`. **No
`needs-clarification-events` fixture**: the RAG Events path has no clarification branch (no-match is
`insufficient_evidence`), and inventing one would test UI the backend cannot produce — same
omission as Jobs.

## 3. Tests

```
frontend npm test → Test Files 21 passed (21) · Tests 280 passed (280)
```

- **New `tests/eventsPage.test.tsx` (17):** launcher-not-chat; one h1; four buttons; official
  `www.anu.edu.au` links only, safe `target/rel`, below the cards; no invented event data (dates,
  times, `$`, ticket/register/online/hybrid, placeholder titles) scoped to the chat column after
  feeds settle; supported-period-wording + "events" in every prompt; click prefills/focuses/does
  not send; every card's own prompt; Enter + Space; session survives a mid-chat card; `ok-events`
  renders ISO strings verbatim as two paragraphs with official **and** Rubric source cards;
  many-sources no clipping; partial reads as answer; no-match (insufficient) compact with no facts;
  error controlled; panel present on `/events` with `View all`; frozen identity shape
  (`events:event:<id>`, `events_anu_official` / `rubric_unified_search`, `example.invalid`).
- **`navigation.test.tsx`:** "leaves the one unbuilt domain non-navigating" → "makes every domain a
  real link" (7 links, no disabled button, no "coming soon"); + `routes to Events…`, `opens Events
  directly from its own URL`.
- **`feedPanels.test.tsx`:** `View all` now expected in every state (Jobs precedent) and routes to
  `/events`; meta asserts `Mon, 2 Mar, 10:00 am · Placeholder venue · Placeholder organiser ·
  published`, an all-null item renders time only with no `·`, `cancelled` shown as stored, and no
  App-authored `Open|Closed|Cancelled|Live` badge.
- **`domainLauncher.test.tsx`:** `describe.each` now covers six configs (4 cards, distinct prompts,
  Tab order, `*.anu.edu.au`/`anusa.com.au` hosts, banned wording).

## 4. Real backend — Carmen's Day 15 Events code, run locally

Deployed RAG still 404s the endpoint (§0), so "real data" today = the RAG service's own Day 15 code
and stored fixture records, not App mocks. Read-only worktree of `askanu-rag` at
`origin/carmen/day15-events-rag-api` (`f79de1f`), fresh venv (`pip install -e ".[test]" tzdata`),
`COURSE_RECORDS_PATH=<dir of the 4 fixture records>`, `uvicorn askanu_rag.main:create_configured_app
--factory --port 8081`; Vite dev proxy → `:8081`, mock transport off. Nothing in the RAG checkout
was modified. Carmen's `tests/test_events.py` + `tests/test_event_time.py`: **27 passed**.

### 4.1 `GET /api/v1/events/upcoming?limit=5` → 200

```json
{"status":"ok","items":[
 {"record_id":"events:event:anu-official-1001","source_id":"events_anu_official","title":"ANU Open Day",
  "start_at":"2026-09-20T10:00:00+10:00","end_at":"2026-09-20T14:00:00+10:00","venue":"ANU Acton campus",
  "organiser":"The Australian National University","status":"published",
  "url":"https://www.anu.edu.au/events/anu-open-day","domain":"events"},
 {"record_id":"events:event:anu-official-1002","source_id":"events_anu_official","title":"ANU Research Lecture",
  "start_at":"2026-09-21T09:00:00+10:00","end_at":null,"venue":null,"organiser":null,"status":null,
  "url":"https://www.anu.edu.au/events/research-lecture","domain":"events"}],"request_id":"req_…"}
```

The fixture also holds a Rubric record (`rubric-78459`, same start) and a past official seminar
(18 Sep); the **server** excluded both. Panel rendered: `ANU Open Day — Sun, 20 Sept, 10:00 am · ANU
Acton campus · The Australian National University · published` and `ANU Research Lecture — Mon, 21
Sept, 9:00 am` (nulls → nothing, no separators). With only the past record loaded → `{"status":"ok",
"items":[]}` → *"No upcoming ANU events are listed right now."* With the service stopped →
*"Upcoming events are unavailable right now."*, `View all` still offered, zero rows.

### 4.2 `POST /api/v1/ask` — each card prompt + the Home suggestion

| Question | Status | Sources | Answer (first paragraph) |
|---|---|---|---|
| What ANU events are coming up? | `ok` | official, **rubric** (`campus.hellorubric.com/?eid=78459`), official | `ANU Open Day. Starts: 2026-09-20T10:00:00+10:00. Ends: … Venue: ANU Acton campus. Address: Acton ACT 2601. Organiser: The Australian National University. Source status: published.` |
| What events are on at ANU today? | `insufficient_evidence` | — | `I could not find persisted Event evidence for that time period.` |
| What events are on at ANU next week? | `ok` | 1 official | `ANU Research Lecture. Starts: 2026-09-21T09:00:00+10:00.` |
| Where are the upcoming ANU events held and who is organising them? | `ok` | 3 | …`ANU Open Day Community Meetup. Starts: … Venue: not published in the stored source record. Organiser: not published in the stored source record.` |
| What events are on at ANU tomorrow? | `ok` | 2 | Open Day + Rubric meetup |
| What events are happening this week? *(old suggestion)* | `ok` | 3 | "this week" is **ignored** → falls through to the next-5 path (§7) |

## 5. Events UX states in the browser (dev build → local RAG)

1. `/events` at 1280×720: 1 h1, 4 cards, 4 official links, Events current in a 7-link nav, `scrollHeight 720/720` (no page scroll), panel = 2 official rows. `day15/events-1280x720.png`
2. Card "What's coming up?" → `/`, composer value = prompt, focused, `Try asking` still shown, 0 fetches. `day15/events-card-prefill-1280x720.png`
3. Send → 3 paragraphs verbatim (ISO timestamps as sent), `Try asking` gone, **Sources**: `www.anu.edu.au/events/anu-open-day`, `campus.hellorubric.com/?eid=78459`, `www.anu.edu.au/events/research-lecture`, all `target=_blank rel="noopener noreferrer"`, `events` domain label each. `day15/events-answer-real-1280x900.png`, `…-390x844-mobile.png`
4. "Where…who…" → venue/organiser lines incl. the two "not published" records. `day15/events-where-who-real-1280x900.png`
5. "today" → compact *Not enough evidence to answer* + the backend line, no Sources region. `day15/events-no-match-real-1280x720.png`
6. RAG stopped → `role=alert` *"Something went wrong — AskANU could not be reached. Please try again."*, composer still usable, nothing invented.
7. `Clear Chat` → conversation gone, composer empty, `Try asking` back with `What ANU events are coming up?`; the only chat-control button is `Clear Chat` (no login/profile).
8. Mobile 390 drawer on `/events`: Clear Chat, 7 nav links (Events current), Quick Links, Upcoming Events panel with the 4-part meta wrapping without clipping. `day15/events-drawer-390x844-mobile.png`

Keyboard: cards are real `<button>`s with the shared `.card:focus-visible` + global `:focus-visible`
rules; Tab order (cards then links) and Enter/Space activation are asserted by RTL for all six
configs (`domainLauncher.test.tsx`) and for Events specifically (`eventsPage.test.tsx`). The pane
could not deliver key events this session (window backgrounded — same CDP limitation Day 13 noted),
so no additional manual keyboard capture is claimed.

## 6. Six-domain regression

### 6.1 Matrix — dev build (`localhost:5173`) → local RAG, CDP headless Chrome

`sw/cw` = `documentElement.scrollWidth/clientWidth` (horizontal overflow if `sw > cw`); `sh/ch` =
scrollHeight/clientHeight (page scroll if `sh > ch`); overflowing = elements whose right edge exceeds
the viewport. Mobile rows show `nav 0` because the drawer is closed; the drawer row shows 7.

| Shot | Route | sw/cw | sh/ch | h1 | nav links | cards | links | Events panel | overflowing |
|---|---|---|---|---|---|---|---|---|---|
| `home-1280x720` | `/` | 1280/1280 | 720/720 | 1 | 7 | — | — | 2 items; View all | 0 |
| `courses-1280x720` | `/courses` | 1280/1280 | 720/720 | 1 | 7 | 4 | 4 | 2 items; View all | 0 |
| `scholarships-1280x720` | `/scholarships` | 1280/1280 | 720/720 | 1 | 7 | 4 | 2 | 2 items; View all | 0 |
| `jobs-1280x720` | `/jobs` | 1280/1280 | 720/720 | 1 | 7 | 4 | 3 | 2 items; View all | 0 |
| `accommodation-1280x720` | `/accommodation` | 1280/1280 | 720/720 | 1 | 7 | 4 | 4 | 2 items; View all | 0 |
| `support-1280x720` | `/support` | 1280/1280 | 720/720 | 1 | 7 | 4 | 4 | 2 items; View all | 0 |
| `events-1280x720` | `/events` | 1280/1280 | 720/720 | 1 | 7 | 4 | 4 | 2 items; View all | 0 |
| `home-360x800-mobile` | `/` | 360/360 | 800/800 | 1 | 0 | — | — | 2 items; View all | 0 |
| `courses-360x800-mobile` | `/courses` | 360/360 | 800/800 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `scholarships-360x800-mobile` | `/scholarships` | 360/360 | 800/800 | 1 | 0 | 4 | 2 | (in drawer) | 0 |
| `jobs-360x800-mobile` | `/jobs` | 360/360 | 800/800 | 1 | 0 | 4 | 3 | (in drawer) | 0 |
| `accommodation-360x800-mobile` | `/accommodation` | 360/360 | 800/800 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `support-360x800-mobile` | `/support` | 360/360 | 800/800 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `events-360x800-mobile` | `/events` | 360/360 | 800/800 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `home-390x844-mobile` | `/` | 390/390 | 844/844 | 1 | 0 | — | — | 2 items; View all | 0 |
| `courses-390x844-mobile` | `/courses` | 390/390 | 844/844 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `scholarships-390x844-mobile` | `/scholarships` | 390/390 | 844/844 | 1 | 0 | 4 | 2 | (in drawer) | 0 |
| `jobs-390x844-mobile` | `/jobs` | 390/390 | 844/844 | 1 | 0 | 4 | 3 | (in drawer) | 0 |
| `accommodation-390x844-mobile` | `/accommodation` | 390/390 | 844/844 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `support-390x844-mobile` | `/support` | 390/390 | 844/844 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `events-390x844-mobile` | `/events` | 390/390 | 844/844 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `home-430x932-mobile` | `/` | 430/430 | 932/932 | 1 | 0 | — | — | 2 items; View all | 0 |
| `courses-430x932-mobile` | `/courses` | 430/430 | 932/932 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `scholarships-430x932-mobile` | `/scholarships` | 430/430 | 932/932 | 1 | 0 | 4 | 2 | (in drawer) | 0 |
| `jobs-430x932-mobile` | `/jobs` | 430/430 | 932/932 | 1 | 0 | 4 | 3 | (in drawer) | 0 |
| `accommodation-430x932-mobile` | `/accommodation` | 430/430 | 932/932 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `support-430x932-mobile` | `/support` | 430/430 | 932/932 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `events-430x932-mobile` | `/events` | 430/430 | 932/932 | 1 | 0 | 4 | 4 | (in drawer) | 0 |
| `events-card-prefill-1280x720` | `/` | 1280/1280 | 720/720 | 1 | 7 | — | — | 2 items | 0 |
| `events-answer-real-1280x900` | `/` | 1280/1280 | 900/900 | 1 | 7 | — | — | 2 items | 0 |
| `events-where-who-real-1280x900` | `/` | 1280/1280 | 900/900 | 1 | 7 | — | — | 2 items | 0 |
| `events-no-match-real-1280x720` | `/` | 1280/1280 | 720/720 | 1 | 7 | — | — | 2 items | 0 |
| `events-answer-real-390x844-mobile` | `/` | 390/390 | 844/844 | 1 | 0 | — | — | (in drawer) | 0 |
| `events-drawer-390x844-mobile` | `/events` (drawer open) | 390/390 | 844/844 | 1 | **7** | 4 | 4 | 2 items; View all | 0 |

No horizontal overflow at any width; no page scroll on any 1280×720 launcher; exactly one `h1`
per route; no interactive element under 24 px tall on any shot. Current Jobs showed the honest
empty line throughout because the local fixture holds no jobs (the deployed feed has 1, §6.3).

### 6.2 Screenshot assets (`docs/evidence/day15/`, 15 PNGs, 1.1 MB, headless default = dark theme)

`home-1280x720`, `courses-1280x720`, `scholarships-1280x720`, `jobs-1280x720`, `accommodation-1280x720`,
`support-1280x720`, `events-1280x720`, `home-390x844-mobile`, `events-390x844-mobile`,
`events-drawer-390x844-mobile`, `events-card-prefill-1280x720`, `events-answer-real-1280x900`,
`events-where-who-real-1280x900`, `events-no-match-real-1280x720`, `events-answer-real-390x844-mobile`.

### 6.3 Deployed five-domain smoke (`https://askanu-dev-gdg.web.app`, unchanged pinned build)

| Domain | Question | Status | First source |
|---|---|---|---|
| Courses | What are the prerequisites for COMP1110? | `ok` | `programsandcourses.anu.edu.au/2026/course/comp1110` |
| Scholarships | What scholarships are available for international students? | `ok` (5 sources) | `study.anu.edu.au/scholarships/find-scholarship/action-trust-scholarship` |
| Jobs | What jobs are currently open at ANU? | `ok` | `jobs.anu.edu.au/jobs/administration-coordinator-…` |
| Accommodation | Tell me about Warrumbul Lodge. | `ok` | `study.anu.edu.au/accommodation/our-residences/warrumbul-lodge` |
| Support | What can ANUSA Student Assistance help me with? | `ok` (3 sources) | `anusa.com.au/student-assistance/academic/` |
| feeds | `jobs/current` → `ok`, 1 item · `events/upcoming` → 404 (`status:"error"` envelope) — panel "unavailable", as Day 14 | | |

Generic Accommodation card prompts (compare / cost / "how do I apply") still return
`insufficient_evidence` on the deployed build — identical to the Day 14 state (`day14/accommodation-
insufficient-evidence-1280x900.png`), a backend coverage gap, not a UI regression.

## 7. Remaining gaps — reported, not worked around

**Backend / contract (Carmen):**
1. **Raw ISO timestamps in chat answers** (`Starts: 2026-09-20T10:00:00+10:00`). The App renders backend text verbatim; reformatting it would be authoring. Ask for Canberra-readable wording in `answer`, or structured event `items[]` the App could format the way the panel does.
2. **Unsupported period words are silently ignored**, not rejected: "this week"/"weekend" fall through to the next-5-upcoming path, so a Monday event can be presented for "this week". Only `today/tomorrow/this Friday/next week` resolve; "this Friday" returns no-match on Sat/Sun. The UI avoids these words; students typing them will get a plausible-looking but period-blind answer.
3. **`status` is free text mixing two concepts** (`cancellation_status ?? source_status`). Shown as stored (`· published` on every ordinary row). A fixed enum, or `null` when nothing notable, would let the panel stay quieter without frontend semantics.
4. `category`, `tags`, `registration_url`, `address` are stored but never surfaced on the endpoint or in the answer; **no `format` (online/in-person/hybrid) field exists in the schema** — so the kickoff's "format/category/registration details" cannot be rendered from any source today and the UI makes no such promise.
5. The Events branch is unmerged/undeployed; the public panel stays "unavailable" and the public Events page's cards will answer `insufficient_evidence`/route to non-Events paths until it ships.
6. Deployed Accommodation still answers only entity questions (§6.3) — Day 14 gap, unchanged.

**App (Ben):**
7. Board rows 3 and 5 remain open pending Qasim (not accepted today).
8. Screenshots are headless-default dark theme; light-theme captures were not added (same as Day 8's `-dark` convention).

No hard-coded event, job, scholarship, accommodation or support fact was added anywhere in
production code this pass; the App performs no source, status or date filtering of its own.
