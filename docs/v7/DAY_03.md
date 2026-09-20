# AskANU V7 — Day 3: Build retrieval + reasoning

**Date:** 2026-09-23  
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

Build reusable result-set, comparison, and evidence-aware response components.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Render bounded ordered results using backend order exactly.
- 2–4h — Canonical “Ask about this” / selected-result actions return entity identity.
- 4–6h — Reusable comparison UI preserves missingness.
- 6–8h — Render distinct EMPTY/NO_MATCH and useful UNKNOWN states; unknown = direct answer + evidence gap + next action.
- 8–10h — Test Accommodation/Scholarship/Jobs/Events fixtures.
- 10–12h — Mobile/keyboard/accessibility/build regression.

## Acceptance / do-not-cross lines

- No independent sort/rerank.
- No eligibility/vacancy inference.
- UNKNOWN is not styled/worded as no results; EMPTY is not styled as evidence failure.
- No vector scores.
- No domain-specific duplicate result engines.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; no frontend reasoning/source filtering.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 3's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Gate shared retrieval/reasoning before vertical expansion.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Run lookup/discovery/filter/match/compare operation matrix.
- 2–4h — Test “second one”, typed older result references, and result refinements.
- 4–6h — Test hard constraint preservation and domain-scoped constraint expiry.
- 6–8h — Review Recall@K + latency baseline; freeze numeric maximum student-facing latency targets for lookup/follow-up/discovery plus maximum acceptable regression threshold.
- 8–10h — Verify EMPTY/NO_MATCH vs UNKNOWN/PARTIAL behaviour, source authority, and bounded state retention.
- 10–12h — Publish Accommodation Day 4 GO/HOLD.

## Acceptance / do-not-cross lines

- Silent constraint drop = blocker.
- Unstable result identity/order = blocker.
- UI rerank = blocker.
- Do not demand embeddings without evidence.
- Day 3 cannot close until numeric performance release gates are frozen from measured evidence.
- UNKNOWN converted to NO_MATCH = blocker.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit next-day/release GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 3's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
