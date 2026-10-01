# V7 Day 7: RC re-verification against RAG `971e837` (round 2)

Local engineering evidence, not CI. App production code unchanged at `d5ed8ff` (`git diff d5ed8ff HEAD -- frontend server` is empty; the Vite bundle hash is unchanged).

Progression (same unchanged `../v7-day07/torture_rc.py`): `ce0eb8f` 29/45 → `1504e94` 41/45 → `971e837` **44/45**.
Broader matrix (`../v7-day07/rc_reverify.py`): 116/284 → 187/284 → **281/284**.

- `openapi.971e837.json`: byte-identical to `../v7-day07-rc1504e94/openapi.1504e94.json` (51 schemas). WIRE UNCHANGED.
- `torture_rc.971e837.json`: the unchanged 45-case run.
- `rc_reverify.971e837.json`: the 284-check matrix.
- `rc_reverify2.971e837.json`: round-2 matrix (`../v7-day07/rc_reverify2.py`): R4 Accommodation/Jobs, full R5, R6 with state, A1 (10 rejections), validation control, Clear Chat.
- `report.json` + PNGs: real-App browser run, desktop 1280 and 375px, 36 steps. `report-r6-constraints.json` + `r6-constraints-*.png`: real-UI R6 evidence.
