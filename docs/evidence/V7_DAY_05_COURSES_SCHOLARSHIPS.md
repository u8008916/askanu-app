# V7 Day 5: Courses + Scholarships (pre-contract checkpoint)

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

Qasim's Day 5 checkpoint list, checked against the `d349e88` wire. "Producer has it" means the stored record model (`models/records.py` `CourseMetadata`/`ScholarshipMetadata` at `d349e88`) already holds the fact, so the gap is in what RAG exposes publicly (Carmen/API), not in Will's data.

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

Nothing in this matrix is a Will/producer gap: every missing fact already exists in the stored records. The App will not emulate any of these rows. Until Carmen publishes a contract, each row renders as the backend's prose, sources and clarification, exactly as locked in §3.

## 5. Browser and accessibility evidence

Dev server with mock transport (`VITE_USE_MOCK_TRANSPORT=1` in a git-ignored env file, deleted afterwards). The browser pane couldn't draw, so there are no screenshots. Evidence comes from DOM/text inspection of the running app.

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
- **Console:** no React warnings. The only errors are the sidebar's `/api/v1/jobs/current` and `/api/v1/events/upcoming` failing with no local RAG server. That's pre-existing and unrelated to Day 5.

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

## 7. Status

- The `ben/v7-day5` branch is ready for Carmen's Day 5 SHA.
- The real Course/Scholarship semantic integration (D5-G2 to D5-G11) stays gated on her published contract. When it lands:
  1. diff the public wire against `d349e88`;
  2. add frozen per-domain field labels only from that contract;
  3. integrate from that exact SHA.
- PR #42 (Day 4) is untouched and still on merge HOLD.
