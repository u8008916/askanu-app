# V7 Day 4 — Accommodation vertical, real integration

**Date:** 2026-09-27
**Branch:** `ben/v7-day4`, from `main` @ `ee3d489` (PR #41) + PR #42 (yesterday's verify-and-lock)
**RAG PR reviewed:** `askanu-rag` PR #38, `carmen/v7-day4-accommodation-vertical`, tip `3c8e35e` — **open, not yet merged to `askanu-rag` main**

## 0. Why this supersedes yesterday's evidence doc

Yesterday (`docs/evidence/V7_DAY_04_ACCOMMODATION_VERTICAL.md`) `askanu-rag` `main` @ `54d75f4` sent no Accommodation `items`, comparison payload, `answer_state` or selected-result field — building cards would have invented wire data, so that day's App work was verify-and-lock plus a gap table (G1–G9).

Today, Qasim relayed that RAG PR #38 closes G1/G2/G3/G5/G7 (still open PR, not on `askanu-rag` main). **I independently verified every field and behavior claim below by reading the branch's own `models/contracts.py`, `models/conversation_state.py`, `resource_queries.py`, `result_paging.py`, `main.py`, and its 1129-line test file** — not by trusting the relayed description. One correction surfaced in that reading: the relayed message cited head `181e875`, but the actual branch tip was already `3c8e35e` — a cursor-integrity fix Qasim himself had asked for was already landed, ahead of what the message described.

Given that, and per the user's confirmed scope decision (27 Sep), today's work is **real integration**, not further verify-and-lock: the App now consumes PublicResultItem/PublicComparisonItem cards, `qualifying_evidence`, a real comparison table, structured `selected_result`/`clarification_selection`/`result_page` requests, and a real "Apply now" action. Yesterday's doc stays as the historical record of the pre-#38 wire state; its gap table (G1–G9) is superseded below.

## 1. The real contract (verified against branch tip `3c8e35e`)

`AskResponse` gains (siblings of the existing envelope; `conversation_state` stays fully opaque, unchanged — none of this is nested inside it):

| Field | Shape | Notes |
|---|---|---|
| `answer_state` | `"CONFIRMED"\|"DERIVED"\|"PARTIAL"\|"UNKNOWN"\|null` | Always populated for Accommodation; null/absent elsewhere |
| `actions` | `[{type:"application", label, url, record_id, source_id}]` | Only from a stored, validated `application_url`; can appear on `insufficient_evidence` |
| `result_page` | `{result_set_id, start_ordinal, returned, has_more, next_ordinal: number\|null}\|null` | Present for a discovery page or continuation |
| `items[n].type` | `"result"\|"comparison"\|"job"` | Discriminated union; Jobs' addition is purely additive (verified: `parseJobItem` destructures named fields only) |
| `PublicResultItem.fields` | 7 fixed keys: `category, location, catering_options, advertised_rate, cost_period, audiences, features` | Only non-null keys populated by RAG; App renders all 7 always, `null` → "Not published" |
| `qualifying_evidence` | `{type:"room_rate", room_name, rate, cost_period, contract, inclusions, other_fees}\|null` | One named room's rate proved a price match — never affordability/cheapest/vacancy/obtainability |

`AskRequest` gains (top-level siblings of `conversation_state`, independently optional):

| Field | Shape | Behavior |
|---|---|---|
| `selected_result` | `{result_set_id, canonical_id, ordinal}` | Must exactly echo a card's own identity; RAG revalidates, 400s on mismatch |
| `clarification_selection` | `{clarification_id, option_ids}` | Bypasses free-text re-parsing entirely when present |
| `result_page` | `{result_set_id, start_ordinal, limit<=5}` | Bypasses natural-language "show more"; must equal the server's own cursor |

All three reject generically (HTTP 400, the same safe envelope) on staleness/foreign-identity/tamper — the App never sees a structured reason.

## 2. Design corrections made during review (Plan-agent review, 27 Sep)

1. **`ResultSelection` (`resultItems.ts`) was left byte-for-byte unchanged.** It's a pre-existing, already-tested primitive (`tests/v7Day3Results.test.tsx` asserts its exact shape `{record_id, domain, position}`). Reshaping it to `{result_set_id, canonical_id, ordinal}` would have been a gratuitous breaking change to an unrelated test. Instead, `ResultCardModel` gained three new **nullable** fields (`resultSetId`, `canonicalId`, `ordinal`); `AssistantTurn` looks the clicked card back up by `recordId` and only builds `selected_result` when all three are non-null — which is also exactly how Jobs/Events naturally keep no "Ask about this" button.
2. **`ComparisonTable.tsx` needed no change** — already a fully generic, tested primitive. All new work is in the adapter producing its `columns`/`rows`.
3. A `type:"comparison"` item anywhere in `items` nulls out `toResultCards`; `toComparisonModel` only succeeds for exactly one comparison item — cards and a table are mutually exclusive by construction.

## 3. Confirmed UX decisions (user, 27 Sep — all recommended options)

1. **Prefill + attach-only-if-unchanged**: a card's "Ask about this" or the clarification "Use selection" still only prefills the composer (interaction model unchanged). The structured payload (`selected_result`/`clarification_selection`) is attached to the outgoing request only if the student sends the prefill text unedited; an edit drops it and falls back to a plain free-text send. Implemented as a pure function, `chat/structuredPrefill.ts`'s `resolveStructuredPayload`, unit-tested directly (`tests/structuredPrefill.test.ts`).
2. **"Show more" sends a new turn**: clicking it (when `result_page.has_more`) sends `"Show more results"` + the exact server cursor as a direct action — no composer step at all, reusing the existing send pipeline verbatim. The next page renders as a new assistant turn below the current one.
3. **No new UI for `answer_state`** beyond rendering `actions`: `answer_state` is parsed and typed (for future use) but drives no new badge/heading. `insufficient_evidence` already renders neutrally (info icon, no red, backend text visible), which already satisfies "useful unknown, not styled as error."

## 4. Files changed

- **`frontend/src/types/api.ts`** — new `AnswerState`, `ResponseAction`, `ResultPage`, `PublicRoomRateEvidence`, `PublicResultItem`, `PublicComparisonItem`, `PublicJobItem`; `AskResponse` gains `answer_state?`, `actions?`, `result_page?`; `AskRequest` gains `selected_result?`, `clarification_selection?`, `result_page?`. `items` stays `unknown[]` (deep validation stays in the adapter layer).
- **`frontend/src/chat/askResponse.ts`** — parses `answer_state`/`actions`/`result_page`; `actions` degrades to `[]` when absent (keeps every pre-#38 fixture passing); a malformed entry in any of the three rejects the whole envelope (same rule as `sources`).
- **`frontend/src/chat/results/resultItems.ts`** (core of the change) — `type`-first item classification (`'result'`/`'comparison'`/`'job'`/untyped-legacy-fallback); `parsePublicResultItem`/`publicResultCard` (7-field mapping, `qualifying_evidence`); new `toComparisonModel` (cell lookup by `record_id`, never array position; `not_published`→`null` defensively even against an inconsistent `state`/`value` pair).
- **`frontend/src/chat/results/ResultList.tsx`** + `Results.module.css` — renders `qualifyingEvidence` as a muted line, never a "confirmed" badge; new optional `resultPage?`/`onShowMorePage?` props that fully replace the local reveal toggle for a paged list, otherwise byte-identical to Day 3.
- **`frontend/src/chat/ResponseActions.tsx`** (new) + `.module.css` — renders `actions` as safe (`isSafeHttpUrl`-gated) links; visual pattern ported from `dev/v7/responseBlocks.tsx`'s `UnknownWithNextAction` (gold-tint, non-alert); rendered in both the notice and answer branches of `AssistantTurn`.
- **`frontend/src/chat/AssistantTurn.tsx`** — comparison rendering; `onSelect` wired to `ResultList` only when every card carries the full identity triple; `handleCardSelect` builds `{prefillText: "Tell me more about <title>", selected_result}`; `ClarificationOptions.onSelect` gained an additive second argument (`{clarification_id, option_ids}` in backend order).
- **`frontend/src/chat/structuredPrefill.ts`** (new) — the prefill-pairing pure function, extracted for direct unit testing.
- **`frontend/src/App.tsx` / `ChatPanel.tsx`** — new `pendingStructuredPrefillRef`; `handleSend` resolves the structured payload via `resolveStructuredPayload`; new `handleSelectResult`/`handleShowMorePage`; threaded through `ChatPanel` to `AssistantTurn`.
- **`frontend/src/chat/useChatSession.ts`** — `sendMessage(rawText, structured?)`; the three new fields spread into the outgoing `AskRequest` only when present.
- **`frontend/src/dev/v7/responseBlocks.tsx`** — one-line fix (`ResultCardModel`'s 4 new fields set to `null`) to keep the (out-of-scope, unrelated) dev-gallery prototype compiling; nothing else in `dev/v7/` touched.
- **Mocks** — 4 new forward fixtures (`okAccommodationResultsResponse`, `okAccommodationResultsPageTwoResponse`, `okAccommodationCompareItemsResponse`, `insufficientAccommodationVacancyWithActionResponse`), doc-commented as shaped to PR #38 tip `3c8e35e`, transcribed from the branch's own test file, not guessed. Yesterday's empty-`items`/no-`actions` fixtures kept as narrower fallback-path fixtures with corrected doc comments.
- **No `server/` change, no `askanu-rag` change, no change to this repo's `docs/API_CONTRACT.md`** (left un-synced until PR #38 actually merges, so this repo's own doc doesn't overclaim an unmerged contract as frozen).

## 5. Tests

| Run | Result |
|---|---|
| Focused (8 files) — `v7Day4Accommodation`, `v7Day3Results`, `accommodationPage`, `clearChat`, `conversationState`, `clarificationLifecycle`, `assistantTurn`, `structuredPrefill` | 122 passed |
| Full frontend — `npm test` | 29 files, **393 passed** (was 375 yesterday) |
| Build — `tsc --noEmit && vite build` | passed |
| Server — `npm test` | 50 passed (unchanged) |
| `git diff --check` | clean |

New coverage highlights: `type:"job"` proven purely additive (byte-identical cards vs. untyped); real `PublicResultItem`/`PublicComparisonItem` parsing incl. the fixed 7-key field map, `qualifying_evidence`, and cell lookup by `record_id`; a mixed comparison+result `items` array refused by both adapters; `selected_result`/`clarification_selection`/`result_page` exact wire shapes locked via `useChatSession` + scripted transport; the prefill-pairing rule (attach-if-unchanged, drop-if-edited) unit-tested directly; hostile strings in the new `fields` dict, `qualifying_evidence`, comparison cells and an action `label` all proven to render as text only, never executed.

## 6. Golden journey (browser, mock transport shaped to PR #38's own test file — no live RAG server; still Cloud-SQL-backed with no local-file loader, same constraint as yesterday)

Desktop 800×600, `VITE_USE_MOCK_TRANSPORT=1`:

1. **Discovery** — 2 cards, all 7 fields in fixed order, card B shows "Not published" for unpopulated fields and a distinct "Matched room: Standard — $380.00 (2027 Indicative costs), 44 weeks, Internet included, Refundable Deposit: $1,300" line; both cards show "Ask about this"; "Show more" present (`has_more: true`).
2. **Ask about this** — composer prefilled with "Tell me more about Placeholder residence record title A", not sent; sending it unedited round-tripped cleanly.
3. **Compare** — a real `<table>` renders: columns in backend order, "Not published" for the missing cell, prose collapsed under "Show as text"; no cards, no duplicate "Ask about this".
4. **Vacancy + action** — "Not enough evidence to answer" (info icon, no red), backend text verbatim, a real gold-tint "Apply now" `<a href="https://example.invalid/placeholder-apply" target="_blank" rel="noopener noreferrer">` renders below Sources.
5. **Show more** — clicking it (switching the mock scenario to the terminal page first) sent a new user turn "Show more results" and rendered page 2 (1 card, "Placeholder residence record title C") as a new assistant turn with no further "Show more" button (terminal); the composer was untouched throughout.
6. **Console**: no errors. **Mobile (375×812)**: qualifying-evidence text wraps cleanly, no horizontal overflow.

## 7. No frontend reasoning / source filtering / reorder (re-affirmed)

- No price, catering, vacancy or affordability verdict is computed anywhere — `qualifying_evidence` is rendered as the backend's own evidence, explicitly never framed as a "confirmed"/positive badge.
- Comparison cells are looked up by `record_id`, never array position, and a `state`/`value` mismatch resolves toward "not published," never toward trusting an inconsistent flag.
- `actions[].url` is still checked with `isSafeHttpUrl` at render time despite the contract's own validation claim — this codebase's security baseline doesn't trust a server URL claim blindly for any field, including this new one.
- `selected_result`/`clarification_selection` carry exact backend ids/ordinals, never a title or a locally-computed index.
- `result_page` is sent back exactly as the server's own cursor; the App never invents a different `start_ordinal`.

## 8. Known accepted edge case

Two *separate* turns that happen to render the same `result_set_id`'s first page (e.g. the same discovery question asked twice in one session) each hold their own `pageRequested` flag: clicking one's "Show more" consumes only that turn's button, so the other turn's now-stale button is still clickable and will 400 if clicked — expected and safe, not a client-side bug. This is the one remaining shape of the class of bug fixed in §10; noted in code so it isn't "fixed" later with unneeded complexity for a rare, safely-failing case.

## 9. Status

Per Qasim: **do not merge yet** — Day 3 is formally still open on his side (production Course embedding blocked on Gemini API quota), and RAG PR #38 is itself still open/unreviewed as a formal GitHub review. This branch is ready for his independent Day 4 App acceptance once both close.

## 10. Fixes from Qasim's review of `2a7914a` (PR #42 comment, 27 Sep)

Qasim's follow-up review (correctly against `2a7914a`, not the earlier `1161d09`) found one real client-visible bug and requested two smaller changes:

1. **Ordinal display bug (fixed).** `ResultList.tsx`'s `ResultCard` always rendered `index + 1` as the visible card number, so a server-paged page 2 visually renumbered the backend's results back to 1, 2, ... instead of showing their real `card.ordinal` (e.g. 3, per the page-2 mock fixture). The *structured* identity (`selected_result.ordinal`) was never wrong — `AssistantTurn`'s `handleCardSelect` already reads `card.ordinal` off the looked-up card, independent of the rendered index — this was purely a display bug. Fixed by computing a separate `displayNumber` (`card.ordinal` when the list is server-paged and the card has one, `index + 1` otherwise, so non-paged Jobs/Events cards — which never carry an `ordinal` — are unaffected). New regression test: `tests/v7Day4Accommodation.test.tsx` — *"displays the backend ordinal on a paged list, not the visual index — page 2 shows '3', not '1'"* — proves page 2 shows "3", not "1".
2. **Stale "Show more" button (fixed).** Page 1's own "Show more" button stayed clickable after it had already been used to fetch page 2, and a second click would resend the same (now-superseded) cursor and safely 400. `ResultList` now tracks a local `pageRequested` flag, set on click, that hides that instance's own paged "Show more" button once used — independent of whether the fetched page turned out to be terminal. The existing "Show more" test was updated: it now asserts **no** "Show more" button remains after the click (previously it asserted exactly 1 remained — page 1's — reflecting the pre-fix behavior). §8 above narrows the remaining known-safe edge case to two independent turns sharing one `result_set_id`.
3. **`items: unknown[]` boundary (documented + regression test, no behavior change).** Added an explicit doc comment on `AskResponse.items` (`types/api.ts`) naming `chat/results/resultItems.ts` as the deep-validation boundary and telling future readers not to narrow the type or read the field directly elsewhere — the documentation option Qasim offered as an alternative to strengthening the response-boundary type itself. Per his explicit follow-up ("either... or... and add a regression test"), also added *"a malformed Day 4 item (bad ordinal/qualifying_evidence type) refuses the whole list and renders no card or select action"* (`v7Day4Accommodation.test.tsx`): a `PublicResultItem` with a string `ordinal` or an incomplete `qualifying_evidence` object, mixed with an otherwise-valid item, proves `toResultCards` refuses the *whole* list (never drops just the bad one), and that this leaves no card, no "Ask about this" button, and — since `onSelectResult` is asserted never called — no way for a malformed item to reach `selected_result`/`clarification_selection` at all.
4. **PR description.** Updated to describe the current head (`2a7914a` → this fix) rather than the stale "verify + lock + gaps" wording from before real integration landed.

Fresh counts after these fixes: frontend `npm test` — 29 files, **395 passed**; `tsc --noEmit && vite build` — passed; server `npm test` — 50 passed (unchanged); `git diff --check` — clean.
