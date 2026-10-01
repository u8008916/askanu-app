# Broader-matrix delta: 282/284 -> 276/284 at RAG `a863bb9`

**Date:** 2026-09-30
**RAG SHAs compared:** `a863bb9a272484fecfdc7c2d1abcefe2e1dca4e3` (current), `216c112198fcea61d4cfff356907a5e929256191`, `e88a0d7e6bde2f6135ef152dc1b90d211a56a83e`
**App evidence base:** `e283e7eff002b69de5796587234f70fbad68cdf0`. No App code change, no App workaround.

Sources: the three saved `rc_reverify.py` runs (`matrix284-*.json`) for pass/fail, then `six_case_delta.py` replays exactly these six cases live at all three SHAs and records the state fields. Raw output: `six_case_delta.json` and `.txt`.

## 1. The six cases

Exactly six rows differ, and they are the same six against both baselines. Nothing was gained. The other two failures in the matrix (R3, Jobs duplicate prose) are unchanged and not part of the delta.

Each case: fresh chat, list "What jobs are available at ANU?", select card N (`selected_result` sent on the request, as the App does), then ask about that **same** job by its own title.

| # | Case | Query sent | `e88a0d7` | `216c112` | `a863bb9` |
|---|---|---|---|---|---|
| 1 | jobs #1 "Software Engineer" | Tell me more about Software Engineer | PASS | PASS | **FAIL** |
| 2 | jobs #1 "Software Engineer" | Tell me about Software Engineer | PASS | PASS | **FAIL** |
| 3 | jobs #2 "Verified Role 2" | Tell me more about Verified Role 2 | PASS | PASS | **FAIL** |
| 4 | jobs #2 "Verified Role 2" | Tell me about Verified Role 2 | PASS | PASS | **FAIL** |
| 5 | jobs #3 "Verified Role 3" | Tell me more about Verified Role 3 | PASS | PASS | **FAIL** |
| 6 | jobs #3 "Verified Role 3" | Tell me about Verified Role 3 | PASS | PASS | **FAIL** |

## 2. What differs, by field (identical pattern in all six)

| Field | `e88a0d7` | `216c112` | `a863bb9` |
|---|---|---|---|
| status / `answer_state` | ok / CONFIRMED | ok / CONFIRMED | ok / CONFIRMED (**same**) |
| Cards | exactly the selected job | same | same (**same**) |
| Card `result_set_id` and ordinal | `rs:jobs:1`, N | same | same (**same**, ResultSet identity intact) |
| `state.selected_result` | kept (the job) | kept | **cleared (`null`)** |
| `state.focus.canonical_entity_id` | the job | the job | the job (same) |
| `state.focus.result_set_id` | `rs:jobs:1` | `rs:jobs:1` | **`null`** |
| Constraints | none (Software Engineer); **`employment_type=verified`** (Verified Role 2 and 3) | same | **none in all six** (improved) |
| `result_sets`, `result_page` | unchanged | unchanged | unchanged |
| Show more on the original list, sent from this state | 200 | 200 | **400** (all six) |

Follow-ups sent from the turn-2 state, all identical at all three SHAs and all working: "Tell me about it" with no `selected_result` resolves to the same job, "What is its closing date?" answers 200, "Tell me about the third one" returns job 700003.

## 3. Classification

The matrix's strict check is: status ok, exactly the selected record, `result_set_id` and ordinal on the card, **`state.selected_result` unchanged**, `answer_state` CONFIRMED. Five of those six conditions still hold; only `selected_result` unchanged fails.

| Case | Class | Involves |
|---|---|---|
| 1-6 (all identical) | **New behavioural regression vs `216c112` and `e88a0d7`**: the "same selected title" state item (PM item A). It is not six separate defects. It is not a harness or expectation artifact: the matrix expectation "selection unchanged" is the same as the target semantics "selected Role 5 + explicit Role 5 again: remains coherent, no unnecessary clearing". | `selected_result` (cleared). Not ResultSet identity, constraints, `answer_state` or cards. |

Not a known existing issue: these six passed at both earlier SHAs.

One thing that is *not* a regression and should not be reopened: at `e88a0d7` and `216c112`, cases 3-6 also carried a fake `employment_type=verified` constraint while still passing the matrix (the matrix does not check constraints). `a863bb9` removes it, which is the intended fix.

## 4. Separate observation, not in the six or the 276 count

Show more on the **original list**, sent after the same-title turn, returns HTTP 400 ("The request could not be completed.") at `a863bb9` and 200 at `216c112` / `e88a0d7`, in all six cases. The matrix does not test this, so it is not part of the 282 to 276 drop.

Observed together with it: in the turn-2 state at `a863bb9`, `selected_result` and `focus.result_set_id` are cleared, and `focus.intent_name` is `null` (`fact_lookup` before). `result_sets` and `result_page` are unchanged. Turn-1 state is byte-identical at both SHAs.

**Causality is not established.** I did not test which code path returns the 400, so this document does not attribute it to the title-focus change or to the cleared selection. It also is not the torture case "older turn's Show more after topic switch", which is unchanged. It is included so it is not lost: whoever fixes item A can check whether it clears too.

## 5. Also confirmed unchanged

R6 28/28, R4 Jobs 6/6, no `employment_type=verified` in any title flow, round-2 407/455, torture 47/48 (48-case reconstruction; three extra Accommodation cases pass; the single failure is the same unchanged case). R3 and Jobs duplicate prose unchanged.

## 6. Regression targets for the next patch

1. Selected job asked by its own title: `state.selected_result` preserved (same job, same `result_set_id` and ordinal). The six cases above go back to PASS.
2. Different explicit title: old selection replaced. Already works; keep it.
3. Keep: R6 28/28, R4 Jobs 6/6, no `verified` leak, round-2 407/455.
4. Check whether Show more on the original list returns 200 again after the same-title turn (observation in section 4).

Repro: `python six_case_delta.py OUT.json` with `a863bb9` on port 8000, `216c112` on 8001, `e88a0d7` on 8002, each served by `../v7-final-ui-polish/serve_rc.py`.
