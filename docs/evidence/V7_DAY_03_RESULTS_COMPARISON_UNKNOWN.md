# V7 Day 3 evidence — result sets, comparison, EMPTY vs UNKNOWN

**Repository:** `askanu-app`. **Owner:** Ben. **Scope:** `docs/v7/DAY_03.md`, App lane, plus
Qasim's Day 3 notes §10 (temporal display), §11 (error/failure UX), §12 (accessibility).
**Branch:** `ben/v7-day3`, from `main` @ `4219676` (Day 2 PR
[#40](https://github.com/u8008916/askanu-app/pull/40), merged).
**Status:** submitted for Qasim's review. PR / head SHA are recorded on the PR itself.

## 0. What the backend actually sends (checked before building)

Checked against `askanu-rag` `main` @ `52e84ac` and Carmen's unmerged
`carmen/v7-day3-retrieval-reasoning` @ `d60dc47` (which changes retrieval only — `models/contracts.py`
is untouched on that branch):

| Day 3 UI concept | On the `/api/v1/ask` wire today? | Where |
|---|---|---|
| Ordered result list | **Jobs only** — `items: CurrentJobItem[]`, server order, ≤ 20 | `job_queries.py:585` |
| ResultSet status `RESULTS/EMPTY/INCOMPLETE` | **No** — in the state schema, but no live path calls `remember_result_set` | `state_transitions.py:250` (uncalled) |
| Answer state `CONFIRMED/DERIVED/PARTIAL/UNKNOWN` | **No** — internal `EvidenceBundle` only | `models/conversation_state.py:485` |
| Comparison output | **No** | — |
| Request field for "the student picked result X" | **No** — `AskRequest` is question / history / state | `models/contracts.py` |
| Event instants | Always ISO-8601 **with offset** (validator rejects others) | `models/records.py:211` |
| Job `closing_date` | Date-only `YYYY-MM-DD` | `models/contracts.py` `CurrentJobItem` |

So: Jobs cards are wired for real; everything else is a shared primitive proven on fixtures and
is not shown to students until the backend sends the signal. No UI pretends a field exists.

## 1. What shipped

**A. One shared result list** — `frontend/src/chat/results/`
- `resultItems.ts` `toResultCards(items)` maps each known wire item shape (`JobItem`,
  `EventItem` — validated with the existing `resources/listResponse.ts` parsers) to one generic
  card (stored identity, title, stored URL, provenance, labelled stored fields). Presentation
  mapping only: no sort, filter, dedupe, rank or eligibility logic. **All-or-nothing:** an
  unrecognised item, mixed domains, a repeated identity, or an event from a source with no
  provenance label → `null` → the turn shows the backend's answer text only.
- `ResultList.tsx` — numbered `<ol aria-label="Results">`, card N = `items[N-1]`; first 5 shown,
  `Show N more` (`aria-expanded`/`aria-controls`) reveals the rest in place without reordering;
  a missing stored field renders `Not published` (never blank, never guessed).
- Wired in `chat/AssistantTurn.tsx` for `ok`/`partial` only. A notice status
  (`insufficient_evidence`/`off_topic`/`error`) never grows a result list.
- Duplicate-text decision (approved in chat before implementation): for `ok`, the backend's
  list text stays on the page, collapsed under **Show as text** (`<details>`). For `partial`,
  the answer stays in full above the cards, because its text carries the caveat.
- Job cards show Type / Location / Classification / Salary / Closes — the same facts RAG's own
  answer text states. Closes = `closing_text` as stored, else the stored date-only
  `closing_date` (as a date, no time). No open/closed verdict is derived.
- Event cards (forward fixture only — see §6) show Starts / Ends / Venue / Organiser plus
  provenance: `events_anu_official` → "Official ANU Events", `rubric_unified_search` →
  "ANU community · via Rubric". A missing venue is `Not published`, never "Online".

**B. Selected-result action (primitive only, not rendered in production).** `ResultList`
accepts an optional `onSelect`; the action emits `{record_id, domain, position}` from stored
identity, never from the title. Accessible name = visible label + context
(`Ask about this: <title>`, WCAG 2.5.3). `AssistantTurn` does **not** pass `onSelect`, so no
button renders for students — there is no request field to carry the identity to RAG (gap
**G1**), and a "Tell me about <title>" composer prefill would be a magic-wording shortcut.

**C. Shared comparison table** — `chat/results/ComparisonTable.tsx`. Moved out of the dev
gallery with two Day 1 bugs fixed: a row with more values than columns crashed
(`entities[index]` undefined), and rows keyed by label collided on duplicate labels. Now:
rows keyed by position; a row whose value count ≠ column count, duplicate column ids, or fewer
than two columns → the table refuses (renders nothing) instead of padding or truncating; `null`
→ `Not published`. Not wired to real turns (no backend comparison output — gap **G2**).

**D. EMPTY vs UNKNOWN.** No wire status exists for EMPTY (gap **G3**), so the App renders no
EMPTY state it would have to infer. Locked by tests instead:
- `insufficient_evidence` keeps "Not enough evidence to answer" and never shows result cards or
  "no results/no matches" wording, even if `items` is non-empty;
- `ok` with `items: []` never renders a "0 results" list;
- **fix:** a notice with an empty `answer` used to show "No response content was returned." It now
  gets status-specific fallback copy — `insufficient_evidence` → "AskANU couldn't confirm this
  from its stored ANU sources…" (reads as unknown, not as no results); `error` → "AskANU
  couldn't complete this answer. Please try again."

**E. §10 temporal display** — `frontend/src/util/formatTemporal.ts` `formatStoredDateTime`:

| Stored value | Shown |
|---|---|
| ISO datetime with offset / `Z` | Canberra wall-clock date + time |
| Date-only `YYYY-MM-DD` | Date **with year, no time** — never `Date.parse`d, so no invented 10:00 am |
| Datetime without offset | Exactly as stored — no timezone invented |
| Impossible date / other text | Exactly as stored |

Used by `resources/UpcomingEventsCard.tsx` (previously `Date.parse` on anything) and the result
adapters. The sidebar's datetime format is unchanged (its `feedPanels` tests pass untouched).

**F. §12 accessibility.** Added a polite `role="status"` region in `ChatPanel` that says
"AskANU replied" when an answer lands — `PendingTurn`'s region unmounts on replacement, so
screen-reader users previously heard "finding an answer" and then nothing. Skipped for `error`
turns (already `role="alert"`); mounted with the first turn so it exists before text is written;
removed on Clear Chat. Day 2 keyboard/focus behaviour unchanged and still covered.

**G. Dev gallery** now renders through the shared `ResultList`/`ComparisonTable`, so mock states
and real turns cannot drift; its duplicated CSS was removed.

## 2. Files changed

New: `frontend/src/chat/results/{resultItems.ts, ResultList.tsx, ComparisonTable.tsx,
Results.module.css}`, `frontend/src/util/formatTemporal.ts`,
`frontend/tests/{v7Day3Results.test.tsx, formatTemporal.test.ts}`, this file.
Modified: `chat/AssistantTurn.tsx` (+ `.module.css`), `chat/ChatPanel.tsx`,
`resources/UpcomingEventsCard.tsx`, `mocks/askResponses.ts` (+2 fixtures),
`dev/mockTransport.ts` (+2 picker scenarios), `dev/v7/responseBlocks.tsx`,
`dev/v7/V7StateGallery.module.css`, `tests/{responseRenderer, v7StateGallery,
responseStates}.test.tsx`. **No `server/` change, no API/schema change.**

## 3. No frontend reasoning, ranking or source filtering

- Order: card N is `items[N-1]`; the test feeds the fixture **reversed** and asserts the cards
  follow it. "Show more" reveals, never reorders.
- Identity: `record_id` from the item; selection payload never reads the title.
- No eligibility/vacancy/open-closed inference; no vector scores rendered (none are sent).
- Source authority: provenance is a fixed label per stored `source_id`; an unknown event source
  refuses the list rather than risk presenting a non-official event as official.
- One engine for all domains — no domain-specific result engine; domains differ only in the
  field-label mapping.

## 4. Tests

| Run | Result |
|---|---|
| Focused — `npx vitest run tests/v7Day3Results.test.tsx tests/formatTemporal.test.ts tests/responseRenderer.test.tsx tests/v7StateGallery.test.tsx tests/assistantTurn.test.tsx tests/feedPanels.test.tsx tests/responseStates.test.tsx tests/conversationState.test.tsx tests/clearChat.test.tsx` | 9 files, **106 passed** |
| Full frontend — `npm test` (in `frontend/`) | 27 files, **359 passed** (was 324 on `main`) |
| Build — `npm run build` (`tsc --noEmit && vite build`) | passed |
| Server — `npm test` (in `server/`) | **50 passed**, 0 failed |
| `git diff --check` | clean |

New coverage (35 tests): adapter order/identity/refusal cases; Jobs list render, Show more,
collapsed text, Sources kept, no production select button, partial caveat kept; Events
provenance + missingness; Accommodation (no items) stays text-only; malformed items → text, no
`[object Object]`; EMPTY vs UNKNOWN wording; empty-answer fallbacks; selection payload + keyboard
operation; comparison missingness / duplicate labels / mismatched rows / single column; answer
announcement and no double-announce on error; six temporal cases.

**Pre-existing flake fixed:** `responseStates` "refuses to send a second question while one is in
flight" failed on clean `main` under full-suite load (per-key typing outlasted the mock's 350 ms
latency, so the answer arrived before the assertion). The in-flight entry is now a paste; the
assertion is unchanged.

**Timezone note (honest limit):** `TZ=America/Los_Angeles` is ignored by Node on this Windows
host (it still resolves `Australia/Sydney`), so no test run proves browser-zone independence by
execution. It holds by construction: both formatters set an explicit `timeZone`, and date-only
values never pass through `Date.parse`.

## 5. §11 error/failure UX — verification matrix

| Case | Behaviour | Evidence |
|---|---|---|
| Transport/network failure | Previous state preserved; "AskANU could not be reached. Please try again."; conversation not cleared | `conversationState.test.tsx` "preserves the last authoritative state through a transport failure…"; browser `reject` scenario |
| App-side 413 | Controlled message; not forwarded; no truncation | `server/tests/ask.test.js` 262,144 / 262,145 boundary tests (Day 2) |
| RAG-authored error with state | Replaces held state | `conversationState.test.tsx` "a genuinely RAG-authored error…" |
| Clear Chat | Full reset incl. new answer announcement | `clearChat.test.tsx`, `conversationState.test.tsx`, new announcement test |
| Malformed response / items | Safe generic error, or answer text with no cards; no raw objects, stack traces or `request_id` | `askApi.test.ts` (non-JSON, off-enum, bad source), new malformed-items + empty-error tests; browser `error`/`reject` checked for `[object`/`stack`/`req_` |

## 6. Browser verification (mock transport, real chat shell)

Dev server with `VITE_USE_MOCK_TRANSPORT=1` (temporary, gitignored env file, removed after),
FixturePicker scenarios, desktop 1280×900 and mobile 375×812:
- `ok — jobs result cards (V7 Day 3)`: heading "7 results", cards 1–5 in fixture order, `Show 2
  more` (`aria-expanded=false`, controls the list) → 7 cards A…G, `Show fewer`; role C Closes
  "Thu, 15 Jan 2099" (date-only fallback, no time); role F Closes "Not published"; "Show as
  text" collapsed; Sources present; zero "Ask about" buttons; status region "AskANU replied".
- `ok — events result cards (forward fixture)`: event A "Official ANU Events", Starts "Mon, 2 Mar,
  10:00 am"; event B "ANU community · via Rubric", Ends/Venue/Organiser "Not published".
- `insufficient_evidence`: notice only, no cards, no "no results" wording.
  `ok — accommodation`: text only. `error` / `transport failure`: alert with safe copy, no
  `req_` id or object text; status region empty (no double announce).
- Mobile 375: no page horizontal scroll, no card element past the viewport, `Show more` and
  "Show as text" are 44 px tall. Fixed during verification: the title's external-link icon
  wrapped under short titles (global block-SVG reset) — now inline.
- Desktop: cards render inside the left chat column; shell, sidebar, Clear Chat unchanged.
- Console: no errors from chat rendering. The only errors seen were `/api/v1/jobs/current` and
  `/api/v1/events/upcoming` 500s from a first server start before the mock env file was in the
  repo-root `envDir`; after restart no `/api` request is made. The Events sidebar shows
  "unavailable" by design (`dev/mockFeeds.ts` default).
- Production bundle: shared result strings present; fixtures, scenario ids and the dev picker
  absent.

## 7. Contract gaps handed to Qasim (not solved here)

| ID | Gap | Owner | App status |
|---|---|---|---|
| **G1** | No request field to send a selected result identity (`result_set_id`/`record_id`/position) to RAG | Carmen / Qasim | Primitive + tests ready; button hidden |
| **G2** | No comparison output on the ask wire | Carmen | Table primitive + tests ready; unwired |
| **G3** | No wire `answer_state` or ResultSet `status`, so App cannot render a distinct EMPTY or INCOMPLETE state; live path never records `result_sets` | Carmen | Unknown/abstention wording locked; EMPTY not inferred |
| **G4** | Chat Events answers carry `items: []` — Events cards cannot appear in chat | Carmen | Forward fixture proves the shared list renders them |
| **G5** | Only Jobs sends `items`; Scholarships/Accommodation/Support discovery answers are text | Carmen | Text-only render asserted |

## 8. Do-not-cross lines — status

- No independent sort/rerank — **held** (reversed-input test).
- No eligibility/vacancy inference — **held**.
- UNKNOWN not styled/worded as no results; EMPTY not styled as evidence failure — **held**
  (EMPTY is not rendered at all without a backend signal).
- No vector scores — **held**.
- No domain-specific duplicate result engines — **held** (one `ResultList`, one adapter entry).
