# AskANU V7 — askanu-app Execution Plan

**Execution window:** 21–28 September 2026  
**Primary lane:** App / UI / student-facing experience  
**Source of truth:** frozen AskANU V7 master execution plan.

## How to use this folder

Open the current day's file before starting work. The day is complete only when the required acceptance evidence exists; code alone is not completion.

Each day file contains only the work this repository/owner needs, plus cross-repo dependencies and gates necessary to avoid implementing another repository's responsibilities.

## Frozen repo boundaries

- Ben owns App/UI implementation. Qasim owns product acceptance, integration gates, and release decisions; both sets of daily instructions are included here.
- Frontend renders backend semantics; it does not invent ranking, entity identity, eligibility, vacancy, source filtering, or institutional reasoning.
- Preserve the existing AskANU visual system; V7 is not a whole-app redesign.
- Clear Chat must reset visible and backend session state together.
- Dedicated Upcoming Events consumes the backend official-only feed; broader event discovery happens through chat.
- Day 8 deploys only the Day 7 frozen RC SHA/digest after backend/data gates.

## Shared V7 invariants

- AskANU should feel like talking to an ANU-aware assistant, not searching an ANU database.
- Never make the student learn how to prompt AskANU.
- Understand → Remember → Retrieve → Reason → Communicate.
- Session state is structured and bounded; conversation history alone is not state.
- DOMAIN, ENTITY, INTENT, and CONSTRAINTS are separate.
- Answer epistemic state is CONFIRMED / DERIVED / PARTIAL / UNKNOWN.
- ResultSet state is RESULTS / EMPTY / INCOMPLETE; UNKNOWN must never be converted into NO_MATCH.
- Hard constraints are never silently ignored.
- Missing evidence remains unknown rather than false.
- Every V7=YES intent must pass at least five materially different formulations.
- Feature expansion stops at the end of Day 6. Day 7 is torture/integration; Day 8 is release.
- Engineering readiness and experience readiness are reported separately.

## Files

- `DAY_01.md` … `DAY_08.md` — repo-specific daily execution briefs.
- `FINAL_RELEASE_ACCEPTANCE.md` — shared release gate relevant to all repos.
