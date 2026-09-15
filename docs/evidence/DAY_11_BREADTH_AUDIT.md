# V6 Tue 15 Sep evidence — first-three-domain breadth regression + large-data assumptions audit

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day11-first_three_domain_breadth_regression` (from `990f53e`)
**Date:** Tuesday 15 September 2026 — V6 Day 11 (3h block)
**Deliverable:** Audit note + breadth-scale fixtures/tests proving the Courses, Scholarships and Jobs UI holds at 99%-coverage data volumes, not just at the one-to-five-record V5 sample scale.

Numbers below are real command output or real DOM measurements taken
locally through the Browser pane's CDP `resize_window` (same mechanism as
Day 8–10); there is no CI run attached to this branch.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.7.

---

## 0. Summary

No shared-component code change was needed. The audit found the render
path already free of sample-size assumptions; what was missing was proof
at breadth, so the day's output is fixtures + tests, not fixes.

| | |
|---|---|
| New | `okManySourcesResponse` (14 sources), `okMissingFieldSourceResponse` (empty title), `needsClarificationManyOptionsResponse` (7 options) in `mocks/askResponses.ts`; `ok-many-sources`, `ok-missing-field`, `needs-clarification-many` in `dev/mockTransport.ts`; 3 tests |
| Changed | `tests/sourceCards.test.tsx` (+2), `tests/assistantTurn.test.tsx` (+1) |
| Component code changed | **none** |
| Runtime dependencies added | **0** |
| API contract / schema / cloud change | **none made, none required** |

---

## 1. Breadth-assumptions audit (0–1h)

Inspected every shared component on the Courses/Scholarships/Jobs render
path and the three page wrappers.

| Concern from the brief | Where it would live | Finding |
|---|---|---|
| Hard-coded sample counts | `SourceCards`, `AssistantTurn` (`ClarificationOptions`), `AnswerBody`, `DomainLauncher` | None. Every list is `.map` over the array the service sent. The only fixed counts in the codebase are the four static launcher cards per domain (config, not data) and `slotCount={5}` in the placeholder `FeedPanel` (see §5). |
| Frontend re-sorting / local ordering | `grep -rn '\.sort(\|\.slice(\|\.reverse(' frontend/src` | Zero hits on source or option arrays. The only `.slice` calls are string slicing in `answerBlocks.ts` and the contract's `history.slice(-HISTORY_MAX_TURNS)` in `useChatSession.ts`. Sources and clarification options render in server order — `SourceCards.tsx` and `AssistantTurn.tsx` both state this in-code. |
| Long-text clipping | `grep -rn 'overflow\|white-space\|line-clamp\|text-overflow\|nowrap' frontend/src` | The only `text-overflow: ellipsis` / `white-space: nowrap` is on the four static Quick Links tiles (`Panel.module.css`, proper nouns) and `ClearChatButton`. Answer text, source-card titles, option labels and launcher card titles all inherit the global `overflow-wrap: anywhere` and wrap. Every flex text column carries `min-width: 0`. |
| Source-card overflow | `SourceCards.module.css`, `AssistantTurn.module.css` | `.body { flex: 1 1 auto; min-width: 0 }`, no fixed height, no `overflow: hidden` on the list. Verified at 360px in §3. |
| Missing-field rendering | `SourceCards.tsx` | Fields are typed non-nullable strings; an empty string renders as an empty text node, not `undefined`/`null`, and the card stays a real link. Verified in §2 and §3. |
| Clarification states | `AssistantTurn.tsx` | Read-only `<ol>`; wording switches on `allow_multiple` only. No two-option assumption. |
| Launcher pages | `CoursesPage`, `ScholarshipsPage`, `JobsPage` | Each is one `DomainLauncher` + one config. They carry no data and are unaffected by breadth. Left unchanged, compact, same visual system. |

---

## 2. Edge-state tests (1–2h)

Existing coverage before today: 1, 3 and 5 sources; 2 clarification
options; long title inside a 5-item jobs list; partial; insufficient
(with and without evidence); hostile strings; unsafe URLs. Added:

| Test | File | Proves |
|---|---|---|
| `renders a broad source list in full, with no cap and no reordering` | `tests/sourceCards.test.tsx` | 14 sources → 14 links, `href`/title/order all preserved; asserts `> 5` so a future cap would fail loudly |
| `renders a source with an empty title without crashing or inventing text` | `tests/sourceCards.test.tsx` | empty `title` → still a link with the stored `href`, domain shown, text contains no `undefined`/`null` |
| `lists every option for a broad clarification, in contract order` | `tests/assistantTurn.test.tsx` | 7 options → 7 list items in order; asserts `> 2` |

The three fixtures are placeholder copy on `example.invalid` URLs, same
rule as every earlier fixture: no ANU fact, name, date or URL is invented.
They are dev/test only and are dropped from the production bundle.

---

## 3. Browser verification — desktop 1280×720 and mobile 360×740

Dev server with `VITE_USE_MOCK_TRANSPORT=1` (toggled locally in the
git-ignored `.env`, reverted afterwards). Scenario chosen through the dev
fixture picker; the mock never inspects the question.

**Desktop 1280×720** — all three new scenarios viewed:
- `ok-many-sources`: sources 1–14 all rendered inside the chat scroll region, numbered, linked.
- `needs-clarification-many`: options 1–7 rendered as the read-only list with "Reply in the message box to choose one." below.
- `ok-missing-field`: one card, empty title line, `jobs` domain line, external-link glyph, clickable.

**Mobile 360×740** — DOM measurements after sending `ok` → `ok-many-sources` → `needs-clarification-many` → `ok-jobs-current` in one session (20 source cards + 7 options on screen):

```
documentElement.scrollWidth   360   (== clientWidth 360 → no horizontal scroll)
body.scrollWidth              360
source links in DOM            20
clarification options in DOM    7
widest source card right edge 319 px
widest option right edge      319 px
any element in <main> past 360px: false
```

Visual check at 360px: the 100-character "Placeholder role C …" title
wraps to five lines inside its card; scholarship record titles wrap to
two lines; the index badge, external-link glyph and domain line stay in
place on every card. No layout fix was needed, so no screenshot files are
attached (brief: "screenshots if a shared layout fix is made").

---

## 4. Automated tests and build

```
npm run test    →  Test Files 14 passed (14) · Tests 167 passed (167)   [was 164]
npm run build   →  tsc --noEmit OK · vite build ✓ 103 modules · built in 1.39s
                   dist/assets/index-*.js  266.75 kB │ gzip 85.45 kB
```

---

## 5. Backend / data contract gaps — reported, not worked around

1. **Current Jobs and Upcoming Events panels are still static placeholders.**
   `resources/CurrentJobsCard.tsx` and `resources/UpcomingEventsCard.tsx`
   render `FeedPanel` with five hard-coded "Placeholder slot / Awaiting
   data" rows and a disabled `View all`. No client exists anywhere in
   `frontend/src` for the contracted `GET /api/v1/jobs/current` or
   `GET /api/v1/events/upcoming` (`grep` finds the paths only in comments
   and `types/api.ts`). This is unchanged since Day 10 and blocks the
   V3-locked "short deterministic Upcoming Events / Current Jobs
   summaries". It is larger than a shared-component fix (new API client +
   loading/empty/error states + tests + `View all` routing), so it is
   flagged for Qasim to schedule rather than built inside this 3h slot.
   Nothing was faked to fill the panels.

2. **Jobs "requirements" capability** (raised by Qasim in the V6 brief).
   Confirmed the App does not paper over it: the `job-requirements` card
   only places "What are the requirements for this ANU job?" in the
   composer. Whether that returns an answer or `insufficient_evidence` is
   entirely the RAG/scraper contract. No App change is needed once the
   data lands; if the response shape changes, the App consumes only the
   reviewed shape.

No shared schema, source, API or cloud decision was changed by this work.

---

## 6. Acceptance criteria (`my_day_by_day_tasks.md`, Tue 15 Sep)

| Criterion | Status |
|---|---|
| No one-record/sample-size assumptions remain in affected shared components | PASS — audited in §1; none found, none introduced |
| Long/missing-field/source-card states are tested | PASS — §2 (+ pre-existing long-title and hostile-string tests) |
| No independent scholarship/jobs sorting contradicts backend deterministic logic | PASS — zero `.sort`/`.slice` on data arrays; server order preserved and asserted |
| Existing build and affected frontend tests remain green | PASS — §4 |

**Do not / escalate:** no domain page redesigned; no fake local data (fixtures are placeholder-only, dev/test-only); no temporal/status logic in React.
