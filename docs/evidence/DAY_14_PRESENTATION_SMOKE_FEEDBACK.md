# V6 Fri 18 Sep evidence — presentation-day smoke, fallback assets, feedback board

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day14` · continues from HEAD `b6c7f6a`
**Date:** Friday 18 September 2026 — V6 Day 14 (`my_day_by_day_tasks.md`: "STAKEHOLDER PRESENTATION")
**Deliverable:** Protect the pinned public build, run a targeted five-domain public smoke against
`https://askanu-dev-gdg.web.app`, verify fallback screenshots/source links/presenter flow, and
pre-seed the post-demo UX feedback board. No redesign, no deploy, no hard-coded Events data.

No CI is attached to this branch. Numbers below are real `npm test`/`npm run build` output, real
`curl` HTTP codes, real DOM measurements taken through the Browser pane, and real request/response
pairs captured by wrapping `window.fetch` in-page — same convention as `DAY_08`–`DAY_13` evidence.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.7, Chrome (local headless, for
static/driven screenshots only — the smoke itself ran against the live public URL).

---

## 0. Summary

| | |
|---|---|
| Scope | Public five-domain smoke, pinned-build proof, fallback screenshot matrix, source-link check, and a **reproduced backend conversation-context defect** found during the demo-script rehearsal |
| Changed in `frontend/` | **0 files.** This was a smoke/evidence day; no P0 met the "breaks the scripted flow and is fixable in this repo" bar (see §4 — the one defect found is not App-repo code) |
| New files | `docs/evidence/DAY_14_PRESENTATION_SMOKE_FEEDBACK.md` (this file), `docs/evidence/day14/*.png` (6), `docs/DAY14_LIVE_DEMO_SCRIPT.md` (committed, was untracked) |
| Tests | `frontend npm test` → 20 files, 256 passed (grew from Day 13's 18/248 — more coverage landed since) |
| Build | `frontend npm run build` → `tsc --noEmit` OK, `vite build` ✓, `dist/assets/index-DFkkEB6L.js` / `index-7xJ6UDXQ.css` — **byte-identical hash to what the public URL serves right now** (§1) |
| **Headline finding** | The exact Accommodation follow-up in `DAY14_LIVE_DEMO_SCRIPT.md` ("Is it catered?") returns the **Courses** answer from earlier in the same session, on the live pinned build. Reproduced twice with full request/response capture. Root cause is backend conversation-history resolution, not this repo. See §4 |

---

## 1. Pinned-build proof

Public site right now:

```
GET https://askanu-dev-gdg.web.app/         → 200
    references assets/index-DFkkEB6L.js
```

Local rebuild from `ben/day14` HEAD (`b6c7f6a` + this evidence-only commit, no `frontend/src`
changes):

```
frontend npm run build
  dist/index.html                 0.95 kB
  dist/assets/index-7xJ6UDXQ.css  25.88 kB │ gzip 4.71 kB
  dist/assets/index-DFkkEB6L.js  276.30 kB │ gzip 87.80 kB
```

**Same hash.** What's live is what's in `main` at `b6c7f6a` — the build to protect today is
confirmed unmodified before any smoke testing began.

`docs/DEPLOYMENT.md` still names the hosting URL `askanu-web.web.app` (dead — confirmed 404 via
DNS/dead host during this session, same as the demo script's own note). Not fixed today per
"no redesign / doc day is Day 22"; flagged again on the feedback board (§6).

## 2. Five-domain public smoke — desktop 1280×720

Live URL, real Browser-pane session, real clicks (no dev/mock transport):

| Domain | Route | `h1` | Cards | scrollWidth/clientWidth | Console errors |
|---|---|---|---|---|---|
| Home | `/` | — | 4 "Try asking" | 1280/1280 | 0 (events 404 expected, see §5) |
| Courses | `/courses` | Courses | 4 | 1280/1280 | 0 |
| Scholarships | `/scholarships` | Scholarships | 4 | 1280/1280 | 0 |
| Jobs | `/jobs` | Jobs | 4 | 1280/1280 | 0 |
| Accommodation | `/accommodation` | Accommodation | 4 | 1280/1280 | 0 |
| Support | `/support` | Support Services | 4 | 1280/1280 | 0 |

Card → chat hand-off (Courses "What are the prerequisites for this course?"), instrumented
`window.fetch`: click routes to `/`, composer value = card prompt, composer focused, **0 fetch
calls** — confirms "prefill, focus, never auto-send" is intact on the live build.

Explore nav: Events renders with no `to`, `aria-disabled`, "Remaining resource pages coming soon"
— correctly truthful, not touched (Events ships Day 15).

### Mobile — 360 / 390 / 430px

| Width | Route checked | scrollWidth/clientWidth |
|---|---|---|
| 360 | Home | 360/360 |
| 390 | Accommodation | 390/390 |
| 430 | Support | 430/430 |

Mobile drawer opened at 360px (hamburger → Explore/Clear Chat/nav visible), closed with `Escape`.
No horizontal overflow at any width tested.

## 3. Real-ask smoke — exact demo-script prompts, against production

All five POSTs below hit `https://askanu-dev-gdg.web.app/api/v1/ask` live (not mock transport).

| # | Prompt | Result | Matches script? |
|---|---|---|---|
| 1 | `What are the prerequisites for COMP1110?` | *"The prerequisites for COMP1110 (2026) are: COMP1100 OR COMP1130 OR COMP1730"* + source "Structured Programming (courses)" | ✅ exact |
| 2 | `Tell me about Warrumbul Lodge.` | Full published profile + source "Warrumbul Lodge (accommodation)" | ✅ exact |
| 3 | `Is it catered?` (same session, after #1 then #2) | **"The prerequisites for COMP1110 (2026) are: COMP1100 OR COMP1130 OR COMP1730"** + source "Structured Programming (courses)" — **wrong domain** | ❌ **see §4** |
| 4 | `Does Warrumbul Lodge have rooms available right now?` | *"Not enough evidence to answer"* + null-vacancy explanation + StarRez apply link, source "Warrumbul Lodge" | ✅ exact |
| 5 | `Can Academic Support help with a grade appeal?` → `How do I contact them?` (fresh session) | Grade Appeal published topic, then published contact block; both source "Academic Support (support)" | ✅ exact |
| 6 | `What ANU jobs are currently open?` (fresh session) | Administration Coordinator card, closing "Sep 21 2026 - 23:55 AEST", source `jobs.anu.edu.au` | ✅ exact |

Screenshots of the answer states: [`day14/courses-answer-1280x900.png`](evidence/day14/courses-answer-1280x900.png) (#1), [`day14/accommodation-insufficient-evidence-1280x900.png`](evidence/day14/accommodation-insufficient-evidence-1280x900.png) (#4 — the demo's strongest moment).

## 4. Headline finding — reproduced, NOT an App-repo defect

**The exact scripted sequence in `DAY14_LIVE_DEMO_SCRIPT.md` §1 ("Courses" then, same thread,
"Accommodation") breaks on the live pinned build**, specifically the second Accommodation
follow-up ("Is it catered?").

**Reproduction (2/2), with request+response capture via an instrumented `window.fetch`:**

```
Turn 1  POST /api/v1/ask  question="What are the prerequisites for COMP1110?"
        history=[]
        → answer: COMP1110 prerequisites (courses) — correct

Turn 2  POST /api/v1/ask  question="Tell me about Warrumbul Lodge."
        history=[turn1 Q, turn1 A]  (2 entries)
        → answer: Warrumbul Lodge overview (accommodation) — correct

Turn 3  POST /api/v1/ask  question="Is it catered?"
        history=[turn1 Q, turn1 A, turn2 Q, turn2 A]  (4 entries, correct + complete)
        → answer: "The prerequisites for COMP1110 (2026) are: ..." (courses) — WRONG,
          same COMP1110 answer as turn 1, source card also "Structured Programming/courses"
```

**Isolation test (proves this is not a frontend bug):**

- Same "Is it catered?" question asked **without** a prior Courses turn in the session (Clear
  Chat → Warrumbul Lodge → Is it catered? only) → correctly returns *"Published catering
  options: Self-catered."*, source `accommodation`. Confirmed 2/2.
- The frontend's outgoing request body for the failing turn 3 is **verified correct**: `question`
  field is exactly `"Is it catered?"`, `history` is complete and correctly ordered (all 4 prior
  turns present, oldest question is `turn-14: "What are the prerequisites for COMP1110?"`).
  `askApi.ts`/`useChatSession.ts` are not changing or dropping anything.
- Conclusion: the App sends a correct, complete request; the **backend/RAG conversation-context
  resolution** picks the wrong prior topic to resolve the pronoun "it" against — it reaches back
  to the *first* domain in history (Courses) instead of the *most recent* one (Accommodation).

**Per `AGENTS.md`, this repo does not own "RAG ranking" or "the shared data schema"** — pronoun/
context resolution across turns is backend behaviour, not something `askApi.ts` or `AssistantTurn`
render logic can or should patch. No frontend change was made or attempted (V3 also forbids
reimplementing conversation logic in React).

**Verified operational mitigation (zero code, zero risk):** rewording the follow-up to name the
residence again instead of using the pronoun removes the failure. Confirmed 1/1:

```
Turn 3'  POST /api/v1/ask  question="Is Warrumbul Lodge catered?"  (same history as failing turn 3)
         → answer: "... Published catering options: Self-catered." (accommodation) — correct
```

**Action taken today (App-repo scope only):**
1. Reported here with full reproduction, not silently worked around in code.
2. `docs/DAY14_LIVE_DEMO_SCRIPT.md` step 2 of the Accommodation segment updated from
   *"Is it catered?"* to *"Is Warrumbul Lodge catered?"* — a presenter-script wording change,
   not a product change, and it produces the same on-screen line the script's "what actually
   comes back" column already promised.
3. Flagged on the feedback board (§6, row 1) as **P0 for backend** (Carmen/RAG) — the underlying
   defect should be fixed there before it resurfaces in an un-scripted follow-up question live.

## 5. Feeds — truthful state

`GET /api/v1/events/upcoming?limit=5` → **404** live → UI renders *"Upcoming events are
unavailable right now."* on every route (console shows the expected fetch-failed log, not a
crash). No fake/placeholder event data anywhere — correct, matches Day 12's `FeedPanel`
contract; Events ships Day 15 per the day-by-day plan; not touched.

`GET /api/v1/jobs/current?limit=5` → 200, 1 item, matches the Current Jobs panel and the Jobs
resource-page real-ask answer (§3 #6) — consistent.

## 6. UX feedback board

**Classification rubric** (apply before assigning a priority above `TBC`):
`defect` = reproduces against the live build and contradicts a documented contract/decision ·
`accessibility` = keyboard/contrast/touch-target/screen-reader gap · `preference` = valid opinion
with no contract violation, does not become mandatory without Qasim's sign-off · `enhancement` =
valid idea, out of today's scope, needs its own day. A row only gets `P0`–`P2` after "Reproduced?"
is checked; anything not yet reproduced stays `TBC`.

| # | Comment | Source | Class | Reproduced? | Priority | Owner | Next day |
|---|---|---|---|---|---|---|---|
| 1 | "Is it catered?" (2nd Accommodation follow-up, after a prior Courses question in the same session) returns the Courses/COMP1110 answer instead of the accommodation catering answer | This session, §4 | defect (conversation-context resolution) | ✅ yes, 2/2 | **P0 — backend** | Carmen (RAG) | Escalate before next live use; App-side mitigation (reworded presenter line) already applied, no code fix possible in this repo |
| 2 | Jobs "Job requirements" card returns the Courses-domain fallback message ("ask a standalone course prerequisite question with a course code") for a Jobs question | `DAY14_LIVE_DEMO_SCRIPT.md` §3 (found during script verification, not re-tested this session per user decision) | defect (wrong-domain fallback wording) | not re-tested today (already confirmed in the script's own verification pass) | P1 — backend wording | Carmen | Card left as-is on the page today (user decision); do not click live |
| 3 | Personalisation-implying card prompts: Courses ×3 ("What courses do I need for my degree?", "Can I still qualify for honours?", "Can I take this course in my study plan?"), Jobs ×1 ("Jobs for my background or degree"), Scholarships ×3 | `DAY14_LIVE_DEMO_SCRIPT.md` §3 | preference / copy | wording pattern only, not re-tested | P2 | Needs group decision (Qasim) | Reword only if accepted — 3 safe options already listed in the demo script §3 |
| 4 | Home "Try asking" suggestion "What events are happening this week?" hits the events-unavailable empty state | This session §5 + demo script §4 | expected/known gap, not a defect | ✅ (by design until Day 15) | P2 | Ben | **Resolved Day 15** — suggestion reworded to `What ANU events are coming up?` alongside the Events launcher (`DAY_15_EVENTS_SIX_DOMAIN.md` §1); the deployed panel stays "unavailable" until the RAG Events branch ships |
| 5 | `docs/DEPLOYMENT.md` still documents the dead `askanu-web.web.app` hosting URL instead of the live `askanu-dev-gdg.web.app` | This session §1 + demo script header note | docs defect | ✅ | P2 — docs | Ben | Day 22 docs day, or a 1-line fix any time if Qasim wants it sooner |
| 6 | Jobs follow-up "When does that job close?" repeats the entire job card instead of a crisp one-line date answer | `DAY14_LIVE_DEMO_SCRIPT.md` §1 (marked optional/fillable in the script) | enhancement (backend answer shaping) | not re-tested today | TBC | Carmen | Low priority — script already treats this as safe filler, not a blocker |
| — | *(rows 7+ reserved for verbatim post-demo comments — add below this line, classify with the rubric above before assigning P0–P2)* | | | | | | |

**Corrected 20 Sep 2026 (Qasim, PR #36 review):** no post-demo rows were added on 19 Sep, and no
additional Day 14 post-demo App feedback was formally PM-accepted through this board's process at
that point. An earlier revision of this note described the already-confirmed UX (Clear Chat
wording; no login/profile control; `Try asking` initial-state only; compact guided domain pages;
cards launch the single chat; same pattern across domains; official ANU navigation preserved;
mobile/responsive is a requirement) and the already-scheduled Day 15 Events scope (official-only
Upcoming surface, no Rubric on it, no frontend source filtering, compact title/date/organiser
line, optional fields degrade, no fabrication, empty/loading/error/stale states, mobile) as if they
were newly accepted through this board — they were not; both were already in force independently
(frozen requirements and scheduled scope, respectively) and are unaffected by this correction. Rows
3 and 5 were **not** accepted and stay open; rows 1, 2, 6 are backend-owned. Full corrected
categorisation and per-item verification: `DAY_15_EVENTS_SIX_DOMAIN.md` §1.

## 7. Remaining gaps — reported, not worked around

1. **§4's backend conversation-context defect is the one item that could actually break the live
   demo as scripted**, if the presenter follows the original wording. Mitigated by a script wording
   change only (§4); the underlying fix is backend-owned and out of this repo's authority to make.
2. Events/Rubric is not built — known, accepted, ships Day 15. Not a Day 14 shortfall.
3. `docs/DEPLOYMENT.md` hosting URL is stale (row 5, §6) — not fixed today, out of today's scope.
4. No independent scholarship/jobs sorting was touched or needed changing; not re-audited this
   pass since Day 11's audit already covered it and nothing here touches that surface.

No hard-coded domain facts, invented Events data, or backend behaviour were added anywhere in
production code this pass. `frontend/src/**` has zero diff from `b6c7f6a`.
