# AskANU V6 - Ben day-by-day tasks

**Ownership:** App/UI
**Primary repo:** askanu-app

## V6 execution rule

A day is not complete because code exists. Use the acceptance criteria/evidence from the V6 PDF. Domain Complete requires >=99% entity + required source-present information + capability coverage and 100% critical provenance/safety.

## Day 11 - Tue 15 Sep 2026 - 3h

**Focus:** App/UI - first-three-domain breadth regression + large-data assumptions audit

**Primary outcome:** Use the short block to make sure Courses, Scholarships and Jobs UI can present broad real datasets and clarification states without hidden sample-size assumptions.

**Work map:**
- **0-1h - Breadth assumptions:** Inspect Courses/Scholarships/Jobs components for hard-coded sample counts, one-record assumptions, brittle long-text/source-card rendering or local sorting.
- **1-2h - Edge-state tests:** Add/fix tests for many results, long titles/requirements, missing fields, clarification, partial/insufficient evidence and source links.
- **2-3h - Small fixes:** Land only shared-component fixes needed for expanded data; keep launcher pages compact and preserve current visual system.

**Acceptance criteria:**
- No one-record/sample-size assumptions remain in affected shared components.
- Long/missing-field/source-card states are tested.
- No independent scholarship/jobs sorting contradicts backend deterministic logic.
- Existing build and affected frontend tests remain green.

**Evidence:**
- Small App PR/SHA or audit note.
- Focused tests + production build result.
- Desktop/mobile screenshots if a shared layout fix is made.
- List of backend/data contract gaps only - no silent workaround.

**Do not / escalate:**
- Do not redesign domain pages.
- Do not add fake local data.
- Do not reimplement temporal/status logic in React.

**Copy-paste AI kickoff:**

> You are Ben in askanu-app on V6 Day 11. Read repo instructions, current guided-domain components and API contract first. The data layer is expanding from bounded vertical slices toward 99% coverage. Audit Courses, Scholarships and Jobs for assumptions that only work with one or a handful of records: hard-coded counts, frontend re-sorting, long text clipping, source-card overflow, missing-field rendering and clarification states. Fix only reproduced shared UI issues. Do not hard-code data to make breadth tests pass. Keep Browser/Firebase -> App -> private RAG and preserve the current AskANU visual system. End with focused tests/build evidence and any backend contract gap.

## Day 12 - Wed 16 Sep 2026 - 14h

**Focus:** App/UI - Accommodation + Support broad-data integration + five-domain UX regression

**Primary outcome:** Ship both guided domains against real broad data and make the five completed domains behave as one accessible, consistent AskANU experience.

**Work map:**
- **0-3h - Shared-page prep:** Finalize configs/resources and component tests for long labels, missing fields, clarification, source cards, loading/error/partial states.
- **3-7h - Accommodation UI:** Integrate guided page and chat handoff; verify comparison/cost/application/source states on desktop + 360/390/430px.
- **7-11h - Support UI:** Integrate Support launcher/routing states with careful wording; ensure urgent/high-stakes responses clearly expose official sources without false guarantees.
- **11-14h - Five-domain regression:** Courses/Scholarships/Jobs/Accommodation/Support navigation, guided intent, chat, reset, source cards, keyboard/focus/contrast, long content and mobile.

**Acceptance criteria:**
- Both new domain pages use shared layout and official resources.
- Guided card -> New Chat -> clarification/answer/source works.
- Desktop/mobile/accessibility core checks pass across all five domains.
- No horizontal overflow or unsafe hard-coded fallback content.
- Existing three-domain pages remain green.

**Evidence:**
- App PR/SHA; tests/build output.
- Five-domain screenshot matrix desktop/mobile.
- One multi-turn flow showing clarification/reset/source cards.
- Any backend contract gaps listed explicitly.

**Do not / escalate:**
- Do not hard-code domain answers.
- Do not create separate bots.
- Do not add unsupported hours/hotlines from memory.
- Do not redesign global chrome on integration day.

**Copy-paste AI kickoff:**

> You are Ben in askanu-app on V6 Day 12. Read the V6 Accommodation/Support contracts and existing shared guided-domain components first. Integrate the two new domains against real backend data. Keep cards as entry points into the single AskANU chat. Accommodation must never imply live vacancy. Support UI must never invent hours or emergency coverage. Render only contract-visible facts/source cards and make needs_clarification/partial/insufficient/error states understandable. Test broad data, long content and source links across desktop and 360/390/430px widths. Fix shared components once rather than page-specific hacks. No global redesign.

## Day 13 - Thu 17 Sep 2026 - 14h

**Focus:** App/UI - full five-domain UX hardening + demo journeys + fallback assets

**Primary outcome:** Make the Friday experience polished, accessible and reproducible across the five completed domains, with no hidden data/backend gap masked by UI.

**Work map:**
- **0-4h - Five-domain UX matrix:** Run launcher/resources/chat/source/loading/error/partial/clarification/reset across desktop and 360/390/430px; fix shared P0/P1 defects.
- **4-8h - Accessibility + mobile:** Keyboard/focus/touch/contrast, long labels/content, source links/cards, no horizontal overflow, screen-size matrix.
- **8-11h - Demo journeys:** Prepare strong guided flows for Courses, Scholarships, Jobs, Accommodation and Support plus cross-domain follow-up/reset and insufficient-evidence example.
- **11-14h - Fallback assets + freeze:** Capture desktop/mobile screenshots, known-good answer/source states and loading/error fallbacks; production build; record App/Firebase version.

**Acceptance criteria:**
- Five domain launchers/chats pass desktop/mobile/accessibility core checks.
- No P0 visual/function defects remain.
- Five demo journeys + cross-domain flow + negative example rehearsable.
- Production build green and Firebase route healthy.
- Fallback screenshot set complete.

**Evidence:**
- App SHA/build/Firebase release evidence.
- Five-domain screenshot matrix.
- Demo journey checklist + fallback assets.
- P1/P2 UI issue list with owners.

**Do not / escalate:**
- Do not redesign global chrome.
- Do not hard-code answers or event data.
- Do not independently change backend truth/ordering.
- Do not merge optional polish after RC freeze.

**Copy-paste AI kickoff:**

> You are Ben in askanu-app on V6 Day 13. Treat this as a release-candidate UX hardening day. Run the five completed domains as one product, fix shared P0/P1 defects centrally, and verify desktop/mobile/accessibility/source-card/loading/error/clarification/reset states against real data. Prepare repeatable Friday demo journeys and fallback screenshots. Do not redesign the product or hard-code missing backend data. Events/Rubric is intentionally completed Saturday; if Events navigation exists, keep its state truthful rather than pretending it is 99% complete. End with a production build, exact SHA/release and screenshot matrix.

## Day 14 - Fri 18 Sep 2026 - 14h

**Focus:** App/UI - presentation-day UX stability + stakeholder feedback mapping

**Primary outcome:** Protect the pinned public experience, support the demo with fallback assets and convert UI feedback into evidence-based issues after the presentation.

**Work map:**
- **0-3h - Final UI smoke:** Public Hosting, five launchers, New Chat handoff, source cards, loading/error/clarification/reset, desktop/mobile/accessibility spot check.
- **3-6h - Demo assets:** Verify fallback screenshots, external official links, current browser route and presenter flow; fix only P0.
- **6-10h - Presentation support:** Run/assist guided journeys; if network/UI fails, use known fallback rather than improvising code. Capture UX comments verbatim.
- **10-14h - Feedback mapping:** Classify UI comments as confirmed defect, accessibility issue, preference or optional enhancement; reproduce before opening Saturday/Sunday work.

**Acceptance criteria:**
- Public five-domain UI smoke passes.
- No P0 UI defect remains unmitigated.
- Presentation can continue from fallback assets if needed.
- Feedback is classified with reproduction/acceptance where appropriate.

**Evidence:**
- Final UI smoke/build SHA.
- Fallback asset checklist.
- UX feedback board with P0/P1/P2/TBC.
- Any P0 fix PR + screenshot evidence.

**Do not / escalate:**
- Do not redesign during presentation day.
- Do not hard-code answers/events.
- Do not change backend truth/order in the UI.

**Copy-paste AI kickoff:**

> You are Ben on V6 Day 14. Protect the pinned AskANU App/Firebase build. Run a targeted five-domain public smoke and only fix a release-blocking P0 with regression evidence. Verify fallback screenshots/source links and the presenter flow. During the GDG ANU demo, do not redesign or patch live. After the meeting, map each UX comment to a reproduced defect, accessibility issue, preference or optional enhancement; do not label taste as mandatory. Preserve the shared-component architecture and do not hard-code missing Events data.

## Day 15 - Sat 19 Sep 2026 - 14h

**Focus:** App/UI - Events guided page + six-domain UX + accepted feedback

**Primary outcome:** Complete the Events experience against real stored data, then incorporate accepted high-value UI feedback and run six-domain UX hardening.

**Work map:**
- **0-3h - Events page + states:** Integrate cards/resources and New Chat handoff; today/this-week/interest/new-student wording only where backend/source contract supports it.
- **3-7h - Real-data integration:** Test event result/source/date/location/format/registration states, no-match/clarification/loading/error and mobile against stored broad data.
- **7-10h - Accepted feedback:** Implement highest-value confirmed UI/accessibility feedback using shared components; avoid preference-driven redesign.
- **10-14h - Six-domain hardening:** Run navigation/chat/source/accessibility/mobile/long-content/partial-error/reset matrix across all six domains; refresh screenshot assets.

**Acceptance criteria:**
- Events UI works from stored real data with official sources.
- No hard-coded events or request-time external browser calls.
- Accepted feedback fixes pass tests/build.
- Six-domain desktop/mobile/accessibility core matrix passes.
- Updated fallback/demo assets exist.

**Evidence:**
- App PR/SHA + tests/build.
- Events + six-domain screenshot matrix.
- Accepted feedback evidence.
- Any remaining UX P1/P2 list.

**Do not / escalate:**
- Do not redesign global chrome.
- Do not hard-code event facts.
- Do not add unclassified feedback scope.
- Do not create separate bot/profile.

**Copy-paste AI kickoff:**

> You are Ben in askanu-app on V6 Day 15. Integrate the sixth Events guided page against real backend data; no hard-coded event cards/answers. The page routes users into the single AskANU chat and renders only source-backed date/time/location/format/category/registration details. Support clarification/no-match/partial/error states and verify mobile/accessibility. Then implement only Friday feedback that Qasim classified and accepted. Finish with a full six-domain UX regression and updated screenshots. Keep the current AskANU visual system and do not create a separate events bot.

## Day 16 - Sun 20 Sep 2026 - 15h

**Focus:** App/UI - final six-domain accessibility, mobile, resilience and polish sweep

**Primary outcome:** Close remaining release-significant UI defects across all six domains and leave only bounded one-hour fixes after Sunday.

**Work map:**
- **0-3h - Six-domain defect audit:** Run desktop/mobile/accessibility/source/loading/error/partial/clarification/reset matrix and rank reproducible P0/P1/P2.
- **3-7h - Close P0/P1 UX gaps:** Fix shared components for overflow, focus, keyboard/touch, long results/source cards, unsafe link/rendering, loading/error and state clarity.
- **7-11h - Conversation + resilience:** Cross-domain multi-turn, correction/topic-switch, Clear/New Chat, refresh behavior, upstream unavailable states and no fake data.
- **11-15h - Performance + freeze assets:** Inspect network/bundle/cache behavior, production build, updated screenshots, docs/known issues and final UI handoff for one-hour phase.

**Acceptance criteria:**
- No open UI P0; every P1 has owner/plan.
- Desktop/mobile/accessibility core matrix passes all six domains.
- Upstream failure/partial/clarification/reset states are safe and understandable.
- Production build/network/cache behavior is verified.
- Remaining UI work fits one-hour slices.

**Evidence:**
- Final App SHA/build/test output.
- Six-domain desktop/mobile/accessibility matrix.
- Updated screenshot/fallback assets.
- Known issues + one-hour backlog.

**Do not / escalate:**
- Do not redesign global chrome.
- Do not hard-code answers.
- Do not add persistent history/accounts.
- Do not chase optional styling while correctness gaps remain.

**Copy-paste AI kickoff:**

> You are Ben in askanu-app on V6 Day 16, the final planned heavy UI day. Run the full six-domain product against real data and current backend. Prioritize P0/P1 correctness, accessibility, mobile, source-card safety, clarification/reset clarity and upstream failure behavior. Fix shared components rather than page-specific hacks. Exercise long content and event/job/scholarship lists, safe links/rendering and cross-domain conversation states. Check production network/cache/bundle behavior only with evidence. Refresh fallback screenshots to match the pinned build. End with production build/tests, exact remaining issues and a one-hour-sized backlog. No redesign or new feature.

## 21 Sep - 3 Oct: one-hour hardening phase

### Day 17 - Mon 21 Sep - SECURITY + PRIVACY AUDIT
- **~45 min:** Safe-render/external-link/secret-in-bundle check with hostile strings; fix top issue.
- **~15 min proof:** App security PASS/PR.

### Day 18 - Tue 22 Sep - ACCESSIBILITY + MOBILE PASS
- **~45 min:** Keyboard/focus/touch/contrast/360-430px across representative six-domain states; fix top blocker.
- **~15 min proof:** Accessibility/mobile PASS/PR.

### Day 19 - Wed 23 Sep - FAILURE + RECOVERY PASS
- **~45 min:** Exercise upstream unavailable/partial/error states with no fake data/internal details.
- **~15 min proof:** App failure-state PASS/PR.

### Day 20 - Thu 24 Sep - PERFORMANCE + COST PASS
- **~45 min:** Inspect bundle/network/cache and interaction latency; fix one measured frontend issue.
- **~15 min proof:** App performance note/PR.

### Day 21 - Fri 25 Sep - SIX-DOMAIN REGRESSION
- **~45 min:** Navigation/resource/chat/reset/source desktop + mobile representative smoke.
- **~15 min proof:** App regression note.

### Day 22 - Sat 26 Sep - DOCS + RUNBOOKS
- **~45 min:** Update App/Firebase setup, guided-domain/session/error behavior and screenshot references.
- **~15 min proof:** App docs PR/PASS.

### Day 23 - Sun 27 Sep - FREEZE READINESS
- **~45 min:** Close top UI/mobile/accessibility P0/P1; no layout redesign.
- **~15 min proof:** App freeze-readiness note.

### Day 24 - Mon 28 Sep - FEATURE FREEZE
- **~45 min:** Run empty/active/mobile/resource smoke; move cosmetics/features to backlog.
- **~15 min proof:** App freeze note.

### Day 25 - Tue 29 Sep - FROZEN REGRESSION
- **~45 min:** Run frozen guided-domain/chat/mobile/source subset; smallest blocker fix only.
- **~15 min proof:** App frozen-regression PASS/PR.

### Day 26 - Wed 30 Sep - RELEASE-CANDIDATE DRILL
- **~45 min:** Deploy known App/Firebase build; desktop/mobile guided flow smoke.
- **~15 min proof:** App RC drill evidence.

### Day 27 - Thu 1 Oct - FINAL SECURITY + SOURCE AUDIT
- **~45 min:** Dependency audit + production-bundle secret/safe-link scan.
- **~15 min proof:** App final security report.

### Day 28 - Fri 2 Oct - RELEASE EVE
- **~45 min:** Final desktop/mobile/source-card smoke + current fallback screenshots.
- **~15 min proof:** Final UI smoke/assets.

### Day 29 - Sat 3 Oct - FINAL RELEASE
- **~45 min:** Confirm public build; core desktop/mobile/source-card smoke.
- **~15 min proof:** App final health.
