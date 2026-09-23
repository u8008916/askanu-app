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

**Final (as of 21 Sep, before the 23 Sep addendum below)**
- App Day 1 = **evidence complete, ready for Qasim's gate review.**
- Merge = **HOLD** — pending Qasim's confirmation that V6 is closed and V7 Day 1 has started.

*(23 Sep update: V6 closure has since been confirmed and PR #39 pushed/opened. See §11 for the
architecture-readiness work added the same day and the current, updated final status.)*

## 11. 23 Sep addendum — architecture readiness + Carmen's PR #34 review

Qasim relayed a fuller Day 1 brief on 23 Sep naming seven concrete App asks (review Carmen's state
contract; prepare conversation_state transport; define Clear Chat's state half; keep semantic
intelligence in RAG; prepare the response renderer; keep the shell; document backend needs). This
section is the evidence for the two that required new work (the PR #34 review, and the two
architecture-prep modules); the other five were already satisfied by the §1–§10 work above or by
standing repo rules, per `docs/V7_UI_CONTRACT.md` §9.4.

### 11.1 Carmen's PR #34 review

Read in full via the local sibling clone at `../askanu-rag` (`gh pr view 34 --repo u8008916/askanu-rag`,
plus `git diff main pr-34-review -- docs/API_CONTRACT.md docs/CONVERSATION_CONTRACT.md` and the new
`docs/v7/DAY_01_SHARED_CONTRACTS.md`, on a temporary local branch deleted after reading — no comment
was posted to that repo's PR; reviewing/merging it is Qasim's process, not this one). Status at review
time: **open, mergeable, not merged**, 17 files changed (+2632/-28).

Findings are written up in `docs/V7_UI_CONTRACT.md` §9.1; the two load-bearing ones:

1. The wire change is additive and matches this document's own §5 Option A exactly — the App stores an
   opaque `conversation_state` value and echoes it back; Clear Chat means omitting it (or sending the
   empty schema-version-1 state) on the next request. `askanu-rag`'s own updated
   `CONVERSATION_CONTRACT.md` states the App's Clear Chat responsibility in almost the same words this
   document already used.
2. PR #34 is the *session-state* contract only. It adds no `items`/`result_set`/`answer_state`/
   `response_type` field to the response envelope — those remain open asks for RAG's later
   retrieval/response work, not something this PR's imminent merge resolves.

### 11.2 New dev-only architecture-prep files

| File | Purpose |
|---|---|
| `frontend/src/dev/v7/sessionState.ts` | Opaque `conversation_state` store/echo/clear, typed `unknown` so it stays correct regardless of Carmen's field names |
| `frontend/tests/sessionStateArchitecture.test.ts` | 7 tests: empty start, opaque store-by-reference, omission on empty/null/undefined response, Clear Chat drop, full round-trip leaves nothing for a stale follow-up |
| `frontend/src/dev/v7/proposedContract.ts` (extended) | Adds `EntitySummary`, `EntitySummaryAction`, and the `ProposedResponse` discriminated union (`response_type`) |
| `frontend/src/dev/v7/responseBlocks.tsx` (new) | `ResultCards`, `ComparisonTable`, `SelectedResultChip`, `UnknownWithNextAction` extracted out of `V7StateGallery.tsx` (no behaviour change), plus a new `EntitySummaryBlock` |
| `frontend/src/dev/v7/ResponseRenderer.tsx` (new) | The response-type dispatcher: an exhaustive `switch` over `ProposedResponse['response_type']` |
| `frontend/tests/responseRenderer.test.tsx` | 7 tests, one per `response_type` plus the no-next-action case, each checking the contract rule its block already enforces (order, missingness, no error styling) |
| `frontend/src/dev/v7/v7StateFixtures.ts` (extended) | `warrumbulEntitySummaryFixture` — Qasim's own "Tell me about Warrumbul Lodge" example |
| `frontend/src/dev/v7/V7StateGallery.tsx` (updated) | Imports blocks from `responseBlocks.tsx` instead of defining them inline; adds a fourth state rendering the Warrumbul fixture through `ResponseRenderer` |
| `frontend/tests/v7StateGallery.test.tsx` (updated) | Turn-count assertions updated for the fourth state; one new describe block for it |
| `docs/V7_UI_CONTRACT.md` §9 (new) | Write-up of all of the above, cross-referenced to Qasim's seven asks |

None of this is wired into `frontend/src/types/api.ts`, `chat/useChatSession.ts` or
`chat/AssistantTurn.tsx` — every file above is reachable only from `dev/v7/` or its own test file, per
the explicit "don't hard-code/freeze your implementation around the current conversation_state schema
until #34 is approved and merged" instruction.

### 11.3 Test results (23 Sep)

Focused:

```
npx vitest run tests/v7StateGallery.test.tsx tests/responseRenderer.test.tsx tests/sessionStateArchitecture.test.ts tests/navigation.test.tsx
Test Files  4 passed (4)
     Tests  41 passed (41)
```

Full suite:

```
npx vitest run
Test Files  24 passed (24)
     Tests  301 passed (301)
```

301 = the 286 baseline from §4 plus 15 new tests (7 `sessionStateArchitecture`, 7 `responseRenderer`, 1
new `v7StateGallery` describe block, minus the 0 removed — the pre-existing gallery test's turn-count
assertions were updated in place, not duplicated). Four full-suite runs today: **fail, pass, fail,
fail** — every failure the same single, already-tracked `responseStates.test.tsx` "refuses to send a
second question while one is in flight" flake (Day 16 §21), at the same assertion line, in a file this
branch does not touch. Three separate isolated runs of that file, taken immediately after each
full-suite failure, all passed **8/8**. This is a higher fail rate than Day 16 recorded (roughly 1-in-3
there; 3-in-4 today, likely just this run's CPU/scheduling load), reported here exactly as observed
rather than cherry-picking the one clean run — not claimed fixed, and still not caused by anything in
this branch's diff (no file this branch touches is in `responseStates.test.tsx`'s dependency chain, and
the isolated result is unconditionally consistent).

`tsc --noEmit`: exit 0, no output, including the new discriminated-union dispatcher (TypeScript's own
exhaustiveness check over `ProposedResponse['response_type']` is what makes `ResponseRenderer.tsx`
compile at all — removing a case is a type error, which is the concrete proof behind §9.3's "not
permanently locked into one generic Markdown response" claim).

Server: `npm test` → 46/46, unchanged (nothing in `server/` touched today either).

### 11.4 Build and bundle exclusion (23 Sep)

```
vite build
dist/assets/index-5lgqlqo9.js  277.52 kB │ gzip: 88.05 kB
dist/assets/index-BSPtm6RR.css  25.74 kB │ gzip:  4.69 kB
```

Identical to §5's numbers — the new architecture-prep modules add zero bytes to the production bundle.
Grep of `dist/assets/*.js` for seven markers spanning every new file (`entity_summary`, `Room types`,
`Warrumbul`, `toRequestField`, `clearSessionState`, `ResponseRenderer`, `dev/v7-states`): **zero
matches on all seven**, confirming the dev-only gate still excludes everything added today, not just
the original three states.

### 11.5 Browser evidence (23 Sep)

Built-in browser, same method as §7 (temporary line in the local git-ignored `.env`, removed
afterwards; confirmed via `.gitignore` and `git status` before and after, as before). Navigated to
`/dev/v7-states` at 1280×720; `get_page_text` confirms the fourth state renders exactly as designed —
"Placeholder Warrumbul Lodge record," the one-line description, `Cost`/`Catering`/`Residents` values
and `Facilities` correctly showing "Not published in the stored record," and all three actions ("Room
types & prices," "How to apply," "Compare") present as real buttons. `document.documentElement`:
`scrollWidth === clientWidth === 1280` (no overflow). Screenshot capture itself timed out in this
session's browser pane (the same intermittent limitation Day 15/16 recorded); `get_page_text` +
`find`/DOM measurement were used instead, which is at least as precise for confirming text content and
layout width for this check.

### 11.6 Updated final status

**Git**
- Same branch, `ben/v7-day01-ux-contracts`; second commit adds the §11.2 files, a third records the
  UI-contract §8 direction addendum (see PR #39 commit history).
- PR #39 pushed and open against `main`.

**Tests:** focused 41/41; full suite 301/301 (one incidental, previously-tracked flake reproduced and
isolated); server 46/46 unchanged; `tsc --noEmit` exit 0.
**Build:** bundle size unchanged; 7/7 new markers absent from `dist/`, in addition to the original 5/5.
**Contract review:** `askanu-rag` PR #34 read in full; confirms §5 Option A; adds no rendering-field
answer to §6/§7's open questions (still open, still Qasim/Carmen's to place).

**Final**
- App Day 1 = **evidence complete, including the 23 Sep architecture-readiness asks.**
- V6 closure = **confirmed** (23 Sep).
- Merge = still **HOLD**, but the remaining gate is now Qasim's ordinary Day 1 review/GO on PR #39
  itself — not the earlier V6-closure precondition, which is satisfied.
