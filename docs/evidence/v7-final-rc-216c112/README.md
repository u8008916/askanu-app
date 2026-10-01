# V7 final RC re-verification: RAG `216c112`

**Date:** 2026-09-30
**RAG tested:** `216c112198fcea61d4cfff356907a5e929256191` (`carmen/v7-day7-rc-torture`, "fix: route conversational job discovery", pushed 30 Sep 11:24 after `e88a0d7`).
**App:** `ben/v7-final-ui-polish` at `de876ae8f467d9a979297cc871c64c8ead624d80`. No App code changed; this is evidence only. PR #46 stays MERGE HOLD.

Method is the same as the `e88a0d7` round: a live `create_app` over Carmen's own D4/D5/D6 fixtures with the clock fixed to 14 Sep 2026 (`../v7-final-ui-polish/serve_rc.py`), driven by the unchanged App-faithful scripts. All results are local engineering evidence, not CI.

## Wire

`216c112` changes three files: `interpretation.py`, `job_queries.py` and one test. **OpenAPI is byte-identical to `971e837`** (51 schemas), so no App contract change.

## Results

| Gate | `971e837` | `e88a0d7` | `216c112` |
|---|---|---|---|
| `torture_rc.py` | 47/48 | 47/48 | **47/48** (same single stale case: "older turn's Show more", its expectation predates Option A) |
| Broader matrix (`rc_reverify.py`) | 281/284 | 282/284 | **282/284** (rows identical to `e88a0d7`: R3 and Jobs duplicate prose still open) |
| Round-2 matrix (`rc_reverify2.py`) | n/a | 407/455 | **403/455** (**-4: one new regression**, see below) |
| `r6_reverify.py` (28 PM phrasings) | 14/28 | 20/28 | **28/28** |

## Closed by `216c112`

R6-B and R6-C, every phrasing from the PM matrix:

- "Are there jobs around Canberra?" now `location=canberra`, 5 cards.
- "Do you have jobs in Canberra?" no spurious `employment_type=have`, 5 cards.
- "Do you know about / What about jobs in Canberra?" 5 cards.
- "Show me jobs", "Show me any jobs at ANU": 5 cards, no constraints.
- Still correct: explicit `casual` / `full-time` stay visible constraints; Antarctica / Sydney stay visible with no unconstrained list.
- "Tell me about Software Engineer" after a selection is now CONFIRMED (was PARTIAL).

## New regression (RAG-owned)

`R4 Jobs override`: 6/6 at `e88a0d7`, **2/6** at `216c112`. Four cases fail: after selecting a job card, typing a different **digit-titled** job title.

Repro (`repro_jobs_digit_title.py`): "What jobs are available at ANU?", then "Tell me about it" on card 2, then:

| Query | `e88a0d7` | `216c112` |
|---|---|---|
| Tell me about Verified Role 5 | PARTIAL, 1 card (700005) | PARTIAL, **0 cards** |
| Tell me more about Verified Role 4 | PARTIAL, 1 card (700004) | PARTIAL, **0 cards** |
| Tell me about Software Engineer | PARTIAL, 1 card | CONFIRMED, 1 card (improved) |
| Tell me about job 700004 | PARTIAL, 1 card | CONFIRMED, 1 card (improved) |

The answer prose still names the right job ("Verified Role 5. Job ID: 700005 ...") but the response carries no `items`, so the App shows text with no card and no Show more / selection anchor. Likely cause: the new `_is_interpreted_job_discovery` path pre-empts the entity lookup when the digit title leaves `interpretation.entity` empty.

Related, present at both SHAs: the same two queries leave a **hard, sticky `employment_type="verified"`** constraint in `conversation_state` (the word "Verified" in the title is read as an employment type), which would filter later turns. It is a fixture-title artefact, but it is the R6-C class of defect.

The App did not work around either. It renders whatever RAG returns.

## Unchanged, still open

- R3 and Jobs duplicate prose (matrix 282/284 both rows).
- R5-B: Accommodation bare ordinal ("first" ... "number 4") does not resolve, 48/48 of the R5 failures, all Accommodation. Jobs, Scholarships and Events are 100%.
- The 48th torture case is a stale expectation, not a RAG failure.

## Files

- `torture48-216c112.{json,txt}`, `matrix284-216c112.{json,txt}`, `matrix2-216c112.{json,txt}`, `r6-216c112.{json,txt}`: raw runs.
- `openapi.216c112.json`: wire check.
- `repro_jobs_digit_title.py`: minimal repro for the regression (ports 8000 = `216c112`, 8001 = `e88a0d7`).

## Not run

No real-App browser pass against `216c112` in this round (the wire is unchanged and the App code is unchanged, so the earlier Day 7 real-App evidence still applies). App suites were not rerun: they do not depend on RAG and the code is identical to `de876ae`.
