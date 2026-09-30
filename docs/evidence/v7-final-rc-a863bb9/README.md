# V7 final RC re-verification: RAG `a863bb9`

**Date:** 2026-09-30
**RAG tested:** `a863bb9a272484fecfdc7c2d1abcefe2e1dca4e3` (`carmen/v7-day7-rc-torture`, "fix: preserve exact job title precedence"; parent `216c112`). The diff against `216c112` is `job_queries.py` and one test file only.
**App:** `ben/v7-final-ui-polish` code at `de876ae`; evidence base `49419c7`. No App code changed and no App workaround was added.

Method is unchanged from the `216c112` round: a live `create_app` over Carmen's own D4/D5/D6 fixtures with the clock fixed to 14 Sep 2026 (`../v7-final-ui-polish/serve_rc.py`), driven by the same unmodified scripts. Local engineering evidence, not CI.

**Wire:** OpenAPI byte-identical to `216c112` (and `971e837`), 51 schemas. No App contract change.

## Results

| Gate | `e88a0d7` | `216c112` | `a863bb9` |
|---|---|---|---|
| `r6_reverify.py` (28) | 20/28 | 28/28 | **28/28** |
| Round-2 matrix, R4 Jobs override | 6/6 | 2/6 | **6/6** |
| Round-2 matrix total | 407/455 | 403/455 | **407/455** (recovered the 4 lost cases) |
| Hidden `employment_type="verified"` | present | present | **gone** (no constraint in any title flow) |
| Torture (`torture_rc.py`) | 47/48 | 47/48 | **47/48** (same stale "older turn's Show more" case) |
| Broader matrix (`rc_reverify.py`) | 282/284 | 282/284 | **276/284** (-6, see below) |

## Title-flow cases (`title_flow_a863bb9.py`, output in `title_flow.txt`)

`a863bb9` passes 10/11 (`216c112`: 4/11).

| Case | Result |
|---|---|
| Fresh exact title ("Software Engineer") | PASS, CONFIRMED, 1 card, no constraint |
| Fresh digit-bearing title ("Verified Role 5") | PASS, CONFIRMED, card 700005, no constraint |
| Title after a ResultSet exists | PASS |
| Title after another Job is selected (override) | PASS, new job wins, no constraint |
| Digit title, "Tell me more about", after selection | PASS |
| Different non-digit title after selection | PASS |
| Follow-up "What is its closing date?" after title / after override | PASS, right job |
| Next generic "Show me jobs" (after override, and after fresh digit title) | PASS: 5 cards, no constraints, unfiltered |
| Selected job asked by its **own** title, expecting selection kept | FAIL: `conversation_state.selected_result` is `{}` (at `216c112` it was kept) |

At `216c112` the same flows left `employment_type=verified` in state and "Show me jobs" afterwards returned **0 cards**. That is fixed.

## New regressions vs `216c112` (RAG-owned, for Carmen / Qasim to rule on)

### 1. Broader matrix 282 -> 276: `R1/R4` 33/33 -> 27/33

The six failing cases are all Jobs, "select a card, then type its own title" (`Tell me about <title>` and `Tell me more about <title>`, jobs #1-#3). The answer is correct in every one (right job, CONFIRMED, right `result_set_id` and ordinal). What fails is the script's documented strict expectation "`state.selected_result` unchanged": it is now `{}`. Scholarships, Events, Courses and Accommodation are unaffected.

This matches Carmen's stated intent ("old selected Job is cleared if the explicit new title wins"), but it also clears the selection when the explicit title is the *same* job that was already selected. Follow-up questions and ordinals still work afterwards (checked: "closing date", "the first/third one").

### 2. "Show more" on the older list now returns HTTP 400 after any typed Job title

`probe_showmore_after_title.py`: list of 5 jobs, then ask about a job by title, then press Show more on the list.

| Flow | `216c112` | `a863bb9` |
|---|---|---|
| Select card 2 ("Tell me about it"), then Show more | 200, 2 more | 200, 2 more |
| Own title with selection, then Show more | 200 | **400** |
| Typed "Tell me about Software Engineer", then Show more | 200 | **400** |
| Typed "Tell me about Verified Role 5", then Show more | 400 (broken title flow) | 400 |

The 400 is RAG's controlled rejection ("The request could not be completed."), which preserves state (Day 7 A1). So this follows the existing "older turn's Show more after topic switch" rule: an exact-title answer now takes focus (`focus=... or exact_title is not None`). The consequence for a user is that Show more on the earlier list shows the generic error notice after they asked about one job by name. That flow worked at `216c112` for non-digit titles. It may be accepted behaviour (a title lookup is a topic switch); it needs an explicit decision, not an App workaround.

## Unchanged, still open

R3 and Jobs duplicate prose; Accommodation bare ordinals (all 48 R5 failures, Accommodation only). The single torture failure is a stale expectation.

## Files

`torture48-`, `matrix284-`, `matrix2-`, `r6-` `a863bb9.{json,txt}`; `openapi.a863bb9.json`; `title_flow_a863bb9.py` + `title_flow.txt` (ports 8000 = `a863bb9`, 8001 = `216c112`); `probe_ordinal_showmore.py`, `probe_showmore_after_title.py`.

## Not run

No real-App browser pass against `a863bb9`, no App suite rerun (wire and App code unchanged from the earlier rounds).
