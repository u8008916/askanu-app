# AskANU V7 — Day 6: Complete Jobs + Events + Support; feature freeze

**Date:** 2026-09-26  
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

Complete the remaining three domains using the same conversational components.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Jobs result/refinement/requirements UI.
- 2–4h — Events cards with safe title/date/time/organiser/location/source/action; no questionable status leakage.
- 4–6h — Support direct answer/service action UI from natural problem language.
- 6–8h — Verify dedicated Upcoming remains backend official-only; frontend does not filter sources.
- 8–10h — Null/loading/error/mobile states.
- 10–12h — Regression all six domain hubs and shared chat.

## Acceptance / do-not-cross lines

- No frontend source filtering.
- No “published” noise/status interpretation.
- No ticket count/free/modality inference.
- No new domain-specific result engines.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; no frontend reasoning/source filtering.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 6's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Accept all six domains and enforce feature freeze.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Run Jobs refinement continuity journey.
- 2–4h — Run Events temporal variants and source-authority checks.
- 4–6h — Run multiple Support natural-problem journeys.
- 6–8h — Verify six domains all use shared state/planner/result/evidence semantics.
- 8–10h — Classify remaining defects as P1/P2/release-safe limitation.
- 10–12h — Freeze features; publish Day 7 torture corpus.

## Acceptance / do-not-cross lines

- Any domain-specific state/retrieval bypass = architecture defect.
- Feature freeze is real.
- Known limitations must be explicit, not hidden.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit next-day/release GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 6's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
