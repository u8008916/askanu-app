# AskANU V7 — Day 4: Prove Accommodation vertical

**Date:** 2026-09-24  
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

Ship the Accommodation vertical UX using shared components.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Render source-backed discovery cards and canonical actions.
- 2–4h — Keep refinements/selected result understandable in chat.
- 4–6h — Render comparison with neutral unknown fields.
- 6–8h — Render vacancy unknown + official next action without error styling.
- 8–10h — Verify interruption/return and Clear Chat.
- 10–12h — Desktop/mobile/keyboard regression against target mock states.

## Acceptance / do-not-cross lines

- No frontend price/catering/vacancy reasoning.
- No redesign.
- No hidden backend defect via UI workaround.
- Backend order/identity preserved.

## Evidence to hand off

PR/SHA; screenshots; focused + full tests/build; mobile/accessibility evidence; backend contract gaps; no frontend reasoning/source filtering.

## Copy-paste AI kickoff prompt

You are Ben working on AskANU V7 in the App/UI lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 4's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

# Qasim — Product / Integration Gate

This section is not Ben implementation scope. It is the acceptance/integration work Qasim performs against today's App and cross-repo state.

## Primary outcome

Use Accommodation as the architecture checkpoint before expanding to five domains.

## Start / stop contract

**Start from:** latest reviewed main + all prior-day accepted contracts/evidence. On Day 8, use the Day 7 frozen RC manifest rather than arbitrary newer main.

**STOP and escalate** if the work requires silently changing shared API/schema/source authority, moving institutional reasoning to the wrong repo, or violating a frozen invariant.

## Work map

- 0–2h — Run unfamiliar-student journey: broad → self-catered → price → compare → second → cost → vacancy → apply.
- 2–4h — Interrupt with course question then return to accommodation/result.
- 4–6h — Test ambiguous pronoun, missing price, override, Clear Chat, and 5 phrasing variants.
- 6–8h — Reject domain-specific bypasses or magic wording.
- 8–10h — Separate shared architecture defects from genuine data limitations.
- 10–12h — Publish Day 5 GO/HOLD and engineering vs experience snapshot.

## Acceptance / do-not-cross lines

- Any general architecture defect blocks Day 5.
- Truthful unsupported filter is better than fake compliance.
- Do not let 19/19 data coverage mask UX defects.

## Evidence to hand off

Reviewed SHAs; golden conversation matrix; defects/owners; engineering vs experience snapshot; explicit next-day/release GO/HOLD.

## Copy-paste AI kickoff prompt

You are Qasim working on AskANU V7 in the PM/integration/product lane. Start from latest reviewed main and the frozen V7 behavioural contract. Implement only Day 4's scope through shared primitives. Do not invent unsupported institutional facts, silent source/schema/API changes, domain-specific state engines, or magic-wording shortcuts. Show planned files, behavioural impact, tests, risks and dependencies before implementation. Finish with exact evidence that Qasim can review against today's gate.

---

## Cross-repo handoff rule

If today's work exposes a requirement owned by another repository, record the exact contract/evidence gap and hand it to Qasim. Do not silently implement the other repository's responsibility here.
