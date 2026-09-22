# V7 Day 1 evidence — freeze reusable conversational UX contracts

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/v7-day01-ux-contracts`
**Base:** `main` at `d94e03aa7791f926a7871dd4a5f535d04126db2f` (= `origin/main`)
**Date:** Monday 21 September 2026 — V7 Day 1 (`docs/v7/DAY_01.md`)
**Deliverable:** Freeze `docs/V7_UI_CONTRACT.md` (UI contracts for result set / selected result /
clarification / comparison / partial / useful unknown, the canonical result-action payload, Clear Chat
backend-reset options, component/state matrix, ranked backend field needs), publish 3 target mock
states as acceptance references, and hand Qasim an explicit list of contract gaps — all through
shared, dev-only primitives that touch no frozen contract and change no production behaviour.

**Gate note:** per Qasim's instruction this session, V7 does not start on production/merge terms until
V6 is confirmed closed. This branch is built and evidenced today; **the PR stays open/draft and is not
merged until Qasim confirms V6 closure and V7 Day 1 start.**

---

## 0. Summary

| | |
|---|---|
| Scope | `docs/V7_UI_CONTRACT.md` (new); dev-only mock-state gallery at `/dev/v7-states`, gated identically to the existing `FixturePicker`; one added navigation test; `docs/DECISION_LOG.md` row (proposal, not a contract change); one `AGENTS.md` line |
| Not touched | `docs/API_CONTRACT.md`, `docs/CONVERSATION_CONTRACT.md`, `frontend/src/types/api.ts`, `askResponse.ts`, `useChatSession.ts`, any production component, `server/` |
| Tests | Focused (`v7StateGallery.test.tsx` + `navigation.test.tsx`): **26/26**. Full suite: **286/286** (280 prior + 6 new; no flake this run — see §4). Server: **46/46**, unchanged. |
| Build | `tsc --noEmit` → exit 0. `vite build` → `dist/assets/index-5lgqlqo9.js` 277.52 kB / gzip 88.05 kB, `index-BSPtm6RR.css` 25.74 kB — matches Day 16's 277.51 kB/25.74 kB baseline (frontend/src/App.tsx:App.tsx, no meaningful size change). |
| Bundle exclusion | `grep` of `dist/assets/*.js` for 5 distinct gallery-only markers (page title, route path, a card action string, a fixture id string) → **zero matches**, confirming the dev-only gate drops the gallery and its fixtures from the production bundle, same technique `askTransport.ts` already documents for `FixturePicker`/`askMock`. |
| Diff hygiene | `git diff --check` → clean. Staged diff vs `main` is exactly the 10 files this Day 1 PR is scoped to (§8). |
| Browser evidence | Built-in browser against `askanu-frontend` dev server with `VITE_USE_MOCK_TRANSPORT=1` (temporarily set in the local, git-ignored `.env`, removed after — see §7): all three target states render inside the real chat shell; no horizontal overflow at 1280×720, 390×844, 360×800 or 430×932; dark theme applies correctly via existing tokens; the real chat at `/` (send, Clear Chat, `Try asking`) is unchanged. |
| Headline | `docs/V7_UI_CONTRACT.md` is ready for the Day 1 gate: it names what the App renders, what it never decides, and exactly which backend fields Day 2+ needs, without changing a single frozen contract or any production code path. |

---

## 1. Inventory (0–2h)

Verified by reading the code, not re-testing what Day 13–16 evidence already proved:

- Chat: `frontend/src/chat/ChatPanel.tsx`, `AssistantTurn.tsx`, `useChatSession.ts` — empty/active/
  pending, all six frozen `status` values.
- Clarification: `AssistantTurn.tsx`'s `ClarificationOptions` — single/multi-select, free text always
  allowed, only the latest turn's clarification is answerable (Day 13, `tests/clarificationLifecycle.test.tsx`,
  reconfirmed passing in this session's full-suite run, §4).
- Clear Chat: `useChatSession.ts` (`clearChat` aborts in-flight + clears turns/`pendingClarification`),
  `layout/ClearChatButton.tsx` (desktop header + mobile drawer).
- Six guided launchers: `domains/DomainLauncher.tsx` + `domainConfig.ts` — prefill-only cards, official
  resource links (Day 5–16 evidence).
- Upcoming Events / Current Jobs: `resources/UpcomingEventsCard.tsx`, `CurrentJobsCard.tsx`,
  `FeedPanel.tsx` — loading/ready/unavailable, official-only split enforced server-side (Day 15/16
  evidence §4/§9/§10, re-confirmed by grep: no `getUnifiedSearch`/`rubric`/`source_id`-filter symbol in
  `frontend/src` today either).
- `server/src/server.js`: confirmed by reading the file — a byte-for-byte pass-through proxy, 64 KiB
  body cap (`MAX_BODY_BYTES`), no session id, no server-side conversation state, no reset endpoint.
  This is the concrete basis for the Clear Chat gap recorded in `docs/V7_UI_CONTRACT.md` §5.

Full table is in `docs/V7_UI_CONTRACT.md` §1.

## 2. UI contracts (2–4h)

Written in `docs/V7_UI_CONTRACT.md` §2: result set, selected result, clarification, comparison,
partial, useful unknown. Each names the App's render rule, what it never decides, and cross-references
the exact backend field it depends on (§6 there). Not reproduced here — see that file.

## 3. Three target mock states (4–6h)

Built as `frontend/src/dev/v7/V7StateGallery.tsx` (+ `V7StateGallery.module.css`,
`v7StateFixtures.ts`, `proposedContract.ts`), mounted at `/dev/v7-states` behind the same
`import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_TRANSPORT === '1'` gate `ChatPanel.tsx` already
uses for `FixturePicker` (`frontend/src/App.tsx`). Renders inside the real `AppShell` — same resource
rail, same theme, same nav — using the real `AssistantTurn`/`UserTurn`/`AnswerBody`/`SourceCards`
components for the parts already covered by the frozen v1 envelope, plus three new dev-only blocks
(`ResultCards`, `ComparisonTable`, `UnknownWithNextAction`) for the proposed additions.

### State 1 — Accommodation discovery result set

Three residence cards (`accommodation:residence:placeholder-{a,b,c}`), each with `Weekly cost` /
`Catering` / `Room type`, a different field `null` on each card. Live-verified (browser pane,
`get_page_text` + screenshot, §7): cards render in fixture order (A, B, C — never re-sorted), each
has a real "Ask about this" `<button>`, and every `null` field renders "Not published in the stored
record" rather than blank or a guessed value. Pinned by `tests/v7StateGallery.test.tsx`'s "discovery
result set" describe block.

### State 2 — Comparison + selected result

Two residences compared on the same three dimensions; `Catering` is `null` for B, `Room type` is
`null` for A. Live-verified: the comparison table shows each dimension exactly once, the `null` cells
render "Unknown" (not the other entity's value, not blank), and a "Selected: Placeholder residence B"
chip renders with a real, accessibly-named dismiss button (`Clear selected result: Placeholder
residence B`). The composer itself has no send path on this dev-only page — real wiring is Day 2
scope, noted explicitly in the component's own doc comment. Pinned by the "comparison + selected
result" describe block.

### State 3 — Useful unknown + next action

`status: insufficient_evidence` answer plus a proposed `next_action` link to the official residence
page. Live-verified: the existing `StatusNotice` renders its normal (non-red, `InfoIcon`) "Not enough
evidence to answer" treatment for the `insufficient_evidence` status — unchanged, frozen v1 behaviour
— and the new next-action block below it uses the same gold-tint info treatment, is a real
`https://` link with `target="_blank" rel="noopener noreferrer"`, and carries no `role="alert"` and no
red styling anywhere. Pinned by the "useful unknown + next action" describe block.

A fourth, test-only state (hostile strings + a `javascript:` next-action URL) is also on the page and
is not one of the three acceptance references; it exists so safe rendering can be checked live in a
real browser, matching the existing `hostileStringsResponse` convention in `mocks/askResponses.ts`.
Live-verified: `<script>...</script>` text renders literally everywhere it appears, and the hostile
next-action URL is refused as a link (rendered as plain text, no anchor) — see §7.

## 4. Test results

Focused:

```
cd frontend && npx vitest run tests/v7StateGallery.test.tsx tests/navigation.test.tsx
 ✓ tests/v7StateGallery.test.tsx (5 tests) 250ms
 ✓ tests/navigation.test.tsx (21 tests) 5522ms
Test Files  2 passed (2)
     Tests  26 passed (26)
```

Full suite:

```
cd frontend && npx vitest run
Test Files  22 passed (22)
     Tests  286 passed (286)
```

286 = the Day 16 baseline of 280 plus 6 new tests (5 in `v7StateGallery.test.tsx`, 1 gate test added to
`navigation.test.tsx`). Every test passed on this run, including `tests/responseStates.test.tsx`'s
historically flaky "refuses to send a second question while one is in flight" case (Day 16 §21) — not
claimed fixed, just not reproduced today; nothing in this PR touches that file or its subject
component.

Server (unchanged; run to prove nothing there was accidentally edited):

```
cd server && npm test
tests 46
pass 46
fail 0
```

TypeScript:

```
cd frontend && ./node_modules/.bin/tsc --noEmit
exit code: 0, no output
```

## 5. Production build and bundle exclusion

```
cd frontend && rm -rf dist && ./node_modules/.bin/vite build
✓ 115 modules transformed
dist/index.html                 0.95 kB │ gzip:  0.56 kB
dist/assets/index-BSPtm6RR.css 25.74 kB │ gzip:  4.69 kB
dist/assets/index-5lgqlqo9.js  277.52 kB │ gzip: 88.05 kB
✓ built in 1.27s
```

Day 16 baseline (unchanged App code that day): 277.51 kB JS / 25.74 kB CSS. Today: 277.52 kB / 25.74 kB
— a 0.01 kB (10-byte) difference, consistent with the one-line `App.tsx` route-gate addition and
nothing else surviving minification; the CSS bundle is byte-for-byte identical.

Bundle-exclusion grep, run against the fresh `dist/` above:

```
grep -l "V7 Day 1" dist/assets/*.js               → no match (exit 1)
grep -l "target mock states" dist/assets/*.js     → no match (exit 1)
grep -l "dev/v7-states" dist/assets/*.js          → no match (exit 1)
grep -l "Ask about this" dist/assets/*.js         → no match (exit 1)
grep -c "placeholder-residence" dist/assets/*.js  → 0 matches
```

Five independent markers (page heading, route path, a card action string, and a fixture-data
substring) are all absent from the production bundle. This is the same method
`frontend/src/chat/askTransport.ts`'s own comment describes for `FixturePicker`/`askMock` — Vite
folds `import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_TRANSPORT === '1'` to `false` in a
production build, so the gated `<Route>` in `App.tsx`, `V7StateGallery.tsx`, its CSS module, the
fixtures and `proposedContract.ts` are all dropped by dead-code elimination.

## 6. Diff hygiene

```
git diff --check
→ exit 0, no output (clean)
```

Staged diff vs `main` (`d94e03aa7791f926a7871dd4a5f535d04126db2f`), limited to the files this PR
intends to touch (the pre-existing untracked root `.docx`/`.pdf` files are not part of this branch and
were left alone):

```
 AGENTS.md                                     |   2 +-
 docs/DECISION_LOG.md                          |   2 +
 docs/V7_UI_CONTRACT.md                        | 223 ++++++++++
 frontend/src/App.tsx                          |  13 ++
 frontend/src/dev/v7/V7StateGallery.module.css | 240 ++++++++++
 frontend/src/dev/v7/V7StateGallery.tsx        | 282 ++++++++++++++
 frontend/src/dev/v7/proposedContract.ts       |  83 +++++
 frontend/src/dev/v7/v7StateFixtures.ts        | 215 +++++++++
 frontend/tests/navigation.test.tsx            |  17 ++
 frontend/tests/v7StateGallery.test.tsx        | 120 +++++
 10 files changed, 1196 insertions(+), 1 deletion(-)
```

Exactly the 10 files listed in the approved plan. No production component, no contract doc
(`API_CONTRACT.md`/`CONVERSATION_CONTRACT.md`/`types/api.ts`), and no `server/` file appears in the
diff.

## 7. Browser evidence

Built-in browser pane against the `askanu-frontend` dev server (`.claude/launch.json`). The mock
transport gate needs `VITE_USE_MOCK_TRANSPORT=1`; this was set for the session by appending one line
to the local, git-ignored `.env` (confirmed ignored via `.gitignore` lines 7–9 before editing;
confirmed removed afterwards, `git status` shows no `.env` entry either before or after).

**Desktop, 1280×720:**
- State 1: three cards visible, chat chrome (You/AskANU turns, Sources) unchanged, resource rail
  intact on the right. `document.documentElement`: `scrollWidth === clientWidth === 1280` (no
  overflow).
- State 2: comparison table with two `Unknown` cells in the expected positions; "Selected: Placeholder
  residence B" chip with visible `×` dismiss control.
- State 3: `insufficient_evidence` notice (gray/info, not red) followed by the gold-tint next-action
  block with an external-link icon.
- State 3b (hostile, test-only): `<script>alert(1)</script>` renders as literal text in the user turn.

**Dark theme, 1280×720:** re-navigated with `colorScheme: dark`; all three states re-render with the
dark token set (dark surfaces, lifted gold) with no unstyled/white flash anywhere in the gallery
blocks — confirming the new CSS module uses only `tokens.css` custom properties, no raw colour
literals.

**Mobile, 390×844 / 360×800 / 430×932:** `scrollWidth === clientWidth` at all three widths (390/390,
360/360, 430/430 respectively) — no horizontal overflow. Comparison table wraps its "Dimension" header
rather than clipping; no card or chip is cut off.

**Keyboard/accessibility:** `find`/`read_page` confirm three distinct "Ask about this" buttons (one per
result card, each a real `<button type="button">`, not a `div onClick`), one "Clear selected result:
Placeholder residence B" button, and one "Check current availability on the official residence page"
link with `href`/`target`/`rel` all correct — all independently locatable by accessible name, meaning
each is keyboard-reachable and correctly labelled.

**Regression on the real chat (`/`):** with the same dev server, sent "Tell me about COMP1110" through
the existing mock-transport chat — rendered the usual placeholder answer + one source card, unchanged.
Clicked `Clear Chat` — `Try asking` and all four suggestion cards returned, no stale content. This
confirms the new gated route changed nothing about the existing production chat path.

`.env` was restored to its prior state (temporary line removed) before this evidence was written, and
the dev server was stopped.

## 8. Contract gaps handed to Qasim

From `docs/V7_UI_CONTRACT.md` §7, restated here as the explicit list for the Day 1 gate:

1. **Clear Chat backend reset** — recommend client-carried opaque `session_state` (option A) over a
   server-side session + clear endpoint (option B); either needs a decision before Day 2, and option A
   needs the 64 KiB body cap / 10-turn history limit checked against the 20-turn acceptance journey.
2. **Where §6's proposed fields land** — new top-level fields on `/api/v1/ask` v1, or a versioned v2.
   Ranked: (1) `items[]` shape, (2) `result_set` status/identity, (3) `answer_state`, (4) `next_action`,
   (5) comparison dimension shape, (6) session reset, (7, low priority) resolved-entity echo.
3. **Status vs. answer-state mapping** — is `insufficient_evidence` permanent for a useful-unknown
   answer, or does an explicit `answer_state: UNKNOWN` replace it as the presentation signal? Today's
   mock state 3 uses `insufficient_evidence` because it is the nearest frozen status.

## 9. Scope discipline

No ranking/filtering/source logic was added to React (the gallery renders backend-order fixtures
as-is). No persistent profile/login. No whole-app redesign — every gallery style is a `tokens.css`
custom property, matching existing components' conventions. No deployment of any kind was performed.
No frozen contract file was edited. Per Qasim's V6-closure gate, **this PR is not to be merged until
V6 closure and V7 Day 1 start are confirmed** — it is evidenced and ready for that review now.

## 10. Final handoff

**Git**
- Branch: `ben/v7-day01-ux-contracts`
- Base SHA: `d94e03aa7791f926a7871dd4a5f535d04126db2f` (= `origin/main`)
- Changed files: see §6 (10 files, additions only apart from two one-line insertions in `AGENTS.md`/`DECISION_LOG.md`)

**Tests:** focused 26/26; full suite 286/286; server 46/46 (unchanged); `tsc --noEmit` exit 0.
**Build:** `vite build` PASS, bundle size unchanged within 10 bytes; 5/5 gallery markers absent from
`dist/`.
**Diff hygiene:** `git diff --check` clean; diff scoped to exactly the 10 planned files.
**Browser evidence:** 3 target states + 1 hostile-strings check verified live at desktop (1280×720,
light + dark) and mobile (360/390/430), no overflow at any width, all interactive elements
keyboard-reachable and accessibly named; existing chat/Clear Chat at `/` unaffected.
**Contract gaps:** 3 items, ranked, handed to Qasim (§8).

**Final**
- App Day 1 = **evidence complete, ready for Qasim's gate review.**
- Merge = **HOLD** — pending Qasim's confirmation that V6 is closed and V7 Day 1 has started.
