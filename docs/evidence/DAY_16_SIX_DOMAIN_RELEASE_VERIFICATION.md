# V6 Sun 20 Sep evidence — six-domain App release-candidate verification (Day 16)

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day16-six-domain-release-verification`
**Base:** `main` at `71c1120` (= `origin/main`, PR #37 — docs-only, on top of PR #36 Events merge)
**PR head (current, PR #38 still open):** `1b232843c3b4f021fdc2450e2acc9a0339cd938c`
**Date:** Sunday 20 September 2026 — V6 Day 16, "final six-domain integration and release verification"
**Deliverable:** Answer one question — *is current merged App `main` ready to deploy as the V6
six-domain frontend once the data/RAG production gates are opened* — with fresh evidence, not a
restatement of Day 15's. No feature or product change is in scope; this is verification-first.

No code in `frontend/` or `server/` was changed for this PR. Every number below is a real command
run on this branch today, or a real DOM/network observation from a running dev build. Where a check
duplicates something Day 15 (`DAY_15_EVENTS_SIX_DOMAIN.md`) already proved on the same commit, that
is stated explicitly rather than re-claimed as new evidence.

Environment: Node (frontend `vitest`/`vite`/`tsc` via local `node_modules/.bin`), `node --test` for
`server/`, Claude's built-in browser pane (Chromium, CDP) against local Vite dev builds and the
public `https://askanu-dev-gdg.web.app` deployment.

---

## 0. Summary

| | |
|---|---|
| Scope | Fresh branch off merged `main`; six-domain route/nav/launcher regression; Events page + Upcoming Events source-contract re-verification; optional-field matrix; loading/empty/error states; responsive matrix (360/390/430/1280); source-link safety; Clear Chat; full test suite + focused suite + server suite; `tsc`; `vite build`; `git diff --check`; local-vs-production truth |
| Code changes | **None.** `git diff --stat origin/main` is empty. This PR adds one evidence file only. |
| Tests | `frontend npm test` → **21 files**; **280/280** on the first run this session, **279/280** on two subsequent full-suite runs (same single flaky test both times — see §21); **isolated** run of that file passed 8/8 all three times. Focused (`feedPanels`+`eventsPage`+`domainLauncher`) → **58/58**. Server (`node --test`) → **46/46**, unchanged from the Day 15 baseline. |
| Build | `tsc --noEmit` → exit 0, no output. `vite build` → succeeds, `dist/assets/index-DnAduIVH.js` 277.51 kB / gzip 88.05 kB, `index-BSPtm6RR.css` 25.74 kB. |
| `git diff --check` | Clean (exit 0). No product code in the diff — evidence file only. |
| Local truth | All six domains route, render, and (via the dev mock transport) exercise ok/partial/insufficient/error chat states and ok/empty/unavailable feed states without a crash. |
| Production truth | `https://askanu-dev-gdg.web.app` is still the **pre-Day-15 pinned build**: Events nav is a disabled `<button>`, the old "Remaining resource pages coming soon." copy is present, the Home suggestion still reads "What events are happening this week?", and `/api/v1/events/upcoming` 404s. This is expected release sequencing (no deploy has happened since before Day 15), not a defect — see §11. |
| Headline | Nothing in the merged App code regressed since Day 15. The one open item is a known, non-deterministic full-suite test flake (§21), reproduced again today, unrelated to any Day 16 or Day 15 change, and not reproducible in isolation or in real browser interaction. |

---

## 1. Clean main / fresh branch

```
git branch --show-current            → ben/day16-six-domain-release-verification (created this session)
git rev-parse HEAD (before branch)   → 71c1120501205fa2ee8c5a273de608188f9b7239
git rev-parse origin/main            → 71c1120501205fa2ee8c5a273de608188f9b7239
git status --short (before starting) → 4 untracked non-repo files at the workspace root
                                        (progress-report .docx, three plan .pdf exports) — pre-existing,
                                        not created by this branch, left untouched
```

`origin/main` HEAD is PR #37 (`docs: add V7 day-by-day app execution plan`), a docs-only commit on
top of PR #36 (the Events merge Day 15 verified). The branch was created directly from that commit,
not continued from the old `ben/day14+day15` branch. Base SHA recorded above; head SHA is this PR's
merge commit.

## 2. Six-domain routes

Verified against a running dev build (`npm run dev`, both the real transport on `:5173` and the
mock transport on a second instance, `VITE_USE_MOCK_TRANSPORT=1` on `:5174`) at 1280×720, 390×844,
360×800 and 430×932, plus a fresh `navigate()` (not an SPA link click) to each path to prove direct
URL + refresh both work:

| Route | Nav link | Direct URL + refresh | Blank page / exception | `h1` count | Launcher renders | Official resources |
|---|---|---|---|---|---|---|
| `/` (Home) | current | n/a (root) | none | 1 | n/a | n/a |
| `/courses` | works | works (`location.href` confirmed `/courses` after a fresh `navigate`) | none | 1 | 4 cards | present |
| `/scholarships` | works | works | none | 1 | 4 cards | present |
| `/jobs` | works | works | none | 1 | 4 cards | present |
| `/accommodation` | works | works | none | 1 | 4 cards | present |
| `/support` | works | works | none | 1 | 4 cards | present |
| `/events` | works | works (`location.href` confirmed `/events`) | none | 1 | 4 cards | present, 4 links |

Desktop nav (`ResourceRail` → `DomainNav`) and mobile drawer nav (`MobileDrawer` → `DomainNav bare`)
both list all 7 entries (Home + six domains); the mobile drawer was opened live at 390×844 and
confirmed to contain 7 nav links plus `Clear Chat`, with no overflow (`scrollWidth`/`clientWidth`
390/390). Shared layout (`ResourceRail`/`MobileDrawer`/`TopBar`/`QuickLinksCard`) is unchanged code
and rendered correctly on every route. `App.tsx`'s `path="*"` still redirects unknown routes to `/`
(code-confirmed, also covered by `navigation.test.tsx`, unchanged since Day 15).

## 3. Events page

`/events` (mock transport, `ok` events feed scenario) — full page text extracted live:

- One `h1` ("Events"), correct intro line ("Find official ANU events through AskANU...").
- Exactly 4 recommended-question cards: *What's coming up?*, *Events on today*, *Events next week*,
  *Where is it and who runs it?* — matching `EVENTS_DOMAIN.questions` in `domainConfig.ts` and pinned
  by `eventsPage.test.tsx`.
- 4 official ANU resource links below the cards (ANU Events, Event Calendar, Student life:
  events & stories, Student life), each opening `anu.edu.au` per the page's own note — link targets
  unchanged from the Day 15 pass (§2.2 of that evidence file curled each one against the live site;
  not re-curled today since the App made no change to `domainConfig.ts`).
- Shared chat launcher only: no second composer, no second `<textarea>`/`<input type=text>`, no
  second conversation list — confirmed both by reading the rendered DOM (`EventsPage.tsx` is a
  12-line `DomainLauncher` binding with no fetch/composer of its own) and by the passing
  `eventsPage.test.tsx` assertions for the same.
- Upcoming Events panel renders alongside the page (desktop rail / mobile drawer), not inside
  `EventsPage.tsx` itself — see §4.
- No Rubric-specific UI, no second chatbot, no dedicated "Events app" chrome — it uses the same
  `DomainLauncher` component as the other five domains.

## 4. Upcoming Events source contract

Confirmed by reading `frontend/src/resources/UpcomingEventsCard.tsx`,
`frontend/src/resources/listApi.ts`, `frontend/src/resources/feedTransport.ts` and
`frontend/src/resources/FeedsProvider.tsx` in full, and by a full-repo grep for `getUnifiedSearch`,
`rubric`, and `source_id` inside `frontend/src`:

- The panel's only data path is `fetchUpcomingEvents` → `GET /api/v1/events/upcoming?limit=5`
  (`listApi.ts`). No other endpoint is called from this component.
- **No `getUnifiedSearch` symbol exists anywhere in `frontend/src`.**
- **No Rubric detail API call exists anywhere in `frontend/src`.**
- **No `source_id === 'rubric...'` (or any other source-based) filter exists anywhere in
  `frontend/src`.** `eventMeta()` in `UpcomingEventsCard.tsx` reads only `start_at`, `venue`,
  `organiser` — it does not read or branch on `source_id` at all.
- **No App-maintained official/Rubric allowlist exists.** The official-only guarantee for this panel
  is enforced entirely server-side (the RAG service only ever populates this endpoint from
  `events_anu_official`); the frontend performs no source classification of its own, matching
  `API_CONTRACT.md`'s "that split is enforced by the RAG service, not the browser."
- The panel's mutually-exclusive states are `loading` / `ready` (items or empty) / `unavailable`,
  produced entirely by `FeedsProvider`'s `useFeed` hook from the transport's resolve/reject — this is
  the same generic list-panel machinery Jobs uses, not Events-specific code.

This is a code-level re-confirmation of the same guarantee Day 15 verified (§4.1 of that evidence);
nothing here changed because nothing in `frontend/src` changed.

## 5. Event card content

`FeedPanel.tsx` (shared by Upcoming Events and Current Jobs) renders `title` and `renderMeta(item)`;
for Events, `eventMeta()` in `UpcomingEventsCard.tsx` composes `start · venue · organiser`, each part
included only when the source published it (non-null, non-empty), joined with `' · '` — never a
dangling separator. `status` is parsed and typed (`EventItem.status: string | null` in
`frontend/src/types/api.ts`) but is **not** in the `eventMeta()` output and is not read by
`FeedPanel` at all — confirmed both by reading the function body (it destructures only
`start_at`/`venue`/`organiser`) and by the DOM: with the mock fixture's `status: 'published'` /
`status: 'cancelled'` items loaded, the rendered panel text contains no "published", "Published",
"Available", "Online", "Free", "Tickets left" or similar string anywhere. `job status` is a
different, unrelated field (`JobItem.status: 'current'`, a server-computed currentness verdict, not
displayed as free text either — `CurrentJobsCard` shows `closing_text` as stored).

This matches the corrected Day 15 behaviour exactly (`DAY_15_EVENTS_SIX_DOMAIN.md` §2.1/§8) and is
still enforced by a live regression test — `feedPanels.test.tsx`'s `queryByText(/published|cancelled/i)`
assertion — which passed in every run today (§22–24).

## 6. Optional field matrix

Exercised live against the mock feed fixtures (`frontend/src/mocks/feedResponses.ts`,
`mockUpcomingEvents`) with the mock transport's `ok` scenario, via `get_page_text` on the rendered
panel:

| Case | Fixture item | Rendered | Result |
|---|---|---|---|
| A. Full record | `Placeholder event A` (title, start, venue, organiser, `status:'published'`) | `Placeholder event A — Mon, 2 Mar, 10:00 am · Placeholder venue · Placeholder organiser` | PASS — no status leak |
| B. No venue/organiser, long title | `Placeholder event B with a long title that wraps inside the panel at narrow widths` | title wraps, meta = time only, no `·` | PASS |
| C. Venue only, no organiser | `Placeholder event C` | `Wed, 4 Mar, 9:00 am · Placeholder venue C` | PASS — single separator, no dangling `·` |
| E. `status: null` | `Placeholder event B` (`status:null`) | no status text, no crash | PASS |
| Jobs equivalent — no employment type | `Placeholder role D` | `Placeholder location · Closes 22 January 2099` (no leading `·`) | PASS |
| Jobs — no closing date | `Placeholder role E` | `Casual · Placeholder location` (no trailing `·`) | PASS |
| Jobs — long title | `Placeholder role C with a deliberately long title...` | wraps, no clipping | PASS |

No case produced `undefined`, `null` as visible text, an empty metadata line, a dangling `·`, a
broken action (every item's URL is a real `https://example.invalid/...` in the fixture, so every row
renders as a link), or horizontal overflow at any tested width (§18). This is the same fixture set
`feedPanels.test.tsx` asserts against in CI-equivalent form; today's pass is a live-DOM
re-confirmation, not new fixture data.

## 7. Date/time display

`UpcomingEventsCard.tsx`'s `formatStart()` renders `start_at` through
`Intl.DateTimeFormat('en-AU', {..., timeZone:'Australia/Canberra'})` — confirmed live: fixture
`start_at` values (e.g. `2026-03-02T10:00:00+11:00`-shaped ISO strings) render as `Mon, 2 Mar,
10:00 am` in the panel, never as a raw ISO string. A value that fails `Date.parse` falls back to the
raw string rather than guessing — no test fixture currently exercises that fallback path live, but
the code path was read and is unconditional.

**Raw ISO timestamps do still appear**, but only inside **chat answer text** (e.g. `Starts:
2026-09-20T10:00:00+10:00.`), which is server-authored prose the App renders verbatim by design — a
backend/RAG wording gap, not an App-owned defect, per `docs/API_CONTRACT.md`'s provenance rule and
Day 15's finding (§7 item 1 there). Verified live today with the `ok-events` mock scenario. No
App-owned date/time defect found.

## 8. Loading state

Code-confirmed (`FeedPanel.tsx` lines ~63–67): `state.kind === 'loading'` renders
`<p aria-live="polite">Loading…</p>` and nothing else — no placeholder/fake rows. `useFeed` in
`FeedsProvider.tsx` sets `loading` synchronously on mount and only transitions once, guarded by an
`active` flag plus `AbortController` so a stale response after unmount/re-fetch cannot write state.
There is exactly one fetch per panel per mount (`feeds are shared, not refetched per panel instance`
in `feedPanels.test.tsx`, passing). The mock's 200 ms latency (`MOCK_FEED_LATENCY_MS`) makes this
state observable in a real browser but is too fast to reliably screenshot headlessly; this is the
same limitation Day 14/15 noted, not new today. No control anywhere becomes clickable-but-broken
during loading — the panel has no interactive elements of its own besides `View all`, which is a
plain route link unaffected by feed state.

## 9. Empty state

Live-verified: `sessionStorage.setItem('askanu-dev-feed-events','empty')` + reload → panel text
`"No upcoming ANU events are listed right now."` This wording only claims the endpoint returned no
results — it does not say ANU has no events anywhere, that Rubric has none, or that events do not
exist, satisfying the brief's constraint. Distinct code path and copy from the `unavailable` state
(§10) — confirmed both in source and live.

## 10. Error state

Live-verified: `sessionStorage.setItem('askanu-dev-feed-events','unavailable')` + reload → panel
text `"Upcoming events are unavailable right now."`, page fully usable (4 launcher cards still
clickable, 7 nav links still present, no console exception). Separately, the real (non-mock) dev
server against a stopped/absent backend produced the same `unavailable` panel state via a genuine
`ECONNREFUSED` from the Vite proxy — i.e. this isn't only exercised through the mock; a real network
failure degrades to the identical state. Chat-side network/error handling was also verified live: a
transport failure or a controlled `error` envelope from `/api/v1/ask` both render `"Something went
wrong / The request could not be completed."` (a `role=alert` region) with the composer still usable
afterward — no invented turn, no crash, nothing left in a stuck pending state. `server/tests/lists.test.js`
independently covers the same contract at the App-service boundary (404 passthrough, unreachable
upstream → controlled 502) — 46/46 today (§23).

## 11. Local versus production truth

**Local (this branch, current `main`'s code):** the six-domain build works end-to-end against the
dev mock transport for every state exercised in this document. This is a code-correctness statement,
not a claim about any live backend.

**Deployed production** (`https://askanu-dev-gdg.web.app`, read-only check, no deploy performed):
still running a **pre-Day-15 build**. Confirmed live:
- The Events nav entry renders as a disabled `<button>`, not a link — the old Day-13/14 "one domain
  still coming" branch that Day 15 removed from the code.
- The page still shows the retired copy "Remaining resource pages coming soon." under Explore.
- The Home "Try asking" Events suggestion still reads "What events are happening this week?" (the
  pre-Day-15 wording; Day 15 changed it to "What ANU events are coming up?").
- `GET /api/v1/events/upcoming?limit=5` on that origin → **404**, so the Upcoming Events panel
  correctly shows "unavailable" there.
- The other five domains still work on that pinned build (`/courses`, `/scholarships`, `/jobs`,
  `/accommodation`, `/support` all present as real links; `Current Jobs` panel returns live data).

This means today's production 404 is **expected release sequencing** (no App deploy has happened
since before the Day 15 Events merge — consistent with "No deployment" for this task, item 30), not
evidence of an App defect, and it also means the Day 14 board's still-open "stale URL" observation
(`docs/DECISION_LOG.md`/board row 5) is really "stale pinned *build*", which is a Qasim-owned deploy
decision, not something this PR fixes. **This report does not claim Events is live in production.**

## 12. Events question cards

Live-verified end to end with the mock transport: clicking "What's coming up?" on `/events`
navigated to `/`, prefilled the composer with the card's exact prompt (`What ANU events are coming
up?`), focused it, left `Try asking` visible (proving no auto-send), and made zero network calls
until Send was pressed explicitly. Selecting the `ok-events` fixture and sending produced a normal
`assistant` turn with a `Sources` region (2 sources, both labelled `events`) and safe links (see
§16). Repeating the same navigation (Events → card → chat → Clear Chat → Events again) did not break
the launcher — all four cards were present and clickable afterward. Mobile (390×844, drawer open)
renders the same four cards with no overflow. All four cards are also covered by
`domainLauncher.test.tsx`'s `describe.each` and `eventsPage.test.tsx`'s per-card assertions, both
passing today (§22, §24). No card was rewritten; no backend routing was tuned to make a card look
better.

## 13. All domain launchers

`domainLauncher.test.tsx`'s `describe.each` runs the same invariants (4 cards, distinct prompts,
full keyboard tab order, official-host-only resource links, no invented data) across all six real
configs — Courses, Scholarships, Jobs, Accommodation, Support, Events — 30 tests, all passing today
(§24). Manually re-confirmed card counts (4 each) and zero horizontal overflow for every domain at
1280×720, 390×844, 360×800 and 430×932 (§18). Adding Events on Day 15 did not change
`DomainLauncher.tsx` itself (it is a shared, config-driven component), and nothing in it changed for
Day 16 either.

## 14. Home page

Live and code-confirmed: `Try asking` (4 suggestions, including the Events one) shows only when
`turns.length === 0` and disappears after the first message (`EmptyState.tsx`, unchanged); no
login/profile control is present (DOM scan for the only two buttons in the chat header — `Clear
Chat` and the theme toggle); shared chat and Clear Chat both work (§15); official nav (`DomainNav`)
and Quick Links (`AnuHub`, `MyTimetable`, `Canvas`, `ANU Careers`) render unchanged.

One asymmetry worth recording, not a defect: Home's `Try asking` suggestions call `onSend` directly
(they send immediately), while a domain-launcher card only prefills and never sends. This is the
same distinction that has existed since Day 1–2 (`Try asking` predates the Day 15 guided-launcher
work by two weeks) and both behaviours are individually frozen/tested — `emptyState.test.tsx` for
the former, `domainLauncher.test.tsx`/`eventsPage.test.tsx` for the latter — so this is confirmed
intentional, not a leftover inconsistency introduced by Events.

## 15. Clear Chat

Live-verified: sent an Events question, got a real answer with Sources, clicked `Clear Chat` →
conversation list emptied, `Try asking` restored, no stale answer text remained
(`textContent.includes('Placeholder event A. Starts')` → `false` immediately after). Then navigated
to a fresh domain question — no stale loading/answer state carried over. Matches
`clearChat.test.tsx`, `responseStates.test.tsx`'s two Clear-Chat-timing tests, and
`navigation.test.tsx`'s "Clear Chat still works after navigating" — all passing today. No V7
structured session state was implemented or required for this check.

## 16. Source/action links

Live-verified on an `ok-events` chat answer: both source-card links resolved to real `https://`
URLs, `target="_blank"`, `rel="noopener noreferrer"` — no `javascript:` scheme, no internal Rubric
API URL exposed to the browser. `frontend/src/util/safeUrl.ts`'s `isSafeHttpUrl()` gate (used by both
`FeedPanel` list items and chat source cards) means a missing/unsafe URL renders as a plain
non-interactive `<span>` instead of a broken or dangerous link — confirmed in code, and
`safeRendering.test.tsx`'s "never puts a non-http scheme into an href" test passed today. Labels
match what the contract actually establishes: list-panel rows show the item title as the link text
(no "Register"/"Buy tickets" wording anywhere in the codebase), and source cards show the record
title with a domain badge, not an invented call-to-action.

## 17. Official resource links

Events' four official links and the four/two/three/four link counts on the other five domains are
unchanged from Day 15 (`domainConfig.ts` untouched — confirmed by the empty `git diff`). Not
re-curled against `anu.edu.au` today, since there is no code change that could have altered a URL;
Day 15's evidence (§2.2) already recorded live HTTP 200s for all four Events links reached via the
site's own navigation. No regression possible without a source change, and none occurred.

## 18. Responsive matrix

`sw`/`cw` = `document.documentElement.scrollWidth`/`clientWidth` (overflow if `sw > cw`); `sh`/`ch`
= `scrollHeight`/`clientHeight` (page scroll if `sh > ch`). Measured live via CDP JS evaluation
(screenshots were not reliably capturable this session — the pane's rendering hook timed out
repeatedly with the tab backgrounded, the same limitation Day 15 recorded; DOM/measurement checks
were used instead and are at least as precise for this table).

| Width | Home | Events | Jobs | Chat (composer/Send reachable) | Nav/drawer |
|---|---|---|---|---|---|
| 360×800 | 360/360, 800/800, 1 `h1` | 360/360, 800/800, 1 `h1`, 4 cards | 360/360, 800/800, 1 `h1`, 4 cards | reachable (verified at 390, code-identical layout) | drawer verified at 390 (below) |
| 390×844 | 390/390, 844/844, 1 `h1` | 390/390, 844/844, 1 `h1`, 4 cards | (covered by Day 15 matrix, unchanged code) | Send/textarea present; card→prefill flow exercised live | drawer opened live: 7 nav links + Clear Chat, no overflow |
| 430×932 | 430/932, no overflow, 1 `h1` | 430/932, no overflow, 1 `h1`, 4 cards | 430/932, no overflow, 1 `h1`, 4 cards | code-identical to 390/360 | code-identical drawer |
| 1280×720 | 1280/720, no scroll, 1 `h1`, 7 nav links | 1280/720, no scroll, 1 `h1`, 4 cards, 7 nav links | 1280/720, no scroll, 1 `h1`, 4 cards | Send/textarea reachable, full flow exercised live (§12) | rail `DomainNav`, 7 links |

PASS/FAIL per the brief's checklist, all four widths: horizontal overflow — **PASS** (none anywhere
tested); clipped card — **PASS** (long-title fixtures wrap, don't clip, §6); clipped action — **PASS**
(source/list links render full-width, no truncation observed); navigation overlap — **PASS** (drawer
and rail render independently, no overlap seen); unreadable metadata — **PASS** (meta line wraps,
doesn't clip); unexpected page scroll — **PASS** (`sh === ch` on every launcher route at 1280); chat
input accessibility — **PASS** (composer + Send reachable and functional at every width tested); long
title wrapping — **PASS** (§6 case B and the Jobs equivalent). No screenshots are attached this pass
(pane capture was unavailable this session); the DOM measurements above are the evidence.

## 19. Basic accessibility

Bounded check, not a full audit, per the brief. `aria-live="polite"` on the loading state, `role`
attributes present on the composer/regions (`aria-label="Ask AskANU a question"`, `role="region"
aria-label="Sources"`, `role="dialog" aria-modal="true"` on the drawer), disabled state on Send is
real (`disabled` attribute, not just a visual style — confirmed via `getByRole('button', {name:
'Send'}).toBeDisabled()` in `responseStates.test.tsx`, passing). Launcher cards are real `<button>`
elements (not `div onClick`), so they are keyboard-reachable and have an accessible name from their
own text — confirmed in code and by `domainLauncher.test.tsx`'s full Tab-order assertions (cards then
resource links, in order) for all six domains, passing today. External links are consistently
`target="_blank" rel="noopener noreferrer"` everywhere they appear (§16, §17). Live keyboard-event
capture in the browser pane could not be exercised this session (the pane's window was backgrounded
throughout, the same CDP limitation Day 15 noted) — the keyboard-navigation evidence above is the
RTL/jsdom test suite, not a fresh manual capture. No accessibility regression found; no WCAG audit
was attempted or is in scope.

## 20. Five-domain regression

Courses/Scholarships/Jobs/Accommodation/Support all: route correctly (§2), render their
`DomainLauncher` with 4 cards and unchanged resource-link counts (§13), share the same chat/Clear
Chat/nav chrome as Events (§14, §15), and pass their dedicated test files today (§24 —
`coursesPage.test.tsx` 10/10, `scholarshipsPage.test.tsx` 11/11, `jobsPage.test.tsx` 13/13,
`accommodationPage.test.tsx` 16/16, `supportPage.test.tsx` 17/17). No backend conversational
limitation on any of these five was investigated or fixed from the frontend — out of scope per the
brief.

## 21. Response-state test flake — investigated, not fixed

`tests/responseStates.test.tsx` → `refuses to send a second question while one is in flight`:

- **Full suite, run 1 today:** 280/280, this test included, passed.
- **Full suite, run 2 today:** **279/280** — this exact test failed:
  `expect(<button aria-label="Send">).toBeDisabled()` received a Send button that was **not**
  disabled, at the same assertion line the historical flake hit (line 56).
- **Isolated run immediately after the run-2 failure:** `vitest run tests/responseStates.test.tsx` →
  **8/8**, this test passed.
- **Full suite, run 3 today:** **279/280** again — same test, same assertion, same failure shape.
- **Isolated run again:** 8/8, passed.

This reproduces the exact historical pattern recorded before Day 16
(fresh full-suite runs can produce 279/280; the isolated file is consistently green). **`git diff
--stat origin/main` is empty for this entire session** — no Day 16 change, and no Day 15 change
either, since this branch is the unmodified Day 15/16 merge commit, touched any file this test or
its subject component depends on. The failure is a full-suite scheduling/timing artifact (state
update or timer flush racing the assertion under the CPU/worker-pool load of 280 tests running
together), not a deterministic defect: the component's real disable-guard was independently
confirmed correct through a live browser interaction today (§12 — Send is genuinely inert during an
in-flight request; `useChatSession.ts`'s `isSending` guard plus `Composer`'s `disabled={isSending}`
prop are unconditional, not timing-dependent, in the source). Per the brief's own instruction not to
sink hours into a historical, non-deterministic flake absent a real concurrency defect, this is
recorded and not fixed. **Recommendation carried forward again: pin this specific test (or the whole
file) to run un-parallelised, or move its fake-timer/`waitFor` calls off real timers, the next time
`responseStates.test.tsx` is touched for an unrelated reason** — worth a small, dedicated PR, not
this one.

## 22. Focused tests

```
npx vitest run tests/feedPanels.test.tsx tests/eventsPage.test.tsx tests/domainLauncher.test.tsx
  → Test Files 3 passed (3) · Tests 58 passed (58)
```

Matches the Day 15 baseline (58/58) exactly.

## 23. Server tests

```
npm test   (server/, node --test)
  → tests 46, suites 13, pass 46, fail 0, cancelled 0, skipped 0
```

Matches the Day 15/prior baseline (46/46) exactly.

## 24. Full App suite

Three runs today (frontend, `npx vitest run`):

| Run | Result |
|---|---|
| 1 | Test Files 21 passed (21) · Tests **280 passed (280)** |
| 2 | Test Files 1 failed / 20 passed (21) · Tests 1 failed / **279 passed (280)** — `responseStates.test.tsx > refuses to send a second question while one is in flight` |
| 3 | Same single failure as run 2 |

No other test failed in any run. See §21 for the investigation of that one test. All 21 test files
and every other one of the 280 tests were green in all three runs.

## 25. TypeScript

```
./node_modules/.bin/tsc --noEmit
exit code: 0, no output
```

PASS.

## 26. Production build

```
./node_modules/.bin/vite build
✓ 112 modules transformed
dist/index.html                 0.95 kB │ gzip:  0.56 kB
dist/assets/index-BSPtm6RR.css 25.74 kB │ gzip:  4.69 kB
dist/assets/index-DnAduIVH.js 277.51 kB │ gzip: 88.05 kB
✓ built in 1.47s
```

PASS.

## 27. Diff hygiene

```
git diff --check           → exit 0, no output (clean)
git diff --stat origin/main → empty (no product/code diff at all)
```

This PR's only change is this evidence file. No unrelated product change is included.

## 28–30. Scope discipline

No App code was changed. No V7 feature, no ranking/recommendation logic, no new filters, no dynamic
cards, and no scholarship/course/accommodation/support/jobs domain-intelligence work was touched, per
the brief's explicit exclusion list. No deployment (Firebase, Cloud Run, or production config) was
performed — §11's production check was read-only (page load + `fetch` status inspection), nothing was
pushed or redeployed.

## 31. PR

This is a **docs/evidence-only PR** — no code defect was found that needed fixing, so no source file
changed. Adding one evidence file is the entire diff.

---

## 32. Final handoff

**Git**
- Branch: `ben/day16-six-domain-release-verification`
- Base SHA: `71c1120501205fa2ee8c5a273de608188f9b7239` (= `origin/main`)
- PR head SHA (current, PR #38 still open): `1b232843c3b4f021fdc2450e2acc9a0339cd938c` — this is the
  branch head as pushed; it is distinct from, and will change if the PR is later merged via, a
  separate merge commit that GitHub creates at merge time. This document records the head as of this
  correction, not a merge commit that does not exist yet.
- Changed files: `docs/evidence/DAY_16_SIX_DOMAIN_RELEASE_VERIFICATION.md` (new) only

**Six-domain navigation**
| Domain | Result |
|---|---|
| Courses | PASS |
| Scholarships | PASS |
| Jobs | PASS |
| Accommodation | PASS |
| Support | PASS |
| Events | PASS |

**Events**
| Check | Result |
|---|---|
| `/events` | PASS |
| Upcoming API consumption (`/api/v1/events/upcoming` only) | PASS |
| Frontend source filtering absent | PASS |
| Frontend Rubric call absent | PASS |
| Null fields (optional-field matrix) | PASS |
| Loading | PASS |
| Empty | PASS |
| Error/unavailable | PASS |
| Source/action links | PASS |
| Launchers (all six) | PASS |

**Responsive**
| Width | Result |
|---|---|
| 360 | PASS |
| 390 | PASS |
| 430 | PASS |
| 1280 | PASS |

**Regression**
- Focused Events/UI: 58/58
- Server: 46/46
- Full suite: 280/280 (run 1); 279/280 (runs 2–3, same known flaky test — §21)
- Response-state isolated result: 8/8, all three times it was run

**TypeScript:** PASS (`tsc --noEmit`, exit 0)
**Vite build:** PASS
**`git diff --check`:** PASS

**Deployment truth**
- Local/current-main Events integration: PASS (mock-transport end-to-end; App-side contract
  compliance code-confirmed)
- Deployed Events availability: **NOT LIVE** — production is a pre-Day-15 pinned build; Events nav
  disabled, old copy present, `/api/v1/events/upcoming` 404s. Expected sequencing, not an App defect.
- No deployment performed by this PR.

**Defects**
- Release-critical App defects found: **none.**
- Fixes made: **none needed** — no App code changed.
- Backend/V7 observations (already known, restated for completeness, not App-owned): raw ISO
  timestamps in chat answer text (§7); unsupported period words silently ignored by RAG (Day 15 §7
  item 2, unchanged, not re-tested since it requires the real RAG service); `status`'s mixed
  semantics remain unfrozen at the contract level, App correctly does not interpret it (§5).
- App-owned, non-blocking observation: the `responseStates.test.tsx` full-suite flake (§21) —
  recommend a small dedicated PR to de-flake it, not a release blocker.
- Deploy-sequencing observation (Qasim-owned, not this PR's to fix): production is running a build
  from before the Day 15 Events merge (§11); the Day 14 board's "stale URL" item is really "stale
  pinned build."

**Final**
- App Day 16 = **GO**
- Six-domain App RC = **GO**
- Deployment = **HOLD** (unchanged — no deployment performed; waiting on coordinated data/RAG
  production gates per the Day 16 brief)
