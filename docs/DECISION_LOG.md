# DECISION_LOG.md

Record only decisions that change V3 contracts, architecture, source policy, scope, security/privacy rules, or schedule.

| Date | Decision | Why | Affected repos/docs | Owner | Approved by |
|---|---|---|---|---|---|
| 2026-09-12 | Resource pages become compact **guided-intent launchers**: 3–5 recommended-question cards on top, compact official links at the bottom. A card places its question in the single chat composer as an editable draft, focuses it and navigates to `/`; it never auto-sends and does not clear the current conversation. Supersedes the V3 wording "resource pages are information hubs" (`V3_LOCKED_DECISIONS.md` §Product/UI, `AGENTS.md` locked UX). Still one chatbot, still `Clear Chat`, still no chat input on domain pages. Desktop no-scroll acceptance viewport: 1280×720. | AskANU V5 Execution Plan §3 "V5 product/UX contract: guided domain launchers" and §1 "What changed from V4". | askanu-app: `AGENTS.md`, `docs/V3_LOCKED_DECISIONS.md`, `my_day_by_day_tasks.md`. No API/schema/source change. | Ben | Qasim — PR #27 review, 12 Sep 2026: 1280×720 frozen as the minimum supported desktop viewport; card click keeps the current session (only explicit Clear Chat resets); plain question text into the existing composer, no new `/api/v1/ask` field |

If a decision changes a shared contract, update every affected repo in the same work cycle.
