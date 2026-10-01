# V7 Day 5: Courses + Scholarships

**29 Sep 2026: real integration against Carmen's published Day 5 RAG `0efb6ee98f1d364a26edb74d60729d21af3debc3`.** Sections §8–§15 are the Day 5 checkpoint. §0–§7 below them are the 28 Sep pre-contract record, kept unchanged as history.

**App branch:** `ben/v7-day5`, restacked 29 Sep onto App `main` `28dbb8bb41026f243ff80bb8622ff2f111671e01`. That is the squash-merge of the accepted Day 4 checkpoint `70b7da28f0f39fbe27bd9234937d10e27d933a58` (PR #42). The two pre-contract commits carry over unchanged in content, with the same diff as `70b7da2..f653ff1`.

---

## Pre-contract record (28 Sep, historical)

**Date:** 2026-09-28
**Branch:** `ben/v7-day5`, stacked on the final Day 4 App head `70b7da28f0f39fbe27bd9234937d10e27d933a58` (PR #42, left untouched)
**RAG wire reviewed:** `askanu-rag` `d349e8870715709fa034d57d902da4bec6dd5d34`. This is Carmen's final Day 4 head. **No Day 5 RAG branch or PR has been published yet**, so it is the only backend available, and it is *not* a Day 5 contract.

## 0. Scope agreed for this checkpoint

Qasim (28 Sep): proceed now with the work that doesn't need Carmen to freeze new semantics. That means:

- an inventory of the existing wire
- domain-gating Accommodation-specific rendering
- a Day 5 backend-gap matrix
- guards, tests and browser/accessibility evidence that don't depend on a contract

It explicitly excludes:

- any speculative `CourseItem`/`ScholarshipItem` type, discriminator, eligibility field, result state or comparison field
- parsing prose into structure

Once Carmen publishes a Day 5 SHA, I'll diff it against `d349e88` and do the real integration from that exact SHA.

## 1. Existing-wire inventory at `d349e88`

Sources: `models/contracts.py`, `course_queries.py`, `hybrid_queries.py`, `scholarship_queries.py`, `resource_queries.py` and `main.py` at that SHA, plus their tests.

**Public response envelope.** `ResponseBody` is `answer`, `items`, `answer_state`, `actions`, `result_page`, `sources`, `request_id` and `conversation_state`. The only item types are `PublicResultItem`, `PublicComparisonItem` and `PublicJobItem`. `PublicResultItem.fields` is an untyped `dict[str, str | list[str] | None]` with **no labels**. There is no result-status field (RESULTS/EMPTY/INCOMPLETE) anywhere on the wire.

**Who emits what:**

| Path | `items` | `answer_state` | `actions` | `result_page` | `selected_result` accepted |
|---|---|---|---|---|---|
| Accommodation (`resource_queries`) | `PublicResultItem`/`PublicComparisonItem`, only for `AccommodationRecord` | yes | yes (application) | yes | yes |
| Support (`resource_queries`) | none | yes | no | no | yes (the `main.py:241` guard allows `ACCOMMODATION`/`SUPPORT` result sets) |
| Courses (`course_queries`, `hybrid_queries`) | none | none | none | none | no |
| Scholarships (`scholarship_queries`) | none | none | none | none | no |

**Courses (what the App receives today):**

- **Prerequisite lookup:** `ok` with an answer and one source. The source is `record_id: courses:course:<CODE>_<YEAR>` with `source_id: courses_programs_and_courses`.
- **Course code stored for several academic years:** `needs_clarification`, with id `clar-course-<code>-academic-year`, type `entity_selection`, option `id` = the exact stored `record_id`, and labels like `CODE (YEAR)`.
- **Prerequisites not established:** `insufficient_evidence` ("…does not establish its prerequisites"), keeping the source.
- **Code not found:** `insufficient_evidence` with no sources.
- **Semantic/hybrid discovery:** `ok` with an answer and sources, or `insufficient_evidence`/`needs_clarification`. No items.
- **Follow-ups** ("What are its prerequisites?"): resolved by RAG from the opaque `conversation_state`. The App sends the question and the state unchanged.

**Scholarships (what the App receives today):**

- **Discovery/filters:** `ok`, with a prose answer of one section per record (up to 20). Each section reads `"<title>. Official status: …; Study level: …; Area of study: …; Value: …; Closing date: <raw stored string>"`, plus one source per record (`scholarships:scholarship:<slug>`, `scholarships_anu_finder`).
- **"Am I eligible?":** the same `ok` prose, prefixed with the fixed sentence "I can show official requirements, but I cannot determine your personal eligibility." and adding "Official eligibility information: …". There is no eligibility semantic on the wire.
- **Single-fact lookup:** `ok` "`<title>. <Label>: <value>.`", or `insufficient_evidence` when the fact isn't stored.
- **Ambiguous scope:** `needs_clarification`, with id `clar-scholarship-scope`, type `scholarship_selection`, option `id` = stored `record_id`, and labels like `<title> — <entity_id>`. "first"/"second" are resolved by RAG **only against that pending clarification**.
- **No match:** `insufficient_evidence`, with no sources.

## 2. Domain-gating change (the only production `src/` change)

**Problem.** `resultItems.ts` hard-coded Accommodation's 7 field labels as *the* `PublicResultItem` field set, regardless of `domain`. A frozen-contract `PublicResultItem` from another domain would have gone wrong in two ways:

- With empty `fields`, it would render "Category / Catering / Advertised rate … : Not published" on a scholarship. That is misleading.
- With an Accommodation key (e.g. `catering_options`), it would be accepted and labelled as Accommodation data.

A `room_rate` `qualifying_evidence` was also accepted on any domain.

**Fix** (`frontend/src/chat/results/resultItems.ts`):

- The field labels are now keyed by domain (`PUBLIC_RESULT_FIELD_LABELS_BY_DOMAIN`), and only `accommodation` has an entry, because that's the only key set RAG has frozen (`_PUBLIC_ACCOMMODATION_FIELDS`).
- A `type:"result"` item from any other domain:
  - with empty `fields`: renders as a card with the title, stored link and identity, and **no field rows**.
  - with **any** `fields` key: the whole list is refused, and the turn falls back to the backend answer and sources. The App has no frozen label for that key, and inventing one is exactly what Day 5 forbids.
  - with `room_rate` `qualifying_evidence`: refused. This is an Accommodation-only semantic.
- Accommodation is byte-for-byte unchanged: all 7 fixed rows, same order, `qualifying_evidence` as before.
- `PublicComparisonItem` needed no change. Its row labels come from the backend (`PublicComparisonField.label`), so it's already domain-neutral, and cells are still resolved by `record_id`.

**Also:**

- `ResultList.tsx` no longer renders an empty `<dl>` when a card has no field rows.
- A doc comment that said result items exist for "Accommodation/Support today" now says Accommodation only, which is what `d349e88` actually emits.

## 3. Other changes (non-production)

- **Fixtures:** `frontend/src/mocks/askResponses.ts` has 7 new ones shaped to `d349e88`: `okCourseFactResponse`, `needsCourseYearClarificationResponse`, `insufficientCoursePrerequisitesResponse`, `okScholarshipDiscoveryResponse`, `okScholarshipEligibilityResponse`, `needsScholarshipScopeClarificationResponse`, `insufficientScholarshipFilterResponse`.
  - The identity formats, clarification ids/types and fixed answer templates come from RAG's code and tests. Titles, values and dates are placeholders.
  - The pre-V7 `needsScholarshipClarificationResponse` (generic `entity_selection`) is kept for its existing tests. It is **not** the real Scholarship clarification shape, which is recorded on the new fixture.
- **Dev mock scenarios:** `frontend/src/dev/mockTransport.ts` registers those 7 as scenarios. It's dev-only; the production bundle was grep-checked and contains no Day 5 fixture strings.
- **Tests:** `frontend/tests/v7Day5CoursesScholarships.test.tsx` adds 16 tests:
  - 8 domain-gate tests. 4 of them were checked to **fail on the pre-change `resultItems.ts`/`ResultList.tsx`** and pass after it, so they really test the gate.
  - 3 Course-wire locks: a fact is conversational (one source, no cards or table); the year clarification sends the exact option `record_id`; an unestablished prerequisite is a neutral unknown, not "no prerequisites".
  - 5 Scholarship-wire locks: discovery prose shows every source with no cards and no App-authored eligible/recommended/best-match wording; the stored closing date is shown exactly as sent, with no invented time and no "Closed"; "am I eligible?" shows the backend's non-determination sentence verbatim with no badge; `scholarship_selection` sends the exact stored `record_id`; no match is neutral, not "No scholarships found" and not an error.

No `server/` change, no `askanu-rag` change, and no request-size or `conversation_state` handling change.

## 4. Day 5 backend-gap matrix

Qasim's Day 5 checkpoint list, checked against the `d349e88` wire. "Producer has it" means the stored record model (`models/records.py` `CourseMetadata`/`ScholarshipMetadata` at `d349e88`) has a field for the fact where the source provides it. For those rows the gap is in what RAG exposes publicly (Carmen/API). This column says nothing about source completeness or producer release-readiness, which is Will's evidence gate (see the note below the table).

| # | Day 5 experience | Supported on `d349e88` wire? | What's missing | Producer has it? | Owner |
|---|---|---|---|---|---|
| D5-G1 | Course fact answer | **Yes**: concise prose + one source | none | — | — |
| D5-G2 | Course entity summary ("Tell me about COMP1110") | **No**: prose only | a structured entity-summary payload (code, title, units, prerequisites, academic year, description), plus labels, or a frozen per-domain `fields` key set with labels | yes: `course_code`, `academic_year`, `units`, `description`, `prerequisites`, `career`, `offerings`, … | Carmen |
| D5-G3 | Course comparison | **No**: no `PublicComparisonItem` for Courses | Course comparison items (backend-authored dimensions and labels, `record_id`-keyed cells, `not_published` state) | yes (units, prerequisites, …) | Carmen |
| D5-G4 | Course academic year as version info | **Only in prose/clarification labels** | a structured `academic_year` value if a summary/card shows it (must not be typed as a date/time) | yes: `academic_year` | Carmen |
| D5-G5 | Scholarship result set (cards) | **No**: one prose section per record, no `items` | Scholarship `PublicResultItem`s with a public `result_set_id`/`ordinal`, plus a frozen, labelled `fields` key set (value, study level, status, closing date, …) | yes: `value`, `study_level`, `status`, `closing_date`, `area_of_study`, … | Carmen |
| D5-G6 | Scholarship selected result ("the second one") | **No** structured path: `selected_result` is refused unless the result set is Accommodation/Support (`main.py:241`). "first"/"second" work only against a pending `scholarship_selection` clarification | Scholarship result sets eligible for `selected_result`; items carrying `result_set_id`/`canonical_id`/`ordinal` | n/a (RAG state) | Carmen |
| D5-G7 | Scholarship uncertainty ("why it may be relevant" / "what still needs checking") | **No**: only the fixed non-determination prefix sentence in prose; no public `answer_state` for Scholarships | a structured epistemic payload: per-criterion matched / unknown / not-published, and/or `answer_state` (`PARTIAL`/`UNKNOWN`) for Scholarship answers | partly: `eligibility` text, `student_type`, `study_level`, `area_of_study`; the match judgement itself is RAG reasoning | Carmen |
| D5-G8 | Scholarship comparison | **No** | Scholarship `PublicComparisonItem`s (value, deadline, study level, criteria summary; missing = `not_published`, never false) | yes | Carmen |
| D5-G9 | Scholarship date state (deadline / open status) | **Only as raw stored strings inside prose** ("Closing date: 2026-10-31", "Official status: open") | typed `opening_date`/`closing_date` values that say whether each is date-only or an offset datetime, so the App's existing safe formatter can render them; the official status as a field, not prose | yes: `opening_date`, `closing_date`, `status` | Carmen |
| D5-G10 | Scholarship continuation ("Any more?") | **No** `result_page` for Scholarships (Accommodation only, `main.py:301`); up to 20 records all go into one prose answer | server-cursor paging for Scholarship result sets, if product wants it | n/a | Carmen |
| D5-G11 | RESULTS / EMPTY / INCOMPLETE status (old G3) | **No** result-status field anywhere on the wire; "no scholarship match" arrives as `insufficient_evidence` | a public result-status semantic, so an empty result can be told apart from unknown | n/a | Carmen |

**Ownership note (wording corrected 28 Sep, per Qasim's review):**

- **No missing scraper field is behind any gap.** No currently identified D5 public-wire gap is caused by a missing scraper field required for the planned UI.
- **Record fields are already represented.** The source-backed record fields needed for the proposed summaries and cards are already represented where the source provides them.
- **The remaining semantics are RAG-owned.** ResultSet, comparison, uncertainty (matched vs unknown criteria), selection, continuation and result-status semantics are RAG/product semantics, not producer facts, and they remain RAG-owned.
- **Compatibility still needs a cross-check.** Final producer/consumer compatibility still requires Will and Carmen to cross-check at the published Day 5 SHA.

These rows are **App wire gaps**, not scraper gaps. This document does not claim the Scholarship producer/source side is release-ready. At the time of writing, Will's Day 7 producer posture records:

| Domain | Producer posture |
|---|---|
| Courses | GREEN |
| Accommodation | GREEN |
| Support | GREEN |
| Scholarships | BLOCKED, on a documented external-canonical redirect |
| Jobs | FALLBACK_LAST_KNOWN_GOOD; exhaustive queries INCOMPLETE_POPULATION |
| Events | BLOCKED, on official-snapshot reconciliation and Rubric request-contract/live-denominator evidence |

Final source/canonical acceptance stays with Will's evidence gate.

The App will not emulate any of these rows. Until Carmen publishes a contract, each row renders as the backend's prose, sources and clarification, exactly as locked in §3. Once her Day 5 SHA exists, each row gets re-marked CLOSED / PARTIAL / STILL OPEN / CONTRACT CHANGED against it.

## 5. DOM/layout/browser-runtime verification (screenshots unavailable)

**This is not full visual/browser acceptance.** The browser pane couldn't draw, so there are no screenshots. Evidence comes from DOM/text inspection and layout measurement of the running app.

Proper visual browser acceptance is still owed once the real Day 5 integration exists, especially for:

- Course summary
- Scholarship cards
- comparison
- UNKNOWN/PARTIAL messaging
- mobile

Setup: dev server with mock transport (`VITE_USE_MOCK_TRANSPORT=1` in a git-ignored env file, deleted afterwards).

- **Desktop journey (1280×720), one conversation:**
  1. Course fact → concise answer + "Sources (1)".
  2. "Tell me about PLAC1110" → year clarification with 2 options.
  3. Choosing "PLAC1110 (2026)" → prefilled the composer, did **not** auto-send.
  4. Sent it unedited → "Not enough evidence to answer" with the backend text and its source.
  5. Scholarship discovery → two prose sections + 2 sources, raw `Closing date: 2099-10-31` unchanged.
  6. "Am I eligible…" → the backend non-determination sentence verbatim.
  7. Scholarship scope clarification → 2 options labelled `<title> — <entity_id>`.
  8. No-match → neutral "Not enough evidence to answer".

  Across the transcript: 0 `role="alert"` elements, 0 result lists, 0 tables, no App-authored eligibility or recommendation wording, and no horizontal overflow.
- **Mobile (375×812, mobile emulation):** `scrollWidth` = 375 (no horizontal overflow), and no element inside `main` extends past the viewport. Clarification option buttons are 294×49 px and 294×69 px, all above the 44 px touch target.
- **Accessibility:**
  - Clarification options are native `<button>`s, so they're keyboard-operable.
  - Result cards (Accommodation) keep their contextual "Ask about this: <title>" name.
  - Unknown states use the neutral notice, never `role="alert"`.
  - A non-Accommodation card no longer leaves an empty `<dl>` for screen readers.
- **Console:** no React warnings.
  - The only errors are the sidebar's `/api/v1/jobs/current` and `/api/v1/events/upcoming` failing because no local RAG server was running.
  - These are recorded as **environment/local-backend errors, not a Day 5 regression**. They're pre-existing and unrelated to the Day 5 change.
  - Final Day 7 browser acceptance needs an integrated environment where these sidebar calls succeed.

## 6. Verification

| Run | Result |
|---|---|
| Focused: `tests/v7Day5CoursesScholarships.test.tsx` | 16 passed |
| Guard proof: the same file against the pre-change `resultItems.ts`/`ResultList.tsx` | 4 domain-gate tests fail (as intended), then pass after |
| Full frontend: `npm test` | 30 files, **424 passed** (was 408) |
| Build: `tsc --noEmit && vite build` | passed |
| Production-bundle hygiene | no Day 5 fixture strings in `dist/assets/*.js` |
| Server: `npm test` | 50 passed, 0 failed |
| `git diff --check` | clean |

No GitHub workflow run is attached to this branch, so these are **local engineering evidence, not CI evidence**.

## 7. Status

Qasim's review of `388faef` (28 Sep):

- **D5 App pre-contract checkpoint: PASS.** Only the §4 ownership wording, the §5 evidence scope and the console note were corrected, docs-only.
- **D5 App production semantic integration: HOLD.** It's waiting for Carmen's exact Day 5 RAG SHA; no `carmen/v7-day5` branch or Day 5 PR exists yet.
- **No further speculative Day 5 feature work.** That means no invented Course/Scholarship item types, field labels, discriminators, result-status enum, local ResultSet IDs/ordinals, Scholarship paging, comparison logic, or parsing of prose/dates/eligibility.
- **No Day 5 App PR is opened** until real integration exists.
- **PR #42 (Day 4):** untouched and still on merge HOLD.

When Carmen publishes Day 5:

1. Send Qasim the exact SHA **before** implementing against it.
2. Confirm it descends from `d349e88`, or document exactly how it was stacked.
3. Diff the public wire from `d349e88` to Carmen's D5 SHA: contracts, request/response fields, the `PublicItem` union, domain fields, comparison, answer/result states, paging, selected-result support and clarification.
4. Re-mark D5-G1 to G11 as CLOSED / PARTIAL / STILL OPEN / CONTRACT CHANGED.
5. Integrate only the published semantics.
6. Re-run the D4 Accommodation and D5 Course/Scholarship regressions plus the full suites.
7. Do real visual browser acceptance (desktop, ~375px, screenshots, keyboard/focus) using the Course and Scholarship journeys in Qasim's review §23.


---

# Day 5 real integration (29 Sep)

## 8. What changed on the RAG wire, `d349e88` → `0efb6ee`

Carmen's D5 is 2 commits stacked directly on `d349e88`: `270bae6` (feat) and `0efb6ee` (tests).

**The public types did not change.** `git diff d349e88 0efb6ee -- src/askanu_rag/models` is empty: `ResponseBody`, `PublicResultItem`, `PublicComparisonItem`, `ResultPage`, `AnswerState`, the request fields and `ConversationState` are all byte-identical. **What changed is which domains emit them:**

| Surface | `d349e88` | `0efb6ee` |
|---|---|---|
| Course answers | prose + sources | + one `type:"result"` item per record (10-key `fields`), `answer_state` |
| Course comparison | not emitted | one `type:"comparison"` item (10 labelled rows, `record_id`-keyed cells, `not_published` state) and a ResultSet `rs:courses:N`; `PARTIAL` when any cell is missing |
| Scholarship discovery | one prose section per record | `type:"result"` items with `result_set_id`/`ordinal`, bounded to 5, plus `result_page` |
| Scholarship follow-up / selection / eligibility | prose | a single `type:"result"` item; `answer_state` `PARTIAL` (criteria published) or `UNKNOWN` (none) for eligibility |
| Scholarship refinement ("still open") | none | a child ResultSet (`parent_result_set_id` in state) whose ordinals restart at 1 |
| Scholarship comparison | none | `type:"comparison"` item, 12 labelled rows |
| `selected_result` request | Accommodation/Support only | + Scholarships |
| `result_page` request | Accommodation only | + Scholarships |

The field key sets and their labels are frozen in `journey_presentation.py` (`COURSE_PUBLIC_FIELDS`, `SCHOLARSHIP_PUBLIC_FIELDS`). RAG omits a key whose value is unpublished on a result item, and marks it `state:"not_published"` on a comparison row.

**How this was checked, not just read:**
- A local worktree at `0efb6ee` (fresh venv) passes Carmen's own `tests/test_v7_day5_courses_scholarships.py`, 9/9.
- Her harness was then used to capture verbatim response JSON for every journey: `frontend/src/mocks/v7Day5Wire.0efb6ee.json` (synthetic fixtures, not ANU facts).
- The browser run in §12 hits a live `create_app` from that SHA.

## 9. D5-G1 … G11, re-marked against `0efb6ee`

| Gap | Expected before | What `0efb6ee` actually provides | Status | App production code? | Owner | Pre-contract implementation |
|---|---|---|---|---|---|---|
| **G1** Course fact answer | prose + one source | still that, **plus** a typed Course `result` item and `answer_state: CONFIRMED` | **CLOSED** | yes: Course field labels (§10.1) | RAG | domain gate **kept**, now with a Courses key set |
| **G2** Course entity summary | structured summary with labels | `PublicResultItem`, `domain:"courses"`, 10 frozen keys (`entity_type, code, academic_year, units, description, prerequisites, corequisites, incompatibilities, assumed_knowledge, offerings`). A single lookup has **no** `result_set_id`/`ordinal`. Labels are frozen in RAG code but not sent on result items | **CLOSED** | yes: labels copied verbatim from `COURSE_PUBLIC_FIELDS` | RAG | gate **extended** (not removed) |
| **G3** Course comparison | backend comparison item | as expected; `answer_state: PARTIAL` whenever any cell is `not_published` | **CLOSED** | yes: columns keyed by `record_id` (§10.2); mobile table CSS (§10.5) | RAG | domain-neutral comparison **kept** |
| **G4** Academic year as version | structured `academic_year` | `academic_year` is a string field (`"2026"`). Identity: `canonical_id` is the **bare code** (`COMP1110`) and only `record_id` (`courses:course:COMP1110_2026`) carries the year. A cross-year request gets a year clarification, never a cross-year item | **CLOSED** | yes: App identity for comparison columns moved to `record_id` | RAG | n/a |
| **G5** Scholarship result set | cards with `result_set_id`/`ordinal`, labelled fields | as expected; discovery is bounded to 5 with `result_page`; 12 frozen keys | **CLOSED** | yes: labels copied verbatim from `SCHOLARSHIP_PUBLIC_FIELDS` | RAG | gate **extended** |
| **G6** Scholarship selected result | `selected_result` accepted for Scholarships | accepted and verified against the current repository; prose "the second one" also resolves to ordinal 2 | **CLOSED**, with residual **R1** and **R2** (§14) | yes: backend ordinal shown on unpaged lists (§10.4) | RAG | n/a |
| **G7** Scholarship uncertainty | per-criterion matched/unknown and/or `answer_state` | `answer_state` only (eligibility → `PARTIAL`/`UNKNOWN`; incomplete population → `PARTIAL`). The non-determination sentence is in the **prose**. There is no per-criterion structure | **PARTIAL** | yes: `PARTIAL`/`UNKNOWN` keeps the backend prose visible (§10.3) | RAG | n/a |
| **G8** Scholarship comparison | comparison with `not_published` | as expected | **CLOSED** | none beyond §10.2/§10.5 | RAG | n/a |
| **G9** Scholarship dates/status | typed date-only vs datetime; status as a field | `status`, `opening_date`, `closing_date` are now **fields**, but the values are plain stored strings (`"2026-10-31"`) with no date-only/datetime marker | **PARTIAL** | none: rendered verbatim; the App derives no open/closed verdict and adds no time | RAG | "no reformatting" guard **kept** |
| **G10** Scholarship continuation | server-cursor paging | `result_page` for Scholarships; "Any more?" and the structured "Show more" both continue the **same** ResultSet in its original order; a refined child set pages on its own restarted ordinals | **CLOSED** | none: the Day 4 paging path is domain-generic | RAG | n/a |
| **G11** RESULTS / EMPTY / INCOMPLETE | a public result-population state | **CONTRACT CHANGED.** `ResultSetStatus {RESULTS, EMPTY, INCOMPLETE}` exists, but **only inside the opaque `conversation_state.result_sets[].status`** (it gates `result_page` validity). The public response expresses population completeness through `answer_state` (`PARTIAL` when some records lack the filter evidence; `UNKNOWN` when nothing is established) plus prose. No-match stays `insufficient_evidence` | **CONTRACT CHANGED** | none: the App does not read `conversation_state`, invents no result state, and keeps no-match as the neutral "Not enough evidence" notice. It stops hiding `PARTIAL`/`UNKNOWN` prose (§10.3) | RAG | the "no invented EMPTY" guard is **kept** |

**Nothing speculative carried forward.** Every pre-contract guard is either kept (gate, verbatim dates, neutral unknowns, exact clarification ids) or extended *only* with keys and labels that exist in `0efb6ee` source. The d349e88 prose fixtures stay, as coverage for the still-valid `items: []` envelope. No pre-contract behaviour was removed, because none was speculative.

## 10. Production changes (all under `frontend/src/chat/`)

1. **`results/resultItems.ts`: per-domain field labels.** Courses and Scholarships were added to `PUBLIC_RESULT_FIELD_LABELS_BY_DOMAIN`, with keys, order and labels verbatim from RAG. Every frozen key renders; an absent key reads **"Not published"**, never "No", "None", "0" or a shorter card. A key outside a domain's published set still refuses the whole list, as does another domain's key or room-rate evidence off Accommodation.
2. **`results/resultItems.ts`: comparison column identity is `record_id`**, the same key the cells already use. Before this, columns keyed on `canonical_id`, which for Courses is year-less, so a 2025-vs-2026 pair would have been refused as a duplicate.
3. **`AssistantTurn.tsx`: `PARTIAL`/`UNKNOWN` keeps the backend prose visible** above cards or the table, the same treatment a `partial` status already had. RAG's "I can show official requirements, but I cannot determine your personal eligibility" and "…so this refinement is incomplete" exist **only** in prose. Previously they were folded under "Show as text" whenever cards rendered. The App adds no wording of its own.
   - **Deliberate Day 4 presentation delta (approved by Ben 29 Sep; please confirm, Qasim).** The rule is domain-generic, so the Day 4 Accommodation `PARTIAL` comparison now also shows its prose above the table instead of collapsed. Nothing is removed. The one D4 test that asserted "collapsed" now asserts "visible". Reverting it is a one-line change.
4. **`results/ResultList.tsx`: backend ordinals on unpaged lists.** When every card carries an `ordinal`, that ordinal is the visible number, so "the second one" reads **2**, not 1. The same applies to a refined child set (1–5) and continuation (6). Lists the backend did not number (a single Course lookup, Jobs/Events) keep positional numbering.
5. **`results/Results.module.css`: comparison readability at 375px.** Course labels were breaking mid-word ("Entit/y type"). Labels and cells now keep whole words at a minimum width, and a wide table scrolls inside `.comparisonScroll`, never the page.

**Not changed:** request building, `conversation_state` handling, Clear Chat, `structuredPrefill.ts`, `askResponse.ts`, the server, and anything in `askanu-rag`.

## 11. Tests (local engineering evidence, not CI)

| Run | Result |
|---|---|
| `tests/v7Day5CoursesScholarships.test.tsx` (rewritten around the real `0efb6ee` captures) | 52 passed |
| Full frontend `npm test` | **30 files, 460 passed** (was 424) |
| D4 regression (`v7Day4Accommodation.test.tsx`, `v7Day3Results.test.tsx`) | all pass; 2 expectations updated for §10.2/§10.3, nothing else touched |
| `tsc --noEmit && vite build` | passed |
| Server `npm test` | **50 passed**, 0 failed |
| `git diff --check` | clean |
| RAG `0efb6ee` own D5 suite in the local worktree | 9 passed |

The new suite:
- Parses every captured `0efb6ee` body through `parseAskResponse`.
- Locks the Course and Scholarship label sets, record-keyed comparison columns, 2025-vs-2026 identity, "Not published" (never No/None/0), ordinals 2 / 1–5 / 6 / 6–8, and the exact `selected_result` triple and `result_page` cursor sent.
- Locks visible `PARTIAL`/`UNKNOWN` prose, with no App-authored "eligible / better / easier" wording.
- Replays the real 7-turn Scholarship journey through `useChatSession`. Each request echoes the previous response's `conversation_state` exactly; a transport failure preserves the last valid state; Clear Chat drops state, history and every structured reference.

## 12. Browser acceptance: live RAG `0efb6ee` + real App (screenshots)

**Setup:**
- RAG `create_app` from the `0efb6ee` worktree on :8000, over Carmen's D5 synthetic Course/Scholarship records plus two Accommodation fixtures.
- App dev server on :5173, proxied to it.
- Headless Chrome driven over CDP. Each journey runs in a fresh browser context at **1280×900** and at **375×812** (mobile emulation).

**Evidence:** 39 screenshots plus `report.json` in `docs/evidence/v7-day05/`.

| Journey | Screenshots (`<journey>-<desktop\|mobile>-NN-…png`) | Verified |
|---|---|---|
| Course exact lookup → follow-up → comparison → return | `course-*` 01–04 | 10 labelled rows; "Not published" coreqs; table rows = RAG labels; the `PARTIAL` comparison's prose is visible |
| Scholarship discovery → "the second one" → "When does it close?" → "Am I eligible?" → refinement → compare first two → "Any more?" | `scholarship-*` 01–07 | ordinals **1–5 → 2 → 2 → 2 → 1–5 (child set) → table → 6**; eligibility non-determination visible; `2026-10-31` verbatim |
| Structured "Show more" → "Ask about this" → explicit #8 eligibility | `scholarship-structured-*` 01–03 | page 2 shows **6, 7, 8**; R1 and R2 reproduced (§14) |
| Topic switches Course → Scholarship → Accommodation → "Back to COMP1110" → Clear Chat → "When does it close?" | `cross-*` 01–05 | Accommodation still has 7 D4 rows; return re-renders COMP1110 2026; after Clear Chat there are **0** "Ask about this"/"Show more" buttons and the stale question gets a neutral off-topic notice |
| Keyboard | `keyboard-desktop-01` | Tab order is card link → its "Ask about this" → next card, in backend order; every stop has a 2px solid focus outline; Enter on "Ask about this" prefills the composer only |

Measured across all 39 steps:
- 0 horizontal page overflow (`scrollWidth` ≤ viewport; the 15px desktop difference is the scrollbar).
- 0 empty `<dl>`.
- 0 console errors, warnings or React warnings. The sidebar feeds now resolve against the live RAG.
- The mobile comparisons scroll inside their own box.

## 13. Owner questions answered

| Question | Answer |
|---|---|
| local ResultSet generation | **NO** |
| prose parsing | **NO** |
| local result re-ranking | **NO** |
| local eligibility inference | **NO** |
| local source-authority inference | **NO** |
| local missing→false coercion | **NO** |

`conversation_state` stays opaque: stored, echoed, replaced only by an authoritative response, preserved across transport failure, and cleared by Clear Chat. It is not inspected.

## 14. Residual contract mismatches (RAG-owned, reported, not patched in the App)

- **R1: structured selection loses its ResultSet identity when the question names the title.** The App's Day 4 prefill "Tell me more about <title>" is sent together with the correct `selected_result`. RAG verifies the selection, then re-resolves by the title in the text. The response has the **right record** (and state keeps `selected_result.ordinal = 2`), but the item has `result_set_id: null`, `ordinal: null` and `answer_state: PARTIAL`. With neutral wording ("Tell me more about this one", "What is the value?"), the same request returns ordinal 2 and `CONFIRMED`. **Ask for Carmen:** a verified `selected_result` should take precedence over a title match in the text. The App keeps the accepted D4 prefill and renders what is sent. It never re-attaches an ordinal.
- **R2: retained selection beats an explicit reference on an eligibility follow-up.** This was reproduced in Carmen's own harness with no App involved: after "the second one" (prose or structured), "Am I eligible for Day 5 International Computing Scholarship **8**?" answers about **Scholarship 2** (`PARTIAL`). Without a prior selection, the same question correctly answers #8 (`UNKNOWN`). "Tell me about … Scholarship 8" after a selection is also correct. Qasim's rule is that explicit references override inherited context, so this is a **RAG defect for Carmen**, and it is on an eligibility question. The App must not work around it by parsing prose.
- **R3: `PARTIAL` discovery has no student-visible reason (product decision, not a defect).** An incomplete-population discovery is `answer_state: PARTIAL`, but its prose only restates the records. With §10.3 the prose is visible, yet nothing tells the student *why* it is partial. The App deliberately renders no `answer_state` label; that was the Day 4 decision, and one would be App-authored copy. Options: RAG adds a sentence, or Qasim approves a fixed neutral label per `answer_state`.

## 15. Status

- **Day 5 App real integration: done at the head below, for Qasim's review.**
- The D5 PR is opened separately. It is **not to be merged**.
- **D6 will branch from this exact head.**
- Day 8: HOLD.
