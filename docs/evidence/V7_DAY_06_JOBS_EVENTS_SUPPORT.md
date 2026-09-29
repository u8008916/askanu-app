# V7 Day 6: Jobs + Events + Support, and FEATURE FREEZE

**Date:** 2026-09-29
**App branch:** `ben/v7-day6`, created from the exact Day 5 App checkpoint `949f2c421517a42e12d984e232fb1fba54eeed17` (PR #43, merge HOLD). Day 5 is frozen: no commit on `ben/v7-day5` after that head.
**RAG target:** `askanu-rag` `bafa15ded1afd6f2eecdf8781a5e4eb12cefffe4` (Carmen D6). It is 2 ahead / 0 behind D5 `0efb6ee` (`035a285` feat, `bafa15d` tests), and D7 RC `ce0eb8f` is 1 ahead of it, changing only `tests/test_v7_day7_rc_torture.py`.

## 1. RAG wire delta, `0efb6ee` → `bafa15d`

| Surface | `0efb6ee` | `bafa15d` |
|---|---|---|
| `PublicJobItem` (the **only** `models/` change) | Current Jobs DTO + `type:"job"` | + `canonical_id` (required), `result_set_id`, `ordinal` |
| Jobs listing | `items` without ResultSet identity | ResultSet `rs:jobs:N` (`population_complete=False`), ordinals, `result_page`, `answer_state: PARTIAL`. The prose opens with "The current supported Jobs population is incomplete; these are verified available results…" |
| Jobs zero match | `insufficient_evidence` "could not find stored current Jobs evidence" | `insufficient_evidence` "…population is incomplete… so this does not establish that no such ANU jobs exist"; the state's ResultSet is `INCOMPLETE` |
| Events | prose + sources | `type:"result"` items, `domain:"events"`, keys `start_at, end_at, timezone, venue, address, organiser, status, category, provenance_class` (+ `tags`, `audience` when stored). `provenance_class` is `official_anu` or `approved_community`. ResultSets, ordinals, paging; `DATE_WINDOW` and `TIME_OF_DAY_WINDOW` are separate constraints that replace independently |
| Support | prose + sources | `type:"result"` items, `domain:"support"`, keys `category, purpose, audiences, email, phone, location, hours, access, cost, topics, referrals`. Natural-language routing ("graded unfairly… who should I talk to?") is in RAG `domain_resolution.py` |
| `selected_result` / `result_page` requests | Scholarships, Accommodation(/Support) | + Jobs, Events (+ Support paging) |

For Events and Support, RAG sends every key and uses `null` for unpublished values. It publishes **no labels** for either domain.

**Verified by running, not reading:** a `bafa15d` worktree passes Carmen's `tests/test_v7_day6_journeys.py` 7/7. Her fixtures (clock fixed to 14 Sep 2026) were used to capture verbatim bodies into `frontend/src/mocks/v7Day6Wire.bafa15d.json`, and to serve a live six-domain `create_app` for §5.

## 2. App production changes (`frontend/src/chat/`)

1. **`results/resultItems.ts`: Events and Support key sets.** Events and Support are added to the per-domain key/label map. The labels are plain-English names of RAG's keys, since RAG publishes none, and carry no judgement. As before, a key outside the set, another domain's key, or malformed values refuse the whole list.
   - **Events:** Starts / Ends are shown through the existing `formatStoredDateTime`: Canberra time for offset datetimes, nothing invented for date-only or zone-less values. Venue, Address, Organiser, Category, Tags and Audience follow.
   - **Events keys validated but not shown as rows:** `timezone` (the offsets already carry it), `provenance_class` (shown as the provenance line) and `status`. The 20 Sep product decision stands for chat cards too: `status` mixes cancellation wording with general source status and has no frozen student meaning.
2. **Event provenance is checked, not assumed.** A card's provenance line comes from `source_id` ("Official ANU Events" / "ANU community · via Rubric"), and RAG's `provenance_class` must agree with it. A mismatch, or a source with no label, refuses the list. A Rubric event can never render under the official label.
3. **Jobs selection triple.** `canonical_id`/`result_set_id`/`ordinal` are validated (optional for the legacy DTO; a malformed one refuses the list) and carried onto the card. So Jobs cards get "Ask about this" and server "Show more" through the same generic path Day 4 built.
4. **`AssistantTurn.tsx`: the "Ask about this" prefill is now the neutral "Tell me about it"** (approved by Ben 29 Sep; **a D4 string change, please confirm, Qasim**). Checked live at `bafa15d` with the correct `selected_result` attached:

| Selected card in | "Tell me more about ⟨title⟩" (old) | "Tell me more about this one" | "Tell me about it" (new) |
|---|---|---|---|
| Jobs | `insufficient_evidence`, no item | `off_topic` | ✅ the selected job, ordinal 2 |
| Events | returns the **whole list** | `off_topic` | ✅ the selected event, ordinal 2 |
| Scholarships | right record, but no ordinal, `PARTIAL` (D5 R1) | ✅ | ✅ ordinal 2, `CONFIRMED` |
| Accommodation (D4) | `insufficient_evidence` | `off_topic` | ✅ the selected residence |
| Support | ✅ | `off_topic` | ✅ |

   Identity still travels only in `selected_result`, and the selected card is on screen directly above. The RAG precedence bug stays reported (R4, §6).

**No change to:** request building, `conversation_state`, Clear Chat, paging logic, the Upcoming Events panel (still official-only, its own endpoint), the server, or `askanu-rag`. There is no browser→Rubric request anywhere in `src/`: `rubric` appears only as the provenance label and fixture ids.

## 3. Semantics check against Qasim's Day 6 rules

| Rule | How the App meets it | Test / evidence |
|---|---|---|
| Jobs: zero items is never "There are no jobs" | no-match renders RAG's own "does not establish that no such ANU jobs exist" as the neutral notice; the App has no empty-state copy for chat | `jobsEmpty` test |
| Jobs: incompleteness never hidden | listings are `PARTIAL`, so the D5 rule keeps "population is incomplete" visible above the cards | `jobsBroad` test; `jobs-*-01` screenshots |
| Jobs: no local ranking or inference | cards are in `items` order; fields come only from the typed DTO | order/ordinal tests |
| Events: Rubric never relabelled official | provenance line from `source_id` and cross-checked with `provenance_class`; a mismatch refuses | provenance tests; `events-*-03` |
| Events: sidebar official-only; no live Rubric fetch | unchanged panel and endpoint; no Rubric URL is fetched | grep; unchanged `UpcomingEventsCard` |
| Events: missing stays missing | null venue/end/address render "Not published"; nothing says online/cancelled/ticketed | `eventsBroad` test |
| Events: `DATE_WINDOW` ≠ `TIME_OF_DAY_WINDOW` | the App never reads constraints; it renders each backend result (today → after 5pm → tomorrow → before 2pm) | refinement test; `events-*-04` |
| Support: no frontend routing | no alias table was added; "graded unfairly…" is routed by RAG | `supportRouted`; `support-*-01` |
| Support: no adjudication | the card shows the service and its published fields only | adjudication-regex tests |

## 4. Tests (local engineering evidence, not CI)

| Run | Result |
|---|---|
| New `tests/v7Day6JobsEventsSupport.test.tsx` | **34 passed** (Jobs 7, Events 6, Support 2, six-domain 1, wire boundary 18) |
| D5 regression `v7Day5CoursesScholarships.test.tsx` | 52 passed (one helper moved to an `unlisted` domain, since Support now has a key set) |
| D4 regression `v7Day4Accommodation.test.tsx` + `v7Day3Results.test.tsx` | all pass (prefill expectation → "Tell me about it") |
| Full frontend `npm test` | **31 files, 494 passed** (D5 checkpoint: 460) |
| `tsc --noEmit && vite build` | passed; no fixture strings in `dist/` |
| Server `npm test` | **50 passed**, 0 failed |
| `git diff --check` | clean |
| RAG `bafa15d` own D6 suite (local worktree) | 7 passed |

**Six-domain unit journey:** real D5 and D6 captures are replayed through `useChatSession`: Course → Course follow-up → Scholarship discovery → Scholarship selection → Accommodation → Jobs → Events → Support → return to Course. Every request echoes the previous authoritative `conversation_state` byte-for-byte. Clear Chat then sends no state, no history and no selection.

## 5. Browser acceptance: live RAG `bafa15d`, six domains, screenshots

**Setup:**
- RAG `create_app` from the `bafa15d` worktree on :8000, over Carmen's D5 Course/Scholarship and D6 Jobs/Events/Support fixtures plus two Accommodation fixtures, with the clock fixed to 14 Sep 2026.
- App dev server on :5173.
- Headless Chrome over CDP; fresh context per journey at **1280×900** and **375×812**.

**Evidence:** 39 screenshots plus `report.json` in `docs/evidence/v7-day06/`.

| Journey | Result |
|---|---|
| Jobs: listing → "Ask about this" on card 2 → requirements → "close this week" (`jobs-*`) | ordinals 1–5; the prefill sent was "Tell me about it" → card **2**; requirements stay on #2; the closing-week child set is renumbered 1–5 by RAG; "population is incomplete" is visible |
| Jobs "Show more" (`jobs-paging-*`) | **6, 7** |
| Events: today → "the second one" → "Any more?" → "only after 3pm" (`events-*`) | 1–5 → **2** → **6, 7** with **"ANU community · via Rubric"** on #6 and "Official ANU Events" on #7 → the backend's refined set |
| Support: "graded unfairly… who should I talk to?" → contact (`support-*`) | the routed ANUSA service card; unpublished phone/hours read "Not published"; no verdict wording |
| **Six-domain** (`six-domain-*`): Course → follow-up → Scholarship → "the second one" → Accommodation → compare → Jobs → Events → Support → "Back to COMP1110" → Clear Chat ×2 → "How do I contact them?" | every domain renders its own cards (Accommodation comparison as a table); Scholarship selection shows **2**; the return shows COMP1110 2026; **0** stale "Ask about this"/"Show more" after Clear Chat; the post-clear pronoun question gets no stale service |
| Keyboard (`keyboard-jobs-desktop-01`) | Tab: job link → its "Ask about this" → next job, in backend order; each has a 2px solid focus outline |

Across all 39 steps:
- 0 horizontal page overflow and 0 empty `<dl>`.
- 0 console errors, warnings or React warnings.
- The mobile shots end about 120px short of the bottom. That's a capture artifact: `scrollIntoView` scrolls the document and hides the top bar. The unscrolled shots (`six-domain-*-08`) fill the viewport, as in the Day 15 evidence.

## 6. Residual issues (RAG-owned unless stated; none patched by App reasoning)

- **R4: a verified `selected_result` loses to the question text (Jobs, Events, Accommodation, Scholarships).** This is the §2.4 table. It is worked around in the App only by sending neutral text; the structured identity was always correct. **For Carmen:** once `_state_with_verified_result_selection` has verified the selection, the domain answer should use it regardless of wording.
- **R5: Events prose ordinals beyond the second are unreliable.** In Carmen's harness, straight after the listing, "Where is the third one?" returns `off_topic`. After "the second one", "Where is the third one?" returns **event #2** (the wrong entity). The App's structured "Ask about this" path is unaffected. **For Carmen.**
- **R2 (from D5), still present at `bafa15d`:** a retained Scholarship selection beats an explicit "Am I eligible for … Scholarship 8?".
- **Source-health presentation (unresolved, for Qasim):**
  - (a) Jobs `PARTIAL` listings show RAG's full prose. The incompleteness sentence comes first, but the prose then restates every listed job above the cards, which is long on mobile (`jobs-mobile-01`). The honest caveat is visible; the duplication is a RAG-prose / product-copy question.
  - (b) Support answers are `CONFIRMED`, so RAG's "I can route you to published services but cannot diagnose a condition…" sits under "Show as text". The card itself asserts no outcome. If Qasim wants that sentence always visible, it's a one-line rule change, but it's a new presentation rule under freeze, so it's his call.
  - (c) D5 R3 (no visible reason for a `PARTIAL` discovery) is unchanged.

## 7. Status

**FEATURE FREEZE ACTIVE.** From this head, Day 7 is test → break → fix genuine defects → retest only, against RAG RC `ce0eb8f`: no new features, card redesign, navigation, search or recommendation behaviour, and no local reasoning. Day 8 stays on HOLD.
