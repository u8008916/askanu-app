# V7 Day 2 evidence — App session state, clarification, Clear Chat

**Repository:** `askanu-app`. **Owner:** Ben. **Scope:** `docs/v7/DAY_02.md`, App lane.
**Branch:** `ben/v7-day2`, from `main` @ `f35902a` (Day 1 PR [#39](https://github.com/u8008916/askanu-app/pull/39), merged).
**Dependency unblocked:** `askanu-rag` PR [#34](https://github.com/u8008916/askanu-rag/pull/34)
("V7 Day 1 — Freeze shared conversational RAG contracts") — approved and merged by Qasim
23 Sep 2026, merge commit `a7e9ed4`. This is the explicit GO `docs/V7_UI_CONTRACT.md` §8/§9
required before any of this shipped.

**Status:** PR [#40](https://github.com/u8008916/askanu-app/pull/40). §1–§8 below are the original
Day 2 submission (head `e573d76`). §9 records Qasim's PM/integration review and the transport-
failure state correction made in response (head `6d9d533`). §10 records the final request-size
correction (24 Sep 2026) — read §9–§10 first if picking this up after those reviews.

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

*Both flags below were reviewed by Qasim 24 Sep 2026 — see §9 for the outcome (item 2 corrected,
item 1 confirmed still open and explicitly not the App's to resolve alone).*

1. **Body-size headroom.** RAG's own declared per-field bounds
   (`askanu-rag src/askanu_rag/models/conversation_state.py`), if every field were populated at
   its maximum string length, serialize to roughly 90 KB — above this service's existing 64 KiB
   request cap (`server/src/server.js`) before `history` is even added. A realistic populated
   state (max item counts, plausible identifier/label lengths) measures roughly 11 KB, which fits
   comfortably alongside 10 history turns. The two limits have not been reconciled against the
   20-turn canonical acceptance journey (master plan §2).
2. **State-drop-on-failure was an App-side design choice within the contract, not something the
   contract specified — now corrected, see §9.1.** The original cut dropped any previously held
   versioned state after a response with no `conversation_state`. Qasim's review found this
   conflated a failed request with an explicit reset.
3. **`result_set`/rendering fields remain unbuilt**, unchanged from Day 1's §7/§8 — PR #34 was
   session-state only. Not in Day 2's scope per `docs/v7/DAY_02.md`.

## 8. Do-not-cross lines — status

- No intent inference in UI — unchanged, not touched this session.
- No localStorage student profile — unchanged; `sessionState.ts` holds state in a `useRef`, not
  any persisted store.
- No empty clarification options — **now enforced** (§1, §4).
- Clear Chat proves stale follow-up cannot resolve — **proven at the App/transport boundary**
  (§4, §6); full end-to-end proof against RAG's resolver is Carmen's Day 2 dependency (§6).

## 9. Correction — Qasim's PM review of PR #40 (24 Sep 2026)

Qasim reviewed head `e573d76` and accepted the architecture in full (§1–§8, item by item), but put
the PR on **HOLD** for two cross-repo integration decisions (full review posted as a
[PR comment](https://github.com/u8008916/askanu-app/pull/40#issuecomment-5807171321)). This
section records the one narrow correction made — the other is explicitly not the App's to resolve
alone and was left untouched.

**1. State-drop-on-failure corrected (required, implemented).** §7 item 2's original rule — any
response with no `conversation_state` drops previously held state — conflated "the request failed"
with "the conversation was reset." Qasim's principle: *"absence of a new authoritative response is
not automatically evidence that the previous authoritative state became invalid."* Fixed by
`chat/sessionState.ts`'s new `advanceSessionState(current, response)`: a response that carries
`conversation_state` always replaces `current` (even a RAG-authored error, since PR #34's contract
puts the field on every status RAG itself answers — an empty/reset value is still authoritative);
a response with no field at all — client-side transport failure, or an App-server 413/502 that
never reached RAG — now **preserves** `current` unchanged. Only an explicit Clear Chat, or RAG
actually answering, changes what is held. `useChatSession.ts` calls this at the same settle point
that previously called `fromResponseEnvelope` directly.

Tests added exactly to the shape Qasim's review specified — "receive valid state S1 → next request
fails before authoritative RAG response → retry still sends S1; and Clear Chat after that still
removes S1":
- `tests/sessionState.test.ts`: 5 new `advanceSessionState` unit cases (preserve on absent/null/
  undefined response, replace on a present field including an empty reset value, nothing to
  preserve when starting empty).
- `tests/conversationState.test.tsx`: replaced the old "drops state after a transport failure"
  case with four — preserved through a thrown transport failure and the retry sends S1 byte-
  identical (`toBe`); preserved through a settled App-server-boundary envelope with no
  `conversation_state` (the 413/502 case, distinct from RAG answering); Clear Chat after a
  preserved state still removes it; and a genuinely RAG-authored error response (carries the
  field, even an empty reset value) still replaces the held state rather than being treated as a
  failure.

**2. Body-size invariant — deliberately left untouched.** Qasim was explicit that this is a
shared App/RAG contract decision, not one the App can complete alone, and told Ben not to change
the 64 KiB limit independently. No change made to `server/src/server.js` or `MAX_BODY_BYTES`.
`docs/API_CONTRACT.md` and `docs/V7_UI_CONTRACT.md` §10 updated to state the required invariant
and that it awaits a joint number from Qasim/Carmen. Once frozen, the remaining work is a boundary
test proving the agreed maximum is accepted and an over-limit request is rejected cleanly — not
done here, since there is no agreed number yet.

**Not touched, confirmed still accepted-as-is per Qasim's review:** opaque transport, store/echo/
clear architecture, stale-response `generationRef` guard, extended Clear Chat lifecycle, composer
draft reset, accessibility announcement, empty-clarification-option guard, legacy
`{pending_clarification}` fallback, server pass-through, session-only state, dev/production
separation. `result_set`/rendering-field work stays out of scope, per Qasim's explicit instruction
not to pull it into this correction.

**New head:** `6d9d533f8ac87e55047d0956e632c460e9e1c870`. **Regression after the correction:**
frontend 323/324 (was 315/316; +8 new tests, all passing — the same pre-existing
`responseStates.test.tsx` timing flake as §4, still passes 8/8 in isolation, still unrelated to
any file this branch touches); server 48/48 (unchanged, no server code touched); `tsc --noEmit`
clean; `npm run build` clean, dev gallery/mock transport still excluded from `dist/`. No
unrelated Day 2 functionality was changed — the diff for this correction is `chat/sessionState.ts`,
`chat/useChatSession.ts`, and the two test files above, plus this evidence file and the two synced
docs.

## 10. Final correction — request-size contract frozen (24 Sep 2026)

`askanu-rag` PR [#36](https://github.com/u8008916/askanu-rag/pull/36) ("V7 Day 2: freeze App-RAG
transport size contract") froze the shared invariant §7 item 1/§9's body-size flag asked for.
**Note on PR #36's GitHub state at the time this correction was made:** the PR showed as open,
mergeable, zero formal GitHub reviews recorded (`gh pr view 36 -R u8008916/askanu-rag --json
reviews,mergeable,mergeStateStatus` → `reviews: []`, `mergeStateStatus: "BLOCKED"`). Qasim's
message described it as reviewed and frozen; the exact byte figures quoted (131,072 /
98,304 / 262,144 / etc.) match the PR body verbatim, so the numbers were trusted and implemented,
but the GitHub-recorded state is flagged here for Qasim's awareness in case the PR itself still
needs a formal approval/merge on RAG's side.

**Frozen limits (from PR #36):**

| Component | Limit |
|---|---:|
| `conversation_state` | 131,072 bytes (128 KiB), compact serialized UTF-8 |
| `history` | 98,304 bytes (96 KiB), compact serialized UTF-8 |
| `question` | 2,000 code points + 8,192 UTF-8 byte guard |
| `HistoryTurn.turn_id` | 128 characters |
| `HistoryTurn.content` | 10,000 characters |
| complete `/api/v1/ask` request | 262,144 bytes (256 KiB) raw, as received |

**App-side change (the only one made): `server/src/server.js`'s `MAX_BODY_BYTES` changed from
`64 * 1024` (an App-chosen self-protection headroom figure) to exactly `262_144`** — matching
RAG's `ASK_REQUEST_MAX_BYTES`. Nothing else in the App enforces or interprets RAG's internal
128 KiB/96 KiB component limits; the App remains an opaque carrier whose only transport
responsibility is the shared complete-request boundary.

**Exact-boundary tests (`server/tests/ask.test.js`):**
- `accepts a complete request of exactly MAX_BODY_BYTES (262144) bytes and forwards it unchanged`
  — a body measured with `Buffer.byteLength` at exactly 262,144 bytes gets HTTP 200, and the
  upstream stub received the identical, complete, exactly-sized body (asserted by value, not just
  status) — proving no truncation at the boundary.
- `rejects a complete request of exactly MAX_BODY_BYTES + 1 (262145) bytes with the controlled
  413, never forwarded` — one byte over gets the controlled 413 envelope, and
  `upstream.received.length` is asserted unchanged — proving the oversized request never reached
  RAG.
- The pre-existing chunked-transfer 413 test hardcoded `96 * 1024` as "well past the [old] 64 KiB
  cap" — under the new 262,144-byte cap that literal value would have silently stopped triggering
  a 413 at all (96 KiB < 256 KiB), which would have been a real regression this correction could
  have introduced unnoticed. Fixed to derive the chunked size from `MAX_BODY_BYTES + 1024` instead
  of a hardcoded literal, so it stays correct regardless of the constant's value.

**Transport-failure state fix (§9) — confirmed unaltered.** No line inside `advanceSessionState`
or its call site changed for this correction; `tests/conversationState.test.tsx` and
`tests/sessionState.test.ts` re-run unchanged and still pass in full (§ above).

**Docs synced:** `docs/API_CONTRACT.md` (frozen limits table, replacing the old "question max
2,000 characters / history max 10 prior turns" pair; the body-size paragraph in "Structured
conversation state" marked resolved), `docs/CONVERSATION_CONTRACT.md` (new "V7 transport boundary"
section, mirroring RAG's own), `docs/V7_UI_CONTRACT.md` (§10's body-size entry marked resolved;
§7 item 1 annotated resolved without rewriting the original Day 1 record).

**Full regression after this correction:** frontend 323/324 (unchanged from §9 — no frontend
source touched by this correction); server **50/50** (was 48/48; +2 exact-boundary tests); `tsc
--noEmit` clean; `npm run build` clean, dev gallery/mock transport still excluded from `dist/`.

**Confirms no unrelated Day 2 functionality changed.** The diff for this correction is exactly:
`server/src/server.js` (the one-line `MAX_BODY_BYTES` change plus its doc comment),
`server/tests/ask.test.js` (two new tests plus the chunked-test fix), `docs/API_CONTRACT.md`,
`docs/CONVERSATION_CONTRACT.md`, `docs/V7_UI_CONTRACT.md`, and this evidence file. No frontend
source file was touched. No ResultSet/rendering, retrieval, deployment or UI-redesign work was
pulled in.

This is the last known App Day 2 integration correction per Qasim's message — both cross-repo
gaps from §9 are now closed (state-drop-on-failure corrected in the previous commit, body-size
frozen here). Awaiting Qasim's final review of head `6d9d533` plus this commit before Day 2
closes and Day 3 unblocks.
