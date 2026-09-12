# Ben's AskANU V3 Day-by-Day Tasks

**Primary lane:** App / UI / React

This is a role-filtered copy of the V3 schedule. The shared objective is included so you can see what the rest of the team needs from you.

**Daily rule:** finish the listed deliverable, run the listed verification, surface blockers immediately, and do not invent new scope when blocked.

## Day 1 — Saturday, 05 September 2026 — 5h/person
**Phase:** BOOTSTRAP + CONTRACT FREEZE
**Shared objective:** Make all three repos usable, aligned, and safe for AI-assisted development.

### Ben - App repo
**Goal:** Create the confirmed desktop/mobile UI shell before styling details.
**Do:**
- Create React app structure and shared theme/design-token file.
- Build desktop layout: chat primary/left; navigation/resources right.
- Build empty chat state with input + `Try asking`; implement `Clear Chat` state reset in mock form.
- Create responsive drawer breakpoint for mobile and placeholder Quick Links / Events / Jobs cards.
  **Verify:** Check desktop and 360/390/430px widths; no horizontal scroll; suggestions visible only in empty state.
  **Deliverable:** PR: App bootstrap with responsive shell and mock states.
  **Dependency / fallback:** Consumes API/UX contract; does not need backend. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: All three repos run locally, contract docs match, and each owner has a mergeable Day 1 PR.

## Day 2 — Sunday, 06 September 2026 — 5h/person
**Phase:** COURSES DATA FOUNDATION
**Shared objective:** Prove the course/program source can become structured records that RAG and UI can consume.

### Ben - App repo
**Goal:** Build active-conversation rendering and source cards against mock contract responses.
**Do:**
- Remove `Try asking` automatically after the first user message.
- Render user turn, AskANU answer, timestamp/metadata only if useful, and source cards with external-link affordance.
- Build `ok`, `insufficient_evidence`, `off_topic`, loading and safe error visual states.
- Keep Quick Links / Upcoming Events / Current Jobs visible in right resource area.
  **Verify:** Use mocked contract fixtures; source URLs are clickable; `Clear Chat` restores empty state.
  **Deliverable:** PR: active chat + source cards + core response states.
  **Dependency / fallback:** Uses API_CONTRACT; no real backend required. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: One real ANU course/program page can be normalized into a shared record shape and rendered as a mocked grounded answer.

## Day 3 — Monday, 07 September 2026 — 5h/person
**Phase:** FIRST LOCAL VERTICAL SLICE
**Shared objective:** Make a real ANU course question travel from collected data to the browser with a real source link.

### Ben - App repo
**Goal:** Connect the React chat to the real local App/RAG path.
**Do:**
- Create API client using `VITE_API_BASE_URL`/App integration boundary.
- Wire send/loading/response/error states to the real `/api/v1/ask` response.
- Keep mock fixtures available for UI tests, but do not hardcode answer content in production path.
- Verify source card opens the original ANU page.
  **Verify:** Local browser asks COMP1110 and displays real backend response + source card.
  **Deliverable:** PR: real local API integration.
  **Dependency / fallback:** Needs Carmen endpoint reachable; should not wait for Gemini. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: A student can ask one real course question locally and get a grounded answer with an official ANU source link.

## Day 4 — Tuesday, 08 September 2026 — 5h/person
**Phase:** GROUNDED GEMINI + ABSTENTION
**Shared objective:** Add model synthesis without allowing the model to outrun evidence.

### Ben - App repo
**Goal:** Polish grounded-answer states without changing information hierarchy.
**Do:**
- Render grounded response with readable paragraphs/lists and source block.
- Make insufficient-evidence/off-topic states clear but compact.
- Ensure user content and answer text are rendered safely rather than as executable HTML.
- Confirm empty-state suggestions still disappear after first question.
  **Verify:** Mock and real responses all render without layout shift or unsafe HTML execution.
  **Deliverable:** PR: grounded answer presentation + safe rendering tests.
  **Dependency / fallback:** Consumes validated API responses. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: AskANU can use Gemini for a real course answer while preserving evidence, source provenance and abstention.

## Day 5 — Wednesday, 09 September 2026 — 5h/person
**Phase:** COURSE BREADTH + HYBRID RETRIEVAL
**Shared objective:** Turn the single course demo into a reusable course/program retrieval pattern.

### Ben - App repo
**Goal:** Build the Courses resource page and finalise empty-state interaction.
**Do:**
- Create Courses information page with official search/navigation links and useful current info placeholders.
- Add call-to-action that returns user to the single AskANU chat for a course question.
- Refine empty-state suggestion cards and make them keyboard/touch accessible.
- Keep theme tokens central so future visual changes do not rewrite components.
  **Verify:** Courses page is a resource hub, not another chat; suggestion cards work by keyboard and touch.
  **Deliverable:** PR: Courses page + final empty-state component.
  **Dependency / fallback:** Uses approved Programs & Courses links. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Courses are no longer a one-record demo: the team has a tested reusable discovery, storage, retrieval and UI pattern.

## Day 6 — Thursday, 10 September 2026 — 5h/person
**Phase:** EARLY GCP FOUNDATION
**Shared objective:** Get the real system onto GCP early enough that cloud problems cannot surprise the team later.

### Ben - App repo
**Goal:** Make App production-buildable and prepare Firebase/App service routing.
**Do:**
- Create production build config and environment-based API base URL.
- Add thin App server/proxy only where needed by the architecture; keep browser free of DB/model secrets.
- Prepare Firebase Hosting config and responsive fallback routes.
- Verify local production build.
  **Verify:** Production build succeeds and no secret is bundled into frontend assets.
  **Deliverable:** PR: deployable App build + routing config.
  **Dependency / fallback:** Needs Qasim deployment target. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: At least a health-level App -> RAG deployment exists in the real GCP environment.

## Day 7 — Friday, 11 September 2026 — 5h/person
**Phase:** DEPLOYED REAL COURSE SLICE
**Shared objective:** Connect cloud services, Cloud SQL and one real course query end-to-end.

### Ben - App repo
**Goal:** Point deployed frontend/App path at deployed RAG and validate origin/CORS behaviour.
**Do:**
- Deploy React build to Firebase Hosting.
- Route API through intended App service boundary.
- Test loading/error/source-card behaviour on deployed URL.
- Test at least one desktop and one mobile browser width.
  **Verify:** Public demo URL can ask the real course question without direct browser access to RAG DB secrets.
  **Deliverable:** Deployed App/Firebase URL + smoke screenshots.
  **Dependency / fallback:** Needs Carmen deployed endpoint + Qasim routing. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: A real student-facing deployed URL completes the first source-to-answer vertical slice.

## Day 8 — Saturday, 12 September 2026 — 5h/person
**Phase:** SCHEDULED FRESHNESS PROOF
**Shared objective:** Prove AskANU can update safely after source content changes.

### Ben - App repo
**Goal:** Add lightweight freshness/error presentation only where useful.
**Do:**
- Ensure stale/unavailable summary endpoints can show a safe UI state without inventing data.
- Complete Courses resource page source links on deployed build.
- Keep UI uncluttered; do not expose vector scores/internal states to students.
- Run responsive smoke after deployment changes.
  **Verify:** UI degrades safely when summary data is unavailable and does not expose internals.
  **Deliverable:** PR: safe freshness/error UX.
  **Dependency / fallback:** Consumes API status only. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: AskANU has a proven scheduled, change-aware update path rather than a one-time index.

## Day 9 — Sunday, 13 September 2026 — 5h/person
**Phase:** SCHOLARSHIPS DOMAIN
**Shared objective:** Add structured scholarship ingestion, filtering and the 9-card Featured resource page.

### Ben - App repo
**Goal:** Build Scholarships resource page exactly to V3 rules.
**Do:**
- Show up to 9 open Featured scholarships from backend data.
- If fewer than 9 Featured are open, fill by nearest known deadline.
- Each card links to official scholarship page; label status/application requirement clearly.
- Add `Ask about scholarships` action into the single chat; no separate scholarship bot/profile.
  **Verify:** Resource page never labels items “most popular”; closed items do not appear as current.
  **Deliverable:** PR: Scholarships page + tests.
  **Dependency / fallback:** Needs deterministic scholarship data endpoint/mock. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Students can browse current Featured scholarships and ask filtered scholarship questions without persistent profiling.

## Day 10 — Monday, 14 September 2026 — 5h/person
**Phase:** JOBS DOMAIN
**Shared objective:** Add current ANU jobs with deterministic closing-date logic and chat retrieval.

### Ben - App repo
**Goal:** Build Jobs resource page + Current Jobs panel.
**Do:**
- Render current roles with title, type/location/closing date where available.
- Default panel shows 5 and `View all` routes to resource page/official listings.
- Keep all job links canonical and external.
- Test empty/unavailable state without fake jobs.
  **Verify:** UI order matches backend deterministic order and all links are official.
  **Deliverable:** PR: Jobs page/panel + tests.
  **Dependency / fallback:** Consumes jobs endpoint. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: AskANU can deterministically surface current jobs and answer job questions using fresh official data.

## Day 11 — Tuesday, 15 September 2026 — 5h/person
**Phase:** ACCOMMODATION + SUPPORT
**Shared objective:** Add two lower-volatility domains with strict claims boundaries.

### Ben - App repo
**Goal:** Build Accommodation and Support resource pages.
**Do:**
- Accommodation: residence/resources cards, application link, official source links.
- Support: clear categories and direct contact/action links from approved sources.
- Make mental-health/support actions easy to find on mobile without alarmist copy.
- Do not add profile/login or claim live availability.
  **Verify:** Pages are resource hubs with valid official/ANUSA links and accessible mobile layout.
  **Deliverable:** PR: Accommodation + Support pages.
  **Dependency / fallback:** Needs approved source links/data. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Accommodation and Support have real resource pages and grounded chat coverage without overclaiming.

## Day 12 — Wednesday, 16 September 2026 — 5h/person
**Phase:** EVENTS RELEASE SOURCE
**Shared objective:** Ship Events using an approved source while keeping Rubric optional and permission-gated.

### Ben - App repo
**Goal:** Build Events resource page + Upcoming Events panel.
**Do:**
- Show 5 upcoming events in panel, `View all` for resource page.
- Cards show title/date/time/organiser/location when present and link to canonical source.
- Do not imply Rubric coverage unless approved integration is active.
- Test empty/stale state and mobile stacking.
  **Verify:** Panel/page work with official ANU source alone and remain valid if Rubric never arrives.
  **Deliverable:** PR: Events page/panel + tests.
  **Dependency / fallback:** Consumes approved events endpoint. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Upcoming Events works from an approved source; Rubric cannot block the stakeholder demo or release.

## Day 13 — Thursday, 17 September 2026 — 5h/person
**Phase:** CONVERSATION + MOBILE + DEMO STABILISATION
**Shared objective:** Make the six-domain baseline feel coherent as one assistant and freeze tomorrow’s demo scope.

### Ben - App repo
**Goal:** Finish mobile interaction and clarification UI.
**Do:**
- Render selectable clarification options and `both` where allowed.
- Complete mobile drawer with Clear Chat/resource navigation/Quick Links.
- Test 360/390/430px, keyboard focus, touch targets and chat input with mobile viewport.
- Run full UI regression across empty chat and active conversation.
  **Verify:** No horizontal scroll; clarification and Clear Chat work on desktop/mobile.
  **Deliverable:** PR: mobile + clarification final demo baseline.
  **Dependency / fallback:** Needs Carmen clarification responses. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: One deployed, responsive six-domain AskANU baseline is stable enough to rehearse for stakeholders.

## Day 14 — Friday, 18 September 2026 — 5h/person
**Phase:** STAKEHOLDER PRESENTATION
**Shared objective:** Present a stable, real AskANU slice and convert feedback into actionable post-demo work.

### Ben - App repo
**Goal:** Prepare and present the confirmed UI on desktop and mobile.
**Do:**
- Run browser/mobile smoke and verify Clear Chat, sources, resource pages, Events/Jobs panels.
- Fix only P0 visual/interaction defect before presentation.
- Prepare one desktop and one mobile fallback screenshot.
- After demo, convert UI feedback into concrete issues rather than editing live ad hoc.
  **Verify:** Demo UI matches confirmed interaction model and fallback screenshots are available.
  **Deliverable:** UI demo checklist + feedback issues.
  **Dependency / fallback:** Uses frozen demo build. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: A stable AskANU is demonstrated to ANU GDG and the remaining schedule is updated from real feedback.

## Day 15 — Saturday, 19 September 2026 — 1h/person
**Phase:** POST-DEMO TRIAGE
**Shared objective:** Convert stakeholder feedback into a realistic remaining plan without immediately expanding scope.

### Ben - App repo
**Goal:** Review UI feedback and identify one highest-value interaction fix.
**Do:**
- Map each UI comment to confirmed UX vs optional styling.
- If no blocker, choose the most important accessibility/responsive defect.
  **Verify:** No preference is mislabelled as a mandatory requirement.
  **Deliverable:** One prioritised App issue.
  **Dependency / fallback:** Uses stakeholder log. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Every stakeholder comment is triaged; tomorrow starts from actual status, not the old assumption.

## Day 16 — Sunday, 20 September 2026 — 1h/person
**Phase:** TOP DEFECT FIX
**Shared objective:** Use the one-hour window for one tested slice per person, not a new feature.

### Ben - App repo
**Goal:** Fix the highest-priority App defect from Sep 19.
**Do:**
- Implement one bounded UI/accessibility correction.
- Test affected desktop/mobile state.
  **Verify:** Issue acceptance criteria pass.
  **Deliverable:** Small App PR.
  **Dependency / fallback:** If blocked, add component test/reproduction. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: The most important post-demo defects have either a tested fix or a reproducible blocker.

## Day 17 — Monday, 21 September 2026 — 1h/person
**Phase:** SOURCE COMPLETENESS AUDIT
**Shared objective:** Find missing evidence before hardening the model around incomplete data.

### Ben - App repo
**Goal:** Audit resource pages for missing/incorrect links or stale labels.
**Do:**
- Open representative links for all six pages.
- Record only factual/UX gaps, not cosmetic wishes.
  **Verify:** All visible links checked or issue created.
  **Deliverable:** UI source-link audit.
  **Dependency / fallback:** Uses current API data. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: The team knows exactly which remaining failures are evidence gaps versus retrieval/UI defects.

## Day 18 — Tuesday, 22 September 2026 — 1h/person
**Phase:** MOBILE + ACCESSIBILITY
**Shared objective:** Make the confirmed responsive UI usable, not merely visually similar.

### Ben - App repo
**Goal:** Run focused accessibility/mobile pass.
**Do:**
- Keyboard through Clear Chat, nav drawer, suggestions, clarification and source links.
- Check focus visibility, touch targets, labels and 360–430px no-overflow.
  **Verify:** No blocking keyboard/viewport issue in tested path.
  **Deliverable:** Accessibility/mobile PR or PASS report.
  **Dependency / fallback:** Primary owner today. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: AskANU works through the core chat/resource flow on common mobile widths with keyboard-accessible controls.

## Day 19 — Wednesday, 23 September 2026 — 1h/person
**Phase:** SECURITY + PRIVACY
**Shared objective:** Close concrete security/privacy gaps before feature freeze.

### Ben - App repo
**Goal:** Verify safe rendering and external-link handling.
**Do:**
- Test user/model strings containing HTML/script-like content.
- Ensure links use safe target/rel behaviour and no raw HTML execution.
  **Verify:** Malicious strings display as text, not code.
  **Deliverable:** App security PR/PASS.
  **Dependency / fallback:** Frontend only. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Release security/privacy controls are tested and remaining governance questions are explicit.

## Day 20 — Thursday, 24 September 2026 — 1h/person
**Phase:** INGESTION FAILURE + RECOVERY
**Shared objective:** Prove source failures cannot silently corrupt the live index.

### Ben - App repo
**Goal:** Make stale/unavailable data errors understandable without exposing internals.
**Do:**
- Test Events/Jobs unavailable response.
- Use concise fallback copy and preserve chat usability.
  **Verify:** UI degrades gracefully with no fake data.
  **Deliverable:** App failure-state PR/PASS.
  **Dependency / fallback:** Consumes status only. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: One failed source run can be detected, contained and recovered without losing last-known-good data.

## Day 21 — Friday, 25 September 2026 — 1h/person
**Phase:** CONVERSATION EDGE CASES
**Shared objective:** Finish the core session-context behaviours before freeze.

### Ben - App repo
**Goal:** Test clarification interactions end-to-end.
**Do:**
- Test first/second/both/correction/Clear Chat.
- Verify options are accessible on mobile.
  **Verify:** UI state always matches backend pending clarification.
  **Deliverable:** App conversation test/PASS.
  **Dependency / fallback:** Needs Carmen fixtures. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Current-session follow-ups and clarification are reliable enough for release; optional batching cannot jeopardise them.

## Day 22 — Saturday, 26 September 2026 — 1h/person
**Phase:** SIX-DOMAIN REGRESSION
**Shared objective:** Run the whole product as a product, not as six separate demos.

### Ben - App repo
**Goal:** Run complete navigation/resource/chat smoke on desktop and mobile.
**Do:**
- Open each resource page and representative source.
- Check Clear Chat and empty-state suggestions.
  **Verify:** All core navigation works.
  **Deliverable:** App regression note.
  **Dependency / fallback:** Current deployed build. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: The team has a single pre-freeze defect list based on a real six-domain regression run.

## Day 23 — Sunday, 27 September 2026 — 4h/person
**Phase:** 4-HOUR CATCH-UP + INTEGRATION
**Shared objective:** Use the only expanded late-phase day to close critical carry-over before feature freeze.

### Ben - App repo
**Goal:** Close highest-priority UI/mobile P0/P1 items and polish only after tests.
**Do:**
- First 2h: functional/accessibility blockers.
- Next 1h: resource/chat/mobile regression.
- Final 1h: small visual polish only if all blockers are closed.
  **Verify:** No UI P0 remains and confirmed UX is intact.
  **Deliverable:** App catch-up PRs + screenshots/test report.
  **Dependency / fallback:** No layout redesign. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Critical carry-over is closed or explicitly accepted before tomorrow’s feature freeze.

## Day 24 — Monday, 28 September 2026 — 1h/person
**Phase:** FEATURE FREEZE
**Shared objective:** Stop feature growth and lock the release candidate behaviour.

### Ben - App repo
**Goal:** Freeze UI information architecture and component behaviour.
**Do:**
- Run empty/active/mobile/resource smoke.
- Move cosmetic wishes to post-release backlog.
  **Verify:** Confirmed UI unchanged and bug list explicit.
  **Deliverable:** App freeze note.
  **Dependency / fallback:** Bug fixes only. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: AskANU enters bug-fix-only mode with a documented release candidate and known issues.

## Day 25 — Tuesday, 29 September 2026 — 1h/person
**Phase:** CLEAN CLONE + REPRODUCIBILITY
**Shared objective:** Prove the project works from repositories and docs, not only from current laptops.

### Ben - App repo
**Goal:** Run App install/build/test from clean clone.
**Do:**
- Follow documented environment setup.
- Verify production build and local API config.
  **Verify:** App builds without undeclared local dependency.
  **Deliverable:** Clean-clone evidence/PR.
  **Dependency / fallback:** No feature changes. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: The three repos can be reproduced from clean clones using documented configuration.

## Day 26 — Wednesday, 30 September 2026 — 1h/person
**Phase:** SECURITY + DEPENDENCY RELEASE SCAN
**Shared objective:** Run final automated/manual security checks before rehearsal.

### Ben - App repo
**Goal:** Run frontend dependency/safe-render/security-header checks.
**Do:**
- Check dependency audit and production bundle for secrets.
- Verify safe external links/rendering.
  **Verify:** No secret in bundle and no critical dependency blocker.
  **Deliverable:** App security report.
  **Dependency / fallback:** Bug fixes only. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Release candidate has a documented security/dependency/privacy status with no unknown critical blocker.

## Day 27 — Thursday, 01 October 2026 — 1h/person
**Phase:** DEPLOYMENT + RECOVERY REHEARSAL
**Shared objective:** Prove the team can deploy, smoke-test and recover before final day.

### Ben - App repo
**Goal:** Verify Firebase/App deploy and browser recovery path.
**Do:**
- Deploy known RC build.
- Run desktop/mobile smoke after fresh deployment.
  **Verify:** Public URL returns correct build and core flow.
  **Deliverable:** App deployment evidence.
  **Dependency / fallback:** No feature changes. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: The team can deploy the release candidate and recover core services using documented steps.

## Day 28 — Friday, 02 October 2026 — 1h/person
**Phase:** FINAL REGRESSION + DEMO PREP
**Shared objective:** Finish only release blockers and prepare a boring, repeatable final demo.

### Ben - App repo
**Goal:** Run final UI regression and capture fallback screenshots.
**Do:**
- Test confirmed desktop/mobile states.
- Capture current screenshots and verify source/resource links.
  **Verify:** Demo can proceed even if network has a temporary issue.
  **Deliverable:** Final UI smoke + fallback assets.
  **Dependency / fallback:** No new features. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: Release candidate, data and demo are finalised; only emergency fixes remain for Oct 3.

## Day 29 — Saturday, 03 October 2026 — 1h/person
**Phase:** FINAL RELEASE
**Shared objective:** Release AskANU, run smoke tests, and leave a reproducible handover.

### Ben - App repo
**Goal:** Verify final public desktop/mobile experience.
**Do:**
- Check Clear Chat, empty suggestions, sources, navigation, Quick Links, Events and Jobs.
- Confirm public build matches RC.
  **Verify:** Core user flow passes on desktop/mobile.
  **Deliverable:** Final App release check.
  **Dependency / fallback:** Emergency fixes only. If blocked: work only on the listed fallback or tests; do not invent new scope.

**Team integration check:** END-OF-DAY INTEGRATION CHECK: AskANU is released with traceable versions, healthy sources, passing core flows and a clear known-issues/handover record.