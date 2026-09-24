# V7 Day 2 evidence — App session state, clarification, Clear Chat

**Repository:** `askanu-app`. **Owner:** Ben. **Scope:** `docs/v7/DAY_02.md`, App lane.
**Branch:** `ben/v7-day2`, from `main` @ `f35902a` (Day 1 PR [#39](https://github.com/u8008916/askanu-app/pull/39), merged).
**Dependency unblocked:** `askanu-rag` PR [#34](https://github.com/u8008916/askanu-rag/pull/34)
("V7 Day 1 — Freeze shared conversational RAG contracts") — approved and merged by Qasim
23 Sep 2026, merge commit `a7e9ed4`. This is the explicit GO `docs/V7_UI_CONTRACT.md` §8/§9
required before any of this shipped.

## 1. What shipped

- Real `conversation_state` transport: `frontend/src/chat/sessionState.ts` (moved from
  `dev/v7/`, previously dev-only architecture prep) is now wired into
  `frontend/src/chat/useChatSession.ts` at the three points `pendingClarification` already
  updates — send, response, Clear Chat.
- `frontend/src/types/api.ts`: `AskResponse.conversation_state?: OpaqueConversationState`
  (optional, opaque); `AskRequest.conversation_state` widened to
  `LegacyConversationState | OpaqueConversationState`.
- `frontend/src/chat/askResponse.ts` carries `conversation_state` through parsing without
  inspecting it — absent/`null` degrades to "no state"; present-but-not-an-object rejects the
  envelope, same strictness as every other field.
- No empty clarification options (`docs/v7/DAY_02.md` do-not-cross line):
  `frontend/src/chat/AssistantTurn.tsx` renders `ClarificationOptions` only when
  `options.length > 0`.
- Clear Chat additions (`docs/V7_UI_CONTRACT.md` §5): `frontend/src/App.tsx`'s
  `handleClearChat` now also clears the composer draft and speaks "Conversation cleared" in a
  polite (`aria-live="polite"`, `role="status"`), visually-hidden live region, wired to both the
  desktop header button and the mobile drawer button.
- `server/`: no code change. `server/src/server.js` was already a byte-for-byte pass-through;
  two new tests in `server/tests/ask.test.js` prove `conversation_state` survives the boundary
  unchanged in both directions.
- Full write-up of the design and the App-side rules (state-drop-on-failure, legacy fallback,
  body-size gap) in `docs/V7_UI_CONTRACT.md` §10. `docs/API_CONTRACT.md` and
  `docs/CONVERSATION_CONTRACT.md` synced 2026-09-24 from the merged `askanu-rag` contract.

## 2. Files changed

```
docs/API_CONTRACT.md
docs/CONVERSATION_CONTRACT.md
docs/V7_UI_CONTRACT.md
docs/evidence/V7_DAY_02_SESSION_CLARIFICATION.md   (this file)
frontend/src/App.tsx
frontend/src/chat/AssistantTurn.tsx
frontend/src/chat/askResponse.ts
frontend/src/chat/useChatSession.ts
frontend/src/chat/sessionState.ts        (moved from frontend/src/dev/v7/sessionState.ts)
frontend/src/dev/mockTransport.ts
frontend/src/mocks/askResponses.ts
frontend/src/types/api.ts
frontend/tests/askApi.test.ts
frontend/tests/clarificationLifecycle.test.tsx
frontend/tests/clearChat.test.tsx
frontend/tests/conversationState.test.tsx   (new)
frontend/tests/sessionState.test.ts      (moved from frontend/tests/sessionStateArchitecture.test.ts)
server/tests/ask.test.js
```

## 3. No frontend reasoning or source filtering

Every occurrence of `conversation_state` in production source, outside doc comments:

```
askResponse.ts:126   destructured from the raw envelope, for shape-checking only
askResponse.ts:178-183  presence/type check (object or absent/null), never a named field
sessionState.ts:71,76   'conversation_state' in response / response.conversation_state ?? null
                        — reads the whole blob, never a field inside it
useChatSession.ts:120   conversation_state: requestConversationState(...)  — sets the request field
types/api.ts:61,97      type declarations only
```

No file reads a named field out of the blob (`.focus`, `.recent_entities`, `.result_sets`, …) —
grepped for `conversation_state\.` across `frontend/src` and found zero matches outside this
list. The legacy fallback (`requestConversationState`) builds `{ pending_clarification }` from
the *response's own* `clarification` field (already-existing, frozen v1 behaviour), never from
inside the opaque blob. This matches `AGENTS.md`'s repo boundary: the App renders backend
semantics and does not interpret institutional state.

## 4. Tests

**Frontend** (`npm test` in `frontend/`, vitest): **315/316 passed**, 1 known pre-existing flake.
- `tests/responseStates.test.tsx > refuses to send a second question while one is in flight`
  failed once under full-suite parallel load; **passes 8/8 in isolation**
  (`npx vitest run tests/responseStates.test.tsx`). This is the same timing-sensitive flake
  Day 16 already tracked (unrelated file, reproduced 3 of 4 full-suite runs, always 8/8 isolated)
  — not a regression from this branch.
- New/updated coverage this session:
  - `tests/conversationState.test.tsx` (new, 5 tests): echo-by-reference across turns; stale
    follow-up after Clear Chat carries no prior state and empty `history`; a response that
    settles *after* Clear Chat writes neither turns nor state (the `generationRef` guard); a
    transport failure drops state so the next request carries none; legacy
    `{pending_clarification}` fallback continues to work against a pre-V7-shaped response.
  - `tests/sessionState.test.ts` (renamed, unchanged assertions): echo/omit/clear primitives.
  - `tests/askApi.test.ts`: 4 new cases — opaque state carried through unchanged; absent/`null`
    both degrade to "omitted"; string/number/array `conversation_state` all rejected.
  - `tests/clarificationLifecycle.test.tsx`: 2 new cases — no option list/no "Select an option"
    prompt for empty `options`, composer stays enabled; a domain launcher card mid-clarification
    only prefills, doesn't send, and leaves the pending clarification live and answerable on
    return.
  - `tests/clearChat.test.tsx`: 2 new cases — draft cleared; live-region announcement fires,
    including on a second consecutive Clear Chat press.

**Server** (`npm test` in `server/`, node:test): **48/48 passed** (was 46/46 before Day 2; +2 for
the `conversation_state` pass-through proof — forwarded unchanged in the request, returned
unchanged in the response).

**Type check:** `npx tsc --noEmit` — clean, no errors.

**Build:** `npm run build` — succeeds (`tsc --noEmit && vite build`), 118 modules, no warnings.
`grep -c "V7StateGallery\|FixturePicker\|dev/mockTransport\|askMock\|MOCK_SCENARIOS" dist/assets/*.js`
→ `0` — the dev gallery and mock transport are still excluded from the production bundle.
`grep -o "Conversation cleared" dist/assets/*.js` finds the string — the new production code
path shipped.

## 5. Browser verification (mock transport, `VITE_USE_MOCK_TRANSPORT=1`)

Driven through the real chat shell (not the dev-only V7 gallery), desktop 1280×720 and mobile
375×812, using the FixturePicker's new `needs_clarification — no options (V7 Day 2)` scenario:

- **Empty-options clarification:** sending against that scenario renders the answer text only —
  no `Clarification options` list, no "Select an option" prompt — confirmed via the accessibility
  tree (no `list "Clarification options"` node present) and via `get_page_text`. The composer
  stayed enabled and accepted further typing.
- **Clear Chat (desktop):** typed an unsent draft, clicked Clear Chat — the draft input read back
  empty and `document.querySelector('[role="status"]').textContent` read
  `"Conversation cleared​"` (the alternating zero-width-space suffix, proving the mechanism
  that makes a second identical announcement re-fire for assistive tech).
  restored `Try asking`.
- **Clear Chat (mobile drawer, 375×812):** opened the drawer, clicked its Clear Chat — same
  live-region announcement fired from the drawer's control.
- No console errors or React warnings during any of the above
  (`read_console_messages` — clean).

Network-level echo/reset proof is covered by `tests/conversationState.test.tsx` rather than a
browser network capture: the dev mock transport (`askMock`) deliberately never calls `fetch`, so
there is no request to inspect in the browser for this scenario — the unit tests drive
`useChatSession` directly against a scripted transport that does record requests, which is the
more precise proof for byte-identical echo than eyeballing a Network panel would be.

## 6. Dependency status: Carmen's Day 2 (RAG)

This evidence covers the App's transport/UI half only. End-to-end proof that a stale follow-up
after Clear Chat actually gets a clarification (rather than a wrong answer) needs RAG's Day 2
entity-resolution work. At the time of this evidence, `../askanu-rag` (sibling checkout) is at
Day 1 (`a7e9ed4`, PR #34) — Carmen's Day 2 branch was not yet available locally to drive a live
run. The App-side contract this session proves is narrower and self-contained: after Clear Chat,
the request the App sends carries `history: []` and no prior `conversation_state` — there is
nothing left in the request for any backend to resolve a stale follow-up against, regardless of
what RAG's resolver does with it (proven in `tests/conversationState.test.tsx`).

## 7. Contract gaps handed to Qasim (not solved here)

1. **Body-size headroom.** RAG's own declared per-field bounds
   (`askanu-rag src/askanu_rag/models/conversation_state.py`), if every field were populated at
   its maximum string length, serialize to roughly 90 KB — above this service's existing 64 KiB
   request cap (`server/src/server.js`) before `history` is even added. A realistic populated
   state (max item counts, plausible identifier/label lengths) measures roughly 11 KB, which fits
   comfortably alongside 10 history turns. The two limits have not been reconciled against the
   20-turn canonical acceptance journey (master plan §2). If a real request does exceed the cap,
   the result is the existing controlled 413 and the App drops its held state in response (§8
   below) — not a silent failure, but worth a decision before Day 7 torture testing.
2. **State-drop-on-failure is an App-side design choice within the contract, not something the
   contract specifies.** After any response that carries no `conversation_state` (a transport
   failure, an App-server 413/502 built before RAG is reached, or a pre-V7 backend), the App
   drops any previously held versioned state rather than keeping it, on the reasoning that the UI
   already disables the superseded clarification in that case and stale versioned state could let
   the UI and backend disagree about what is still live. Flagging this so Qasim can confirm it
   matches RAG's own expectation, rather than assuming it.
3. **`result_set`/rendering fields remain unbuilt**, unchanged from Day 1's §7/§8 — PR #34 was
   session-state only. Not in Day 2's scope per `docs/v7/DAY_02.md`.

## 8. Do-not-cross lines — status

- No intent inference in UI — unchanged, not touched this session.
- No localStorage student profile — unchanged; `sessionState.ts` holds state in a `useRef`, not
  any persisted store.
- No empty clarification options — **now enforced** (§1, §4).
- Clear Chat proves stale follow-up cannot resolve — **proven at the App/transport boundary**
  (§4, §6); full end-to-end proof against RAG's resolver is Carmen's Day 2 dependency (§6).
