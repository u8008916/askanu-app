# AskANU V7 — Day 1: Freeze shared V7 contracts

**Date:** 2026-09-21  
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

Freeze reusable conversational UX contracts in the existing AskANU visual system.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Inventory current chat/resource pages/clarification/Clear Chat/mobile states.
- 2–4h — Define UI contracts for result set, selected result, clarification, comparison, partial, and useful unknown.
- 4–6h — Create 3 V7 target mock states using the existing AskANU design language.
- 6–8h — Specify canonical result action payload; frontend never invents identity/order.
- 8–10h — Define Clear Chat visual + backend reset semantics.
- 10–12h — Publish component/state matrix and exact backend field needs.

## Acceptance / do-not-cross lines

- No whole-app redesign.
- No ranking/filtering/source logic in React.
- No persistent profile/login.
- Mock states become acceptance references.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; no frontend reasoning/source filtering.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 1's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Freeze V7 behaviour, acceptance corpus, and owner boundaries before implementation spreads.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Confirm in/out scope, feature freeze, and protected contingency.
- 2–4h — Freeze finite V7 Intent Registry: domain, canonical intent, YES/BOUNDARY/OUT, slots, operations, five-variant set; freeze deterministic session-retention/eviction policy.
- 4–6h — Write canonical 1/3/10/20-turn journeys and verify every V7=YES intent has at least 5 materially different formulations.
- 6–8h — Add ambiguity, correction, constraint override/scope, result-set recency, interruption, unknown, contradiction, injection, and Clear Chat cases.
- 8–10h — Review Carmen/Will/Ben contracts and resolve mismatches.
- 10–12h — Publish GO/HOLD per owner and Day 2 dependencies.

## Acceptance / do-not-cross lines

- No unresolved P1 contract disagreement.
- No unregistered V7=YES intent may be added later without explicit PM scope change.
- Bounded retention is operationally frozen before Day 2 with explicit maximum retained entity/result-set entries or equivalent deterministic eviction rules and 20-turn acceptance support.
- EMPTY-vs-UNKNOWN semantics are frozen before Day 2.
- Engineering readiness and experience readiness remain separate.
- Do not skip contract freeze for schedule pressure.
- No Day 1 deployment.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit next-day/release GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 1's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
