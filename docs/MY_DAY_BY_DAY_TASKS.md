# askanu-app - my_day_by_day_tasks.md (V5)

**Primary owner:** Ben - App / UI / UX / React  
**Plan window:** 12-18 Sep 2026 accelerated phase; 19 Sep-3 Oct 1h/day hardening/release.  
**Rule:** code is not done until tests/evidence exist. Read repo instructions/contracts before editing.

## Cross-repo rules

- Preserve the frozen Browser -> App -> private RAG -> Cloud SQL/Gemini architecture.
- Do not silently change the `/api/v1/ask` response envelope/statuses.
- Official source URLs come from stored records.
- Session memory is current-chat only; no persistent account history.
- Events/Rubric is scheduled ingestion only, never a synchronous user-request dependency.
- Every day ends with a handoff: status, PR/SHA, tests, cloud evidence if relevant, known issues, contract/source changes.

## Sat 12 Sep - Reusable guided-domain page system + Courses redesign

**Capacity:** 12h  
**Outcome:** Replace the dense Courses resource page with the reusable V5 domain pattern: recommended question cards on top, compact official resources on bottom, route into New Chat, and no desktop vertical scroll at the supported demo viewport.

**Starting state:** Current Home is approved and should remain visually stable. Existing Courses page has too much explanatory content and vertical scrolling. Three concept mockups exist; latest direction uses current AskANU cream/black/gold palette.

**Dependencies / stop:** Coordinate the handoff shape with Carmen/Qasim. Do not wait for final wording of every domain card; build the reusable component and make card definitions data-driven.

### Work blocks
- **0-4h - Design-system implementation:** Create reusable DomainLauncher/RecommendedQuestion and OfficialResourceGrid components (names may differ). Preserve right sidebar/header. Tighten spacing/typography to current ANU palette. Add responsive behavior; desktop target is one viewport without content scroll.
- **4-8h - Courses conversion:** Remove redundant Courses explanatory jumbo. Implement 4 initial cards: Plan my degree, Check prerequisites, Can I take this course?, Honours eligibility. Keep compact official ANU Programs & Courses navigation at bottom.
- **8-12h - New-chat handoff + tests:** Clicking a card must navigate to Home/New Chat with intent/context and a user-visible starter state, not silently submit. Add routing/state tests, keyboard/focus tests and desktop viewport screenshot evidence. Verify Home itself did not regress.

### Understand before coding
- The cards are guided intents, not full answers.
- The chat should ask only the minimum missing information after a card is chosen.
- No-scroll is a desktop/demo acceptance target; mobile may scroll responsively.
- Official resource links remain visible and clearly external/official.

### Acceptance criteria
- [ ] Courses page fits supported desktop viewport without vertical content scroll.
- [ ] Four guided cards route to New Chat correctly.
- [ ] Official ANU resource section remains accessible at bottom.
- [ ] Keyboard focus/Enter/Space activation works.
- [ ] Home snapshot/smoke remains green.

### Evidence to hand off
- PR + screenshots at supported desktop width/height and mobile width.
- Route/state test outputs.
- Before/after screenshot showing removal of jumbo content.
- List of card config fields that other domains will reuse.

### Do not / escalate
- Do not redesign Home or global nav unless required for handoff.
- Do not auto-send prompts on card click unless explicitly approved.
- Do not hard-code six separate page implementations if a shared component can be used.

### Copy-paste AI kickoff

> Work in askanu-app. Inspect current Courses/Home/router tests first. Build a reusable guided-domain launcher matching the existing cream/black/gold AskANU design. Convert Courses to four compact recommended-question cards plus compact official ANU navigation. Card click should create/open a New Chat with structured intent/starter context, not answer on the domain page. Preserve Home. Add desktop no-scroll and accessibility tests/screenshots.

### Qasim integration checkpoint

Before this day is considered closed, coordinate with Qasim on: **V5 reset, contract freeze and integration gates**. Shared contract/source/schema/cloud changes must be explicitly approved and evidenced.

## Sun 13 Sep - Scholarships guided page + reusable domain rollout

**Capacity:** 12h  
**Outcome:** Apply the shared V5 launcher pattern to Scholarships while strengthening generic routing/state so adding future domains becomes configuration, not redesign.

**Starting state:** Courses launcher exists from Saturday and Home remains stable.

**Dependencies / stop:** Use real API statuses from Carmen; do not create scholarship-specific fake UI logic.

### Work blocks
- **0-4h - Generic domain config:** Refactor card/resource definitions into typed/configurable domain data. Ensure icons/titles/descriptions remain compact and accessible.
- **4-8h - Scholarships page:** Implement recommended cards such as Find scholarships for me, Check eligibility, Deadlines, Scholarships for my degree; add compact official ANU scholarship finder/detail resources.
- **8-12h - Chat UX integration:** Wire card intent to New Chat, render clarification naturally, preserve source cards/status states, and test session follow-up. Run desktop/mobile/accessibility smoke.

### Understand before coding
- Domain pages guide users into chat; they do not duplicate search results.
- Official resource links are escape hatches, not competing content blocks.
- Card copy may be provisional but behavior must be real.

### Acceptance criteria
- [ ] Scholarships page uses same reusable structure as Courses.
- [ ] No-scroll desktop target passes.
- [ ] Card -> New Chat -> clarification/answer works.
- [ ] Source cards and error/insufficient states render safely.

### Evidence to hand off
- Screenshots + route/API integration tests.
- Two guided-flow recordings/screenshots: scholarship matching and deadline check.

### Do not / escalate
- Do not fork a separate Scholarships chat component.
- Do not hide status/error states behind loading indefinitely.

### Copy-paste AI kickoff

> Extend the reusable guided-domain system to Scholarships. Keep the page compact and route all recommended questions into the existing New Chat. Integrate real clarification/status/source-card behavior from the API. Add tests for card routing, session follow-up, insufficient evidence and responsive layout.

### Qasim integration checkpoint

Before this day is considered closed, coordinate with Qasim on: **Scholarships vertical-slice release gate**. Shared contract/source/schema/cloud changes must be explicitly approved and evidenced.

## Mon 14 Sep - Jobs launcher + all-domain component maturity

**Capacity:** 12h  
**Outcome:** Ship the Jobs guided page and ensure the shared component handles list-oriented/status-heavy responses cleanly.

**Starting state:** Courses/Scholarships reusable launcher already exists.

**Dependencies / stop:** Coordinate current/closed status semantics with Carmen; no client-side truth invention.

### Work blocks
- **0-4h - Jobs page:** Add cards: Find current ANU jobs, Jobs for my background/degree, Closing soon, Job requirements. Add compact official ANU Jobs link/navigation.
- **4-8h - Result UX:** Ensure multiple result items, closing dates, source cards, partial/insufficient states are readable without overwhelming chat. Keep domain page itself no-scroll on desktop.
- **8-12h - Regression/accessibility:** Run shared component tests across Courses/Scholarships/Jobs; keyboard navigation, focus transfer to New Chat, mobile layout, long titles/URLs and error states.

### Understand before coding
- The guided page stays minimal even if chat results can be longer.
- Client displays server facts; it does not infer whether a job is open.

### Acceptance criteria
- [ ] Jobs page uses shared pattern and no-scroll desktop target.
- [ ] Guided cards route correctly and chat renders current-job lists/source cards.
- [ ] Three-domain regression passes.

### Evidence to hand off
- Screenshots/tests; one current-jobs and one closing-date flow.

### Do not / escalate
- Do not introduce a separate Jobs search app inside the domain page.
- Do not truncate critical closing date/source info without accessible expansion.

### Copy-paste AI kickoff

> Add Jobs to the shared guided-domain UI. Keep the domain page compact, route cards to New Chat, and make chat results handle current-job lists/closing dates/sources clearly. Run regression across the three implemented domain pages and accessibility/focus tests.

### Qasim integration checkpoint

Before this day is considered closed, coordinate with Qasim on: **Jobs gate + scheduler/freshness decision**. Shared contract/source/schema/cloud changes must be explicitly approved and evidenced.

## Tue 15 Sep - Busy-day light task: domain card copy/config prep

**Capacity:** 3h (busy)  
**Outcome:** Prepare Accommodation and Support launcher configs/copy so Wednesday can focus on integration rather than design decisions.

**Starting state:** Shared guided-domain component works for three domains.

**Dependencies / stop:** Maximum ~3h. No global redesign.

### Work blocks
- **0-1h - Accommodation config:** Draft compact cards: Which residence suits me?, Compare options, What will it cost?, How do I apply? plus official ANU accommodation links.
- **1-2h - Support config:** Draft cards: Who can help?, Academic support, Wellbeing support, Enrolment/admin help; add official support/ANUSA links within approved source policy.
- **2-3h - Component edge cases:** Add config fixtures/tests for long labels, disclaimer/support callout if required, and mobile wrapping. Leave integration for Wednesday.

### Understand before coding
- Cards should be plain-language entry points, not mini forms.
- Support UI must not imply emergency coverage or service hours unless source-backed.

### Acceptance criteria
- [ ] Configs/tests ready to merge or rebase Wednesday.
- [ ] No regressions to current pages.

### Evidence to hand off
- Small PR/config diff + screenshots if useful.

### Do not / escalate
- Do not spend the busy day polishing pixels.
- Do not add unsupported hotline/hours text from memory.

### Copy-paste AI kickoff

> Use a 3-hour prep block only: add Accommodation and Support guided-card/resource configs, cover component edge cases, and keep current pages green. No major integration or redesign today.

### Qasim integration checkpoint

Before this day is considered closed, coordinate with Qasim on: **Data-first integration day + claims/source gate**. Shared contract/source/schema/cloud changes must be explicitly approved and evidenced.

## Wed 16 Sep - Accommodation + Support UI integration + session UX

**Capacity:** 12h  
**Outcome:** Complete the two prepared guided pages and make the New Chat/session experience understandable when the assistant asks follow-ups or the user switches domains.

**Starting state:** Tuesday configs exist; Carmen is implementing real retrieval today.

**Dependencies / stop:** Keep pages compact; do not add large disclaimer blocks that re-create the original clutter problem.

### Work blocks
- **0-4h - Two domain pages:** Integrate Accommodation and Support configs into shared launcher; compact official resource grids; desktop no-scroll and responsive mobile behavior.
- **4-8h - Session UX:** Ensure guided card -> New Chat shows selected intent/starter affordance, pending clarification is visually clear, Clear/New Chat resets current session, and browser refresh behavior matches agreed session scope.
- **8-12h - Five-domain regression:** Run Courses/Scholarships/Jobs/Accommodation/Support smoke, keyboard/focus/contrast checks, long content/source card tests, loading/error states and mobile. Fix reusable component issues once, not per-page.

### Understand before coding
- The user should always know what AskANU is waiting for.
- Session-only does not mean hidden or confusing state; reset behavior must be obvious.

### Acceptance criteria
- [ ] Five domain pages use shared layout.
- [ ] Guided intent/clarification/reset flow works visibly.
- [ ] Desktop no-scroll target passes for all five domain pages.
- [ ] Mobile remains usable even if scrolling is necessary.

### Evidence to hand off
- Five-domain screenshot matrix + tests.
- One multi-turn guided flow recording/screenshot sequence.

### Do not / escalate
- Do not create a ChatGPT-style persistent history sidebar.
- Do not duplicate fixes across pages instead of shared components.

### Copy-paste AI kickoff

> Integrate Accommodation and Support into the shared guided-domain UI, then harden the current-session chat UX: selected intent, clarification, New Chat/Clear reset, loading/error/source states. Run a five-domain desktop/mobile/accessibility regression and fix shared components centrally.

### Qasim integration checkpoint

Before this day is considered closed, coordinate with Qasim on: **Five-domain gate + conversation milestone + Events decision**. Shared contract/source/schema/cloud changes must be explicitly approved and evidenced.

## Thu 17 Sep - Events page + six-domain UX/accessibility/mobile hardening

**Capacity:** 12h  
**Outcome:** Complete the sixth guided domain page, then spend the heavy day making the shared UX demo-ready rather than adding features.

**Starting state:** Five domain pages and session UX are working; Events data/RAG path lands today.

**Dependencies / stop:** Carmen is light, so avoid requiring backend changes for cosmetic issues; use existing contract/status behavior.

### Work blocks
- **0-4h - Events page:** Add cards: What's happening this week?, Events today, Find events by interest, Events for new students (copy provisional). Add compact official events resources. Route to New Chat.
- **4-8h - Six-domain polish:** Run no-scroll desktop target on all domain pages, spacing/typography consistency, sidebar/header integrity, long text, source cards, status/error/loading, keyboard/focus/contrast and screen-size matrix.
- **8-12h - Demo journeys:** Build/rehearse one guided flow per domain and a cross-domain session follow-up. Fix P0/P1 shared UX defects only. Capture screenshot/recording fallback assets for Friday.

### Understand before coding
- Consistency is the feature: six domains should feel like one assistant.
- No-scroll target applies to domain launcher pages, not necessarily long chat transcripts.

### Acceptance criteria
- [ ] All six domain pages use shared guided pattern.
- [ ] Supported desktop viewport shows launcher/resources without vertical page scroll.
- [ ] Mobile/accessibility core checks pass.
- [ ] Six demo journeys have fallback screenshots.

### Evidence to hand off
- Six-domain screenshot matrix/test output.
- Demo journey checklist + fallback assets.

### Do not / escalate
- Do not redesign Home/global chrome on the eve of demo.
- Do not hide backend gaps with hard-coded frontend answers.

### Copy-paste AI kickoff

> Finish the Events guided page, then run a six-domain UX hardening day: desktop no-scroll launcher target, mobile, accessibility, focus, loading/error/source cards and consistent current AskANU colors. Prepare one guided demo journey and fallback screenshot per domain. No new feature redesign.

### Qasim integration checkpoint

Before this day is considered closed, coordinate with Qasim on: **Six-domain release candidate + 72% gate**. Shared contract/source/schema/cloud changes must be explicitly approved and evidenced.

## Fri 18 Sep - Stakeholder UX stability + feedback capture

**Capacity:** 12h  
**Outcome:** Present a clean consistent six-domain guided experience and protect the UI from last-minute churn.

**Starting state:** Thursday six-domain guided launcher and fallback screenshots are ready.

**Dependencies / stop:** P0-only before presentation. Cosmetic preferences go to post-demo backlog unless they block comprehension/accessibility.

### Work blocks
- **0-4h - Final UX smoke:** Run supported desktop no-scroll matrix, mobile core flow, keyboard/focus, guided card -> chat, source cards, loading/error and Home regression. Fix only blockers.
- **4-8h - Demo/presentation:** Use pinned build and prepared journeys. Keep fallback screenshots ready. Note stakeholder comments close to verbatim rather than editing live.
- **8-12h - Feedback triage:** Classify UX feedback by severity/domain/shared-component impact. Convert accepted items into reusable component tasks, not six copies. Update post-demo visual backlog.

### Understand before coding
- Demo stability is more valuable than last-minute polish.
- Shared-component feedback should be fixed centrally after triage.

### Acceptance criteria
- [ ] Six domain flows present cleanly.
- [ ] No-scroll desktop target demonstrated.
- [ ] Feedback captured/classified without unreviewed live changes.

### Evidence to hand off
- Final screenshot matrix/build SHA.
- UX feedback board with P0/P1/P2.

### Do not / escalate
- No redesign during presentation day.
- No hard-coded answers to mask data/backend issues.

### Copy-paste AI kickoff

> Protect the pinned UI. Run final six-domain desktop/mobile/accessibility smoke, allow only P0 fixes, present the guided-intent journeys with fallback screenshots, and convert stakeholder feedback into shared-component/domain issues after the demo.

### Qasim integration checkpoint

Before this day is considered closed, coordinate with Qasim on: **75% stakeholder milestone + V5 re-baseline**. Shared contract/source/schema/cloud changes must be explicitly approved and evidenced.

## 19 Sep - 3 Oct: 1-hour hardening/release rule

- **Sat 19 Sep:** Feedback reproduction + top P0/P1 only - Each owner gets 1h: reproduce highest-priority accepted feedback; smallest tested fix or evidence-only issue.
- **Sun 20 Sep:** Coverage gaps - One representative missing-data/retrieval/UI gap per owner; test before fix.
- **Mon 21 Sep:** Security/privacy pass - RAG logs/history privacy, App safe rendering, scraper secret/source hygiene, Qasim IAM/revision audit.
- **Tue 22 Sep:** Accessibility/mobile pass - Ben focuses a11y/mobile; others support only defects revealed by the pass.
- **Wed 23 Sep:** Failure/recovery pass - Embedding/API failure, app upstream failure, scraper fetch/parser failure, rollback evidence.
- **Thu 24 Sep:** Performance/cost pass - Bounded context/candidates, frontend network behavior, scraper cadence, cloud cost/limits.
- **Fri 25 Sep:** Six-domain regression - One clean + one negative scenario/domain; fix only P0/P1.
- **Sat 26 Sep:** Docs/runbooks - Update source registry, deployment/recovery, known issues and demo/release notes.
- **Sun 27 Sep:** Freeze readiness - Highest remaining P0/P1 or verification PASS; no new feature.
- **Mon 28 Sep:** FEATURE FREEZE - Snapshot exact versions/config/source health; bugs only.
- **Tue 29 Sep:** Frozen regression - Contract/golden/UI/source subset; smallest bug fixes only.
- **Wed 30 Sep:** Release-candidate drill - Rollback/fallback, scheduled freshness, public smoke.
- **Thu 1 Oct:** Final security/source audit - IAM/secrets/logging/source provenance/schedules.
- **Fri 2 Oct:** Release eve - Final regression, release notes, no optional changes.
- **Sat 3 Oct:** FINAL RELEASE - Deploy/verify pinned release, monitor, publish outcome and known issues.
