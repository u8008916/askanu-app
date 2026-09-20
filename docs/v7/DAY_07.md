# AskANU V7 — Day 7: Cross-domain torture + integration

**Date:** 2026-09-27  
**Repository:** `askanu-app`  
**Primary owner:** Ben  

> **Completion rule:** Today is done only when the acceptance evidence exists — code alone is not completion.

## Repo boundary for today

- Ben owns App/UI implementation. Qasim owns product acceptance, integration gates, and release decisions; both sets of daily instructions are included here.
- Frontend renders backend semantics; it does not invent ranking, entity identity, eligibility, vacancy, source filtering, or institutional reasoning.
- Preserve the existing AskANU visual system; V7 is not a whole-app redesign.
- Clear Chat must reset visible and backend session state together.
- Dedicated Upcoming Events consumes the backend official-only feed; broader event discovery happens through chat.
- Day 8 deploys only the Day 7 frozen RC SHA/digest after backend/data gates.

## Primary outcome

Run full UI integration torture on desktop/mobile and repair release-critical presentation defects.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Replay canonical 1/3/10/20-turn journeys through the real App.
- 2–4h — Verify result order, selected references, comparisons, unknowns, and clarification interruption.
- 4–6h — Test 360/390/430 and desktop; keyboard/touch/accessibility.
- 6–8h — Verify Clear Chat resets visible + backend session state.
- 8–10h — Check source links, loading/error/empty states.
- 10–12h — Do not mask backend defects with frontend heuristics.

## Acceptance / do-not-cross lines

- Every need to teach magic wording is a defect.
- No client-side reasoning patch.
- No new visual redesign.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; no frontend reasoning/source filtering.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 7's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Run the unfamiliar-student release torture and decide whether V7 experience exists.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Execute canonical 1/3/10/20-turn suites end to end.
- 2–4h — Use imperfect phrasing, typos, interruptions, constraint changes, and cross-domain returns.
- 4–6h — Run negative/safety/source-override tests.
- 6–8h — Track engineering readiness separately from experience readiness.
- 8–10h — Compare latency to frozen Day 3 experience targets and regression threshold; record any breach as explicit release defect.
- 10–12h — Publish release candidate GO/HOLD + exact blockers.

## Acceptance / do-not-cross lines

- Green CI cannot substitute for student journey.
- Any magic-wording dependency is a product defect.
- No new features after freeze.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit next-day/release GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 7's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
