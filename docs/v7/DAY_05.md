# AskANU V7 — Day 5: Complete Courses + Scholarships

**Date:** 2026-09-25  
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

Present Courses and Scholarship journeys using shared result/clarification/comparison states.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Course answers stay concise first; expandable evidence/source treatment.
- 2–4h — Render scholarship matching results with reasons tied to approved evidence.
- 4–6h — Render missing-student-info clarification without implying eligibility.
- 6–8h — Render deadline/open-state and selected scholarship follow-ups.
- 8–10h — Support course/scholarship cross-domain return.
- 10–12h — Desktop/mobile/accessibility regression.

## Acceptance / do-not-cross lines

- No UI-generated match score.
- No eligibility badge unless backend semantics explicitly support it.
- No duplicate domain bot.
- No fake study-plan certainty.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; no frontend reasoning/source filtering.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 5's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Gate the hardest academic/matching journeys.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Run Course capability matrix: lookup/prereqs/units/offering facts/study-plan boundary/comparison/unknown.
- 2–4h — Run Scholarship journey: international Computing student → matches → still open → hardship criterion → second one → deadline → “am I eligible?”.
- 4–6h — Verify all three eligibility states.
- 6–8h — Run 5 natural-language variants for key intents.
- 8–10h — Test return to course after scholarship result set.
- 10–12h — Publish Day 6 GO/HOLD.

## Acceptance / do-not-cross lines

- Named course lookup alone is insufficient.
- Generic scholarship results that violate hard constraints = blocker.
- Eligibility overclaim = blocker.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit next-day/release GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 5's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
