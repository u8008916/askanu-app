# AskANU V7 — Day 8: Production release + post-deploy acceptance

**Date:** 2026-09-28  
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

Deploy reviewed App and prove the public student path.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Deploy reviewed App only after backend/data gate, using the Day 7 frozen RC.
- 2–4h — Run public Firebase path across six domains.
- 4–6h — Verify target V7 result/comparison/unknown/clarification states.
- 6–8h — Run mobile public-path smoke.
- 8–10h — Verify Clear Chat and canonical source actions.
- 10–12h — Record screenshots/build/deploy evidence.

## Acceptance / do-not-cross lines

- Do not claim a state works from local fixtures only.
- No frontend source filtering.
- No hidden fallback regressions.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; exact deploy evidence.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 8's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Make the final release decision from deployed evidence, not implementation optimism.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Execute canonical release gate: freeze exact SHAs/digests; confirm backup/rollback; authorize migrations/data writes.
- 2–4h — Verify DB/data → RAG deploy/smoke → App deploy/public smoke in canonical order; then run unfamiliar-student north-star.
- 4–6h — Run six-domain acceptance matrix and key negative tests; publish V7=YES intents passed / total V7=YES intents and required five-variant results.
- 6–8h — Score engineering readiness and experience readiness separately.
- 8–10h — Confirm known limitations are truthful and non-blocking.
- 10–12h — Issue explicit GO/HOLD with blockers, owners, and contingency plan.

## Acceptance / do-not-cross lines

- Ultimate criterion: ordinary questions work without magic wording.
- If public-path evidence disagrees with local evidence, public path wins.
- 29 Sep–3 Oct remains contingency, not feature expansion.
- Mandatory release order: SHAs → rollback → migrations → bounded writes → DB verify → RAG → backend smoke → App → public smoke → north-star → negative suite → GO/HOLD.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit final GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 8's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
