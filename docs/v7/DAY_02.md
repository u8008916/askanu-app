# AskANU V7 — Day 2: Implement context + understanding

**Date:** 2026-09-22  
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

Integrate backend-driven session/clarification behaviour and real Clear Chat semantics.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Wire stable session/reset mechanism; no client-side entity memory.
- 2–4h — Render meaningful backend clarification options + free text where allowed.
- 4–6h — Clear messages, pending UI, selected/result UI, and backend session together.
- 6–8h — Allow domain switch during clarification without trapping the user.
- 8–10h — Test desktop + 360/390/430 + keyboard/touch.
- 10–12h — Regression six domain launchers and V6 safe response states.

## Acceptance / do-not-cross lines

- No intent inference in UI.
- No localStorage student profile.
- No empty clarification options.
- Clear Chat proves stale follow-up cannot resolve.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; no frontend reasoning/source filtering.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 2's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Accept the shared understanding layer before Day 3 retrieval work.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Review actual diffs against Day 1 contracts.
- 2–4h — Run explicit entity, alias, pronoun, typed reference, correction, override, and clarification tests.
- 4–6h — Verify constraint scoping across domain switches.
- 6–8h — Verify typed ResultSet recency/ordinal semantics.
- 8–10h — Verify Clear Chat backend + UI reset.
- 10–12h — Classify defects and publish Day 3 GO/HOLD.

## Acceptance / do-not-cross lines

- Repeatable state leak, constraint leak/loss, or clarification trap = P1.
- Do not call Day 2 complete from unit tests alone.
- No embeddings work before stable inputs.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit next-day/release GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 2's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
