# V7 Day 7: RC torture and defect ledger

**Date:** 2026-09-29
**App branch:** `ben/v7-day7`, from the accepted D6 checkpoint `279a1f69b11305d6b644d6a52ccf1fd8c1c5c981`. D5 `949f2c4` and D6 `279a1f6` stay frozen, and PRs #43/#44 stay on merge HOLD.
**RAG torture target:** RC `ce0eb8fe156ad385a74e96402282c8353e4b92b6`. It is 1 ahead of `bafa15d` and changes only `tests/test_v7_day7_rc_torture.py`: `git diff --quiet bafa15d ce0eb8f -- src` passes, so the RC wire **is** the D6 wire. Carmen's D5+D6+D7 suites pass 17/17 on a local checkout of `ce0eb8f`.
**Mode:** test → break → classify → fix genuine App defects → retest. No new features. All results are **local engineering evidence, not CI**.

## 1. Ledger

Every row was reproduced against a live `create_app` from `ce0eb8f`, using Carmen's D5/D6 fixtures with the clock fixed to 14 Sep 2026. `torture_rc.py` (committed next to this doc) sends exactly what the App sends: the opaque state echo, a 10-turn history, and `selected_result`/`result_page` built from the rendered items. Raw results are in `v7-day07/rc-api-torture.json`.

| ID | Class / owner | Reproduction | Expected | Actual at `ce0eb8f` |
|---|---|---|---|---|
| **R1** | RAG release blocker, Carmen | Scholarship list → structured `selected_result` #2 + "Tell me more about ⟨title⟩" | #2, ordinal 2, `CONFIRMED` | right record, but `result_set_id`/`ordinal` null and `PARTIAL` |
| **R2** | RAG release blocker, **high**, Carmen | Scholarship list → "Tell me about the second one" → "Am I eligible for Day 5 International Computing Scholarship 8?" | Scholarship **8** (`UNKNOWN`), no #2 evidence | answers about Scholarship **2** (`PARTIAL`). Screenshot `r2-override-*` |
| R2 cross-domain | same | Events list → select #2 → "Tell me about Event 800005" | event 800005 | the **whole 5-item list** (Jobs' equivalent passes) |
| **R3** | RAG narrow prose defect | Scholarship discovery `PARTIAL` | a concise RAG-authored reason in the answer text | prose restates records only; no reason given |
| **R4** | RAG release blocker, Carmen | list → structured select #2 + "Tell me more about ⟨title⟩" | the selected record | Accommodation `insufficient_evidence`; Jobs `insufficient_evidence`, no item; Events the whole list. Pronoun and fact follow-ups ("Tell me about it", "What does it include?", "What are its requirements?", "Where is it?", "When does it close?") pass in all four domains |
| **R5, broadened** | RAG release blocker, Carmen | any list → "Tell me about the third one" | item 3 | **no ordinal beyond "second" resolves in any domain**. "third", "3rd", "fourth" and "number 3" give `off_topic`/`insufficient_evidence` for Scholarships, Jobs and Events, fresh or after a selection. After "the second one", Scholarships' "the third one" returns **#2**. Screenshot `r5-third-*` |
| **R6, new** | RAG defect (medium), Carmen | "What jobs are available at ANU in Antarctica?" | no-match wording ("…does not establish that no such ANU jobs exist") | the unmatched location is **silently dropped**, and all 5 current jobs come back as "verified available results" (`PARTIAL`), implying they match |
| **D7-A1, new** | **cross-repo release blocker (proposed)**: RAG envelope, plus a Qasim decision | Scholarship list (with "Show more") → ask Jobs → click the **older** Scholarship list's "Show more" | continue the older ResultSet, or a controlled rejection that **leaves context intact** | RAG returns HTTP 400 with a controlled `error` envelope whose `conversation_state` is a **fresh empty state** (`turn_index 0`, no ResultSets). Under the frozen PR #40 rule (a RAG-authored envelope's state is authoritative), the App adopts it, and the **whole conversation context is silently reset**: the next "Tell me about the second one" is `off_topic`. Reproduced in the real App (`a1-stale-show-more-*`). An older card's "Ask about this" is fine (still resolves) |
| Jobs listing duplication | RAG narrow presentation defect | Jobs listing on 375px | short caveat + count; details in cards | full prose repeats every job above the cards (D6 evidence `jobs-mobile-01`) |

**D7-A1 options, for Qasim; not implemented, because each changes a frozen rule:**
- (a) **RAG** (recommended): a rejected request's error envelope should echo the inbound `conversation_state`, or omit it, instead of minting an empty one.
- (b) **App**: treat the state on a `status:"error"` envelope as non-authoritative. This reverses the PR #40 decision.
- (c) **App UX**: only the newest list's "Show more" stays enabled. This is a behaviour change under freeze.

The App currently does neither (b) nor (c).

## 2. App-side torture: all pass

| Area | Result | Where |
|---|---|---|
| Support `CONFIRMED` scope text above the card (**the one approved narrow fix**) | pass; stays Support-only (Course/Scholarship/Events/Jobs `CONFIRMED` prose is still folded) | `v7Day7Torture.test.tsx`; `support-scope-*-01` |
| Malformed page metadata (wrong types) | the whole envelope is refused at the boundary | unit |
| Self-contradictory page (`has_more` without `next_ordinal`) | no "Show more", no crash | unit |
| One malformed item among good ones | whole list refused, backend text kept | unit |
| Malformed provenance (Rubric claiming `official_anu`) | refused; never labelled official | unit |
| All optional fields null | "Not published" × 11, no blank or crash | unit |
| Unsafe `javascript:` card URL and action URL | never an anchor | unit |
| External links | every `target=_blank` has `rel="noopener noreferrer"` | unit |
| Transport failure after valid state → retry | error turn; state kept; the retry sends the same state and resolves #2 | unit; `transport-failure-desktop-01/02` |
| RAG error envelope | neutral error notice, no cards | unit |
| Response settling after Clear Chat | never written back; the next request has no state or history | unit |
| Stale "Ask about this"/"Show more" after Clear Chat, and after double Clear Chat | **0** such buttons remain; a replayed stale `selected_result`/`result_page` with empty state is rejected by RAG (400), and there is no UI path to send one | browser + API |
| Long conversation (40 turns, 6 domains) | history ≤ 10; state always the latest authoritative one | unit |
| Structured selection + pronoun follow-up | pass in Accommodation, Scholarships, Jobs, Events, Support | API |
| Paging → continuation → refinement → comparison | Scholarships 6–8 → no restart → child set 1–5 `PARTIAL` → comparison; Jobs refinement after Show more `PARTIAL` | API |
| Return topic | Course→Scholarship→Course (2026 kept), Scholarship→Accommodation→Scholarship #2, Jobs→Events→Jobs #2 | API |
| Support interruption | Scholarship list → Support → "the second scholarship" gives #2 | API |
| Mobile 375px / desktop | 0 page overflow, 0 empty `<dl>` across 16 D7 steps (plus 39 D5 and 39 D6) | `v7-day07/report.json` |
| Keyboard / focus | Tab order follows backend order, with a 2px solid focus outline (D5/D6 runs) | D5/D6 evidence |
| Console | no React warnings. The only console output is the App's own deliberate `returned an error envelope` log in the D7-A1 repro | report.json |

**"Tell me about it" prefill:** kept only as **temporary compatibility wording** while R1/R4 are open. This is documented in `AssistantTurn.tsx` and is not a product rule. Once Carmen fixes them, both it and title-bearing wording must be re-tested.

## 3. Verification (local engineering evidence)

| Run | Result |
|---|---|
| Frontend `npm test` | **32 files, 508 passed** (D6: 494; +14 D7 torture) |
| D4 / D5 / D6 regressions | all pass (D5 52, D6 34) |
| `tsc --noEmit && vite build` | passed |
| Server `npm test` | 50 passed |
| `git diff --check` | clean |
| Live RC API torture (`torture_rc.py`) | **29 / 45 pass**. All 16 failures are ledgered above (R1/R2/R4/R5/R6/D7-A1) and are RAG-owned or cross-repo; none is an App rendering defect |

## 4. Mandatory reruns once Carmen publishes a fixed or restacked RC

1. Check the new exact D5/D6/D7 SHAs and diff the public contract against `0efb6ee` / `bafa15d` / `ce0eb8f`. **If the wire changed, stop and report before touching App code.**
2. Rerun `torture_rc.py` (R1, R2 incl. cross-domain, R4, R5 incl. ordinal ≥ 3, R6, D7-A1).
3. Re-test the "Ask about this" prefill with both "Tell me about it" and title-bearing wording.
4. Run the D5 52 / D6 34 / D4 regressions, the full frontend, server, build and TypeScript, the six-domain lifecycle, and a mobile/browser smoke.

Day 8: **HOLD**. There is no deployment, merge, release config, secret or IAM work.

## 5. Re-verification against Carmen's restacked RAG chain (2026-09-29)

Local engineering evidence, not CI. **No App production change**: App stays frozen at `d5ed8ff`. Evidence in `v7-day07-rc1504e94/`; matrix runner `v7-day07/rc_reverify.py`.

**RAG SHAs:** D5 `75c017b`, D6 `1875a4b`, D7 RC `1504e94` (chain `eace474` → `75c017b` → `1875a4b` → `03adad0` → `1504e94`). The restacked D5, D6 and pure-D7 trees are byte-identical to `0efb6ee`, `bafa15d`, `ce0eb8f`.
**Public wire: UNCHANGED.** OpenAPI from both live apps is byte-identical (51 schemas), and no `models/`, `api/`, `conversation/` or `validation/` file changed. The fix touches only interpretation, ordinal resolution and the Event/Scholarship query services.

**Live torture (`torture_rc.py`, unchanged): 29/45 on `ce0eb8f` (control rerun) → 41/45 on `1504e94`. 41 PASS / 4 FAIL.** Broader matrix (`rc_reverify.py`): 116/284 → 187/284.

| ID | New status at `1504e94` |
|---|---|
| R1 Scholarship title-bearing | **CLOSED** (ordinal and `result_set_id` kept, CONFIRMED) |
| R4 Events | **CLOSED** |
| R4 Accommodation | **OPEN**: "Tell me more about ⟨title⟩" → `insufficient_evidence`; "Tell me about ⟨title⟩" works. No Accommodation code changed. |
| R4 Jobs | **OPEN (title-dependent)**: passes for `Software Engineer`; fails for `Verified Role 2/3` (title digit read as job ID), even for plain "Tell me about" |
| R2 Scholarship #2 → Scholarship 8, Event → Event 800005 | **CLOSED** (Jobs control still passes; real-App screenshots `r2-override-*`) |
| R5 first / second / third | **CLOSED** (12/12 each wording; fresh, after selection, after continuation, after Show more) |
| R5 `3rd`, `fourth`, `number 3` | **OPEN** (0/12 each; only `third` was added) |
| R6 | **OPEN, blocker**: Antarctica, Sydney, full-time, ANU99, remote silently dropped, all Jobs returned. Melbourne and casual are handled. Events/Accommodation in Antarctica also return everything. |
| D7-A1 | **OPEN, blocker**: controlled 400 returns `turn_index 0`, no ResultSets; next "the second one" → `off_topic`. Reproduced in the real App. All 8 controlled rejections tried (stale cursor, older set, bad set id, mismatched ordinal, tampered selection ×2, malformed page ×2) wipe state. |
| R3 | OPEN (non-blocking) |
| Jobs duplicated prose | OPEN (non-blocking; 5/5 titles repeated) |

**App regression (unchanged code):** frontend 508/508; D4 31, D5 52, D6 34, D7 14; server 50/50; tsc and Vite build pass; `git diff --check` clean; browser desktop + 375px: 0 overflow, 0 stale controls after double Clear Chat, no React warnings (the only console output is the App's own error-envelope log in the A1 repro). Carmen's suites on `1504e94`: 11 blocker tests pass; full suite 1118 passed / 88 skipped / 0 failed of 1206.

The "Tell me about it" prefill stays temporary: both wordings agree in Scholarships and Events only.
