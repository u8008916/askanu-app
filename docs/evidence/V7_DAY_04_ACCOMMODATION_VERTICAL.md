# V7 Day 4 — Accommodation vertical, verify-and-lock

**Date:** 2026-09-26
**Branch:** `ben/v7-day4`, from `main` @ `ee3d489` (V7 Day 3, PR #41, merged + approved 25 Sep 2026)
**RAG SHA reviewed:** `askanu-rag` `origin/main` @ `54d75f4` ("V7 Day 3: complete hybrid retrieval and grounded RAG architecture", PR #37, merged 25 Sep 2026)

## 0. What this day actually is

`docs/v7/DAY_04.md` asks App to ship the Accommodation vertical UX through shared primitives: discovery cards with canonical actions, an understandable selected result, comparison with neutral unknowns, a vacancy-unknown state with an official next action (no error styling), interruption/return, and Clear Chat — verified desktop/mobile/keyboard.

Reading `askanu-rag` `origin/main` @ `54d75f4` first (required before touching this): **the `/ask` wire for Accommodation sends only `answer` + `sources` + `status` + `clarification` + opaque `conversation_state`.** No `items`, no comparison payload, no `answer_state`/ResultSet status, no request field for a selected result. This is exactly Day 3's gaps G1/G2/G3/G5 (`docs/evidence/V7_DAY_03_RESULTS_COMPARISON_UNKNOWN.md` §7), re-verified against this SHA, still open.

Building production accommodation cards, a comparison table, an "Ask about this" action, or a next-action control today would mean inventing wire data RAG never sent — exactly what Day 4's "no hidden backend defect via UI workaround" line forbids, and what Qasim's Day 3 review explicitly ruled out ("no speculative G1–G5 implementations while Carmen's contract is unfrozen"). So today's scope, confirmed with the user before implementation, is **verify + lock + gaps**: prove the existing shared shell renders the real Accommodation wire correctly, lock that behaviour with tests, run the golden journey, and hand Qasim an exact, re-verified gap list. No production `src/` behaviour changes were made or were needed.

## 1. Wire truth table (re-verified against `54d75f4`)

| Day 4 UI need | Wire today | Evidence (askanu-rag `54d75f4`) |
|---|---|---|
| Discovery cards | `items: []` always | `resource_queries.py` `_accommodation_answer` never sets `items` |
| Broad discovery | `needs_clarification`, `type="accommodation_selection"`, options `{id: record_id, label: title}` ≤20, `allow_multiple: true` | `resource_queries.py` `_resource_clarification` |
| Selected result | `AskRequest` is `extra="forbid"` (`contracts.py`): no selection field exists to send. `remember_result_set` has no caller outside tests, so `conversation_state.selected_result` can never be populated on the live path | G1 / G3 |
| Comparison | One prose answer with a section per residence; no comparison payload | `resource_queries.py` compare branch (`COMPARE_PATTERN`) — G2 |
| Vacancy unknown + next action | `insufficient_evidence` prose; the apply URL, when published, is folded into the sentence ("Published application link: …"); no `answer_state`, no structured `next_action` | `_accommodation_answer`'s `LIVE_AVAILABILITY_PATTERN` branch — G3, new gap G7 |
| Price/catering refinement | `MAX_PRICE` is parsed into `conversation_state.constraints`, but the accommodation service does not apply it | new gap G9 |

**Fixture correction found and fixed:** the pre-existing `needsAccommodationClarificationResponse` mock (`frontend/src/mocks/askResponses.ts`) was `type: 'entity_selection'`, `allow_multiple: false` — a single-select shape that does not match `_resource_clarification`'s real `type="accommodation_selection"`, `allow_multiple: true`. Corrected to match the live backend; this changed which control (`AssistantTurn.tsx`'s `ClarificationOptions`) two pre-existing tests exercised — see §4.

**New defect found (handed to Qasim as G6, not fixed here — RAG-owned):** the corrected `allow_multiple: true` clarification lets a student check both options and click "Use selection", which sends `joinSelection` text like `"Both Placeholder residence A and Placeholder residence B"`. But `_pending_resource_selection` (`resource_queries.py`) only resolves `first`/`second`/`1`/`2` or one exact option id/label — it has no `both` handling (unlike the course `entity_selection` path in `conversation.py`, which does). A genuine two-option "both" reply on Accommodation likely re-triggers the same clarification rather than resolving. Not an App defect: the App sent exactly the selection text the backend itself asked for (`allow_multiple: true`); the backend's own resolver doesn't handle it.

## 2. Golden journey

### 2a. Real backend — not run, and why

Accommodation records are served from a database-backed `ResourceReader` (`resource_queries.py` `DomainResourceQueryService.__init__(repository: ResourceReader, ...)`), unlike Courses, which has a local-file loader (`COURSE_RECORDS_PATH`, used for the Day 15 Events recipe). `askanu_rag.config.Settings` has no equivalent local-file path for Accommodation — only `database_url`/`cloud_sql_instance_connection_name` (Cloud SQL) plus Gemini/Cohere API keys. Standing up a live Postgres instance with real, source-approved Accommodation records was out of reach for this local session and outside Day 4's App scope to fabricate. Per the plan's explicit fallback ("no invented records"), the golden journey below ran against the dev mock transport only, using fixtures shaped to the exact `54d75f4` wire (§1) rather than placeholder data invented beyond that shape.

### 2b. Steps run (dev server, `VITE_USE_MOCK_TRANSPORT=1`, desktop 1280×720 then mobile 375×812)

All steps below were driven through the real chat shell (`FixturePicker` selects which real wire shape the mock returns; the mock never inspects question text).

1. **Broad discovery** — Accommodation domain page → "Find out about a residence" card (prefill, not auto-send) → `needs_clarification — accommodation` scenario → Send. Result: "Which residence do you mean?" with 2 checkboxes (`allow_multiple: true` → checkboxes, not buttons), "Use selection", the multi-select note. Matches §1's corrected shape.
2. **Select one** — checked "Placeholder residence A" → "Use selection". Composer filled with exactly `Placeholder residence A` (23/2000 chars); no second message was sent (prefill only, matching the frozen V5 card rule).
3. **Compare** — switched to `ok — accommodation compare (V7 Day 4)`, sent. Result: one prose answer naming both placeholders, both sources listed in order; no table, no result-list heading, no "Ask about this" button anywhere.
4. **Vacancy unknown** — asked "Is there vacancy right now?" against `insufficient_evidence — accommodation vacancy (V7 Day 4)`. Result: heading "Not enough evidence to answer", info icon (not the alert icon), no red styling, backend prose shown verbatim including "Published application link: https://example.invalid/placeholder-apply" as **plain text, not a link** (confirmed via `read_page`: no `role="link"` for that URL — linkification was explicitly out of Day 4 scope per the user's scope decision), source kept.
5. **Course interruption** — sent "Actually, what are the prerequisites for COMP1110?" against `ok — one source`. Answered normally; the accommodation conversation was not cleared or trapped.
6. **Return** — sent "Back to accommodation — what about cost?" against `ok — accommodation`. Answered normally; both prior turns remained visible above it.
7. **Clear Chat** — clicked; conversation reset to the "Try asking" empty state, all turns gone.
8. **20-option discovery** — separately, `needs_clarification — accommodation (20 options, V7 Day 4)`: all 20 options rendered as checkboxes in backend order (1…20), each with the correct label, "Use selection" reachable below them, no crash, no truncation.
9. **Mobile (375×812), repeated selectively** — card prefill, vacancy-unknown turn: no horizontal scroll, text wraps, info icon and no-red styling hold, "Dev: mock response" picker only appears once a turn exists (pre-existing mobile-empty-state layout in `ChatPanel.tsx`, unrelated to Day 4 — confirmed by reading the component, not a defect).

**Console:** the only errors seen were `/api/v1/jobs/current` and `/api/v1/events/upcoming` 500s from the sidebar list panels hitting the (not running) real dev-proxy target — the same pre-existing, expected condition already recorded in Day 15 evidence; unrelated to chat rendering or this scope, and the Current Jobs panel still rendered its own fallback fixture content regardless.

### 2c. Classification

| Step | Classification |
|---|---|
| 1–8 | Behaves as designed; shared primitives render the real wire correctly |
| G1–G3, G5–G9 | Backend contract gaps (RAG-owned) — see §3 |
| No accommodation record data locally | Data/infra limitation for local verification, not a defect |

### 2d. Five phrasings — discovery and vacancy intents

Not independently re-run: the App's discovery and vacancy rendering paths do not branch on question text at all (`AssistantTurn.tsx` renders purely off `status`/`clarification`/`items`/`answer`, and `resource_queries.py`'s own dev mock never inspects the question — confirmed in `dev/mockTransport.ts`'s module doc). Five differently-worded discovery or vacancy questions therefore exercise byte-identical App code paths to the ones already covered in §2b/§4; the wording-sensitivity itself is RAG's `ACCOMMODATION_PATTERN`/`LIVE_AVAILABILITY_PATTERN` matching, which is out of this repo.

## 3. Gap table handed to Qasim

| ID | Gap | Owner | App status |
|---|---|---|---|
| G1 | No request field to send a selected result identity to RAG | Carmen / Qasim | Re-verified against `54d75f4`, still open |
| G2 | No comparison payload on the wire | Carmen | Re-verified, still open; `ComparisonTable` primitive ready, unwired |
| G3 | No `answer_state`/ResultSet status on the wire; live path never records `result_sets` | Carmen | Re-verified, still open |
| G5 | Only Jobs sends `items`; Accommodation (and Scholarships/Support) stay text | Carmen | Re-verified, still open |
| **G6** (new) | Accommodation clarification is `allow_multiple: true`, but `_pending_resource_selection` never resolves a `both`-style reply — only `first`/`second`/one exact id or label | Carmen | Found this session; not an App defect — App sends exactly what the clarification's own shape asks for |
| **G7** (new) | No structured next action / canonical apply link; the URL only ever appears inside `answer` prose | Carmen | `UnknownWithNextAction` primitive exists only in the dev gallery, unwired — matches V7_UI_CONTRACT §2's "useful unknown" target, blocked on this |
| **G8** (new) | Without `answer_state`, a genuine "useful unknown" (vacancy not published) and a plain evidence-abstention are indistinguishable on the wire, so both render the same "Not enough evidence to answer" heading | Carmen | Locked by `tests/v7Day4Accommodation.test.tsx`, so a future change is a deliberate diff, not a silent one |
| **G9** (new) | `MAX_PRICE`/catering constraints are parsed into `conversation_state` but not applied by the accommodation service | Carmen | Observed reading `resource_queries.py`; no App-side workaround attempted |

## 4. Files changed

- `frontend/src/mocks/askResponses.ts` — corrected `needsAccommodationClarificationResponse` to the real wire shape (`clar-accommodation-selection` / `accommodation_selection` / `allow_multiple: true`); added `needsAccommodationClarificationManyOptionsResponse` (20 options), `okAccommodationCompareResponse`, `insufficientAccommodationVacancyResponse`.
- `frontend/src/dev/mockTransport.ts` — registered the three new fixtures as picker scenarios.
- `frontend/tests/v7Day4Accommodation.test.tsx` — new, 16 tests (discovery clarification shape/keyboard/20-option/prefill-only; compare prose-only; vacancy unknown non-error/verbatim-text/no-linkification; interruption+Clear Chat state echo via `useChatSession`; regression guard that `toResultCards` refuses every accommodation fixture).
- `frontend/tests/clarificationLifecycle.test.tsx`, `frontend/tests/accommodationPage.test.tsx` — updated two pre-existing assertions (`button` → `checkbox` role; single-select note → multi-select note) to match the corrected fixture; no behavioural assertion was weakened, only the control role/copy the real backend actually sends.
- **No `frontend/src/chat/`, `frontend/src/domains/`, `server/`, or `askanu-rag` change. No API/schema change.**

## 5. Tests

| Run | Result |
|---|---|
| Focused — `npx vitest run tests/v7Day4Accommodation.test.tsx tests/accommodationPage.test.tsx tests/v7Day3Results.test.tsx tests/clearChat.test.tsx tests/conversationState.test.tsx tests/clarificationLifecycle.test.tsx` | 6 files, **77 passed** |
| Full frontend — `npm test` (in `frontend/`) | 28 files, **375 passed** (was 359 on `main`; +16 new) |
| Build — `npm run build` (`tsc --noEmit && vite build`) | passed |
| Server — `npm test` (in `server/`) | **50 passed**, 0 failed (unchanged — no server touched) |
| `git diff --check` | clean |

## 6. No frontend reasoning / source filtering / reorder

- No price, catering or vacancy verdict is computed or guessed anywhere in this change — every accommodation fixture's `answer` is placeholder prose the App only displays, exactly as `okAccommodationResponse`'s existing doc comment already required.
- The vacancy fixture's caveat ("A null vacancy status means unknown, not available or unavailable") is rendered verbatim, never paraphrased into "not available"/"fully booked"/"available" — asserted directly in `v7Day4Accommodation.test.tsx`.
- Compare renders the backend's own prose and source order; the App builds no comparison table from it (`toResultCards` and `ComparisonTable` are both unreachable on this data, asserted directly).
- Clarification options render in backend order (`aria-label="Clarification options"`, position-numbered) and the App never sorts, trims or invents an option.
- `toResultCards` still refuses every accommodation response (`items` is always `[]` on this wire) — asserted as an explicit regression guard so a future accidental accommodation-items path would be caught.

## 7. Desktop / mobile / keyboard

- **Desktop (1280×720):** full golden journey (§2b steps 1–8) — screenshots reviewed live in-session (not saved as files; browser tooling in this environment returns images inline rather than to disk — see Day 3 evidence §6 for the same convention).
- **Mobile (375×812):** card prefill and vacancy-unknown turn re-run — no horizontal scroll, 44px targets preserved (shared `Results.module.css`/`StatusNotice` styling, untouched), dev picker appears once a turn exists (pre-existing layout, confirmed not a Day 4 regression by reading `ChatPanel.tsx`).
- **Keyboard:** `Tab` reaches the first checkbox → `Space` toggles it → `Tab` reaches the second checkbox → `Tab` reaches "Use selection" — asserted in `v7Day4Accommodation.test.tsx`.

## 8. Engineering vs experience snapshot

**Engineering readiness:** the shared shell (`ResultList`, `ComparisonTable`, `ClarificationOptions`, `StatusNotice`, session-state echo, Clear Chat) handles every real Accommodation wire shape correctly and is fully covered by tests. Nothing here needs to change when Carmen's contract lands — the primitives are the intended landing point (`ResultCardModel`/`toResultCards` just needs an accommodation branch; `ComparisonTable` needs a caller; `UnknownWithNextAction` needs promoting out of the dev gallery).

**Experience readiness:** today an Accommodation student sees a truthful but flat experience — no residence cards, no comparison table, no actionable apply button, and a vacancy-unknown answer that reads identically to "AskANU doesn't know the answer to your question" rather than "this fact truthfully isn't published." That gap is backend-owned (G2/G3/G7/G8) and was not papered over here.

**Recommendation:** Day 5 architecture-checkpoint judgement is Qasim's; from the App side, the shared-primitive architecture holds under real Accommodation data shapes with no new App-side defect, and the one defect found (G6) is RAG-owned.
