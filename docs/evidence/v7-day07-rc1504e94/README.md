# V7 Day 7: RC re-verification against RAG `1504e94`

Local engineering evidence, not CI. App production code is unchanged at `d5ed8ff`.

- Wire: `openapi.ce0eb8f.json` vs `openapi.1504e94.json` are byte-identical (51 schemas). WIRE UNCHANGED.
- `torture_rc.ce0eb8f-control.json`: unchanged `../v7-day07/torture_rc.py` on the old RC, 29/45 (control).
- `torture_rc.1504e94.json`: the same script, unchanged, on the new RC, 41/45.
- `rc_reverify.*.json`: the broader PM matrix (`../v7-day07/rc_reverify.py`), old vs new.
- `*.png`, `report.json`: real-App browser run (desktop 1280 and 375px mobile) against the new RC.
