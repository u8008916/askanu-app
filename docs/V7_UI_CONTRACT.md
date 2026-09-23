# V7_UI_CONTRACT.md

**V7 Day 1 (`docs/v7/DAY_01.md`) deliverable.** Freezes the App-side UX contracts, the three target
mock states, the canonical result-action payload, Clear Chat semantics, and the exact backend field
needs V7 conversational rendering depends on.

**Status of everything in this document: a proposal, not a contract change.** Nothing here edits
`docs/API_CONTRACT.md`, `docs/CONVERSATION_CONTRACT.md`, or `frontend/src/types/api.ts`. Every field
named in §6 is a request the App is handing to Qasim/Carmen for the Day 1 gate; until they freeze it,
production code does not depend on it. The scaffolding for these shapes lives at
`frontend/src/dev/v7/proposedContract.ts` and is not imported by any production module — see
`docs/evidence/V7_DAY_01_UX_CONTRACT_FREEZE.md` for the bundle-exclusion proof.

Read this after `AGENTS.md`, `my_day_by_day_tasks.md`, `docs/API_CONTRACT.md`,
`docs/CONVERSATION_CONTRACT.md` and `docs/V3_LOCKED_DECISIONS.md`, and before starting any V7 Day 2+
App work.

**23 Sep addendum:** Qasim has since settled a more concrete UI direction on top of §1–§7 below — see
§8. It does not replace anything here; it names a sixth response type (`entity_summary`) alongside the
`result_set`/`comparison`/`clarification`/`unknown` shapes §2–§3 already describe, and it restates the
`conversation_state` sequencing constraint (do not lock implementation to a concrete shape until
Carmen's shared-contract PR gets Qasim's GO).

## 1. Inventory — what already exists

No V7 UI work starts from nothing. This is what the App already renders, with the file that owns it
and the evidence that already proved it, so this document does not re-litigate settled ground.

| Surface | Owning file(s) | States already proved |
|---|---|---|
| Chat turns | `chat/ChatPanel.tsx`, `chat/AssistantTurn.tsx`, `chat/useChatSession.ts` | empty (`Try asking`), active, pending, all six frozen `status` values |
| Answer rendering | `chat/AnswerBody.tsx`, `chat/answerBlocks.ts` | paragraphs, bullet/numbered lists, `**emphasis**` — from parsed plain text, never markup |
| Sources | `chat/SourceCards.tsx`, `util/safeUrl.ts` | backend order preserved, `javascript:`/malformed URLs refused as links, missing-title records render |
| Clarification | `chat/AssistantTurn.tsx`'s `ClarificationOptions` | single-select (button) / multi-select (checkboxes + "Use selection"), free-text always allowed, only the latest turn's clarification stays live (Day 13, `tests/clarificationLifecycle.test.tsx`) |
| Clear Chat | `chat/useChatSession.ts`, `layout/ClearChatButton.tsx` | aborts in-flight request, clears turns + `pendingClarification`, restores `Try asking`; desktop header + mobile drawer (`layout/MobileDrawer.tsx`) |
| Six guided launchers | `domains/DomainLauncher.tsx`, `domains/domainConfig.ts`, `pages/*Page.tsx` | recommended-question cards prefill the composer, never auto-send, never clear the session (V5 rule); official resource links (Day 5–16 evidence) |
| Upcoming Events / Current Jobs | `resources/UpcomingEventsCard.tsx`, `resources/CurrentJobsCard.tsx`, `resources/FeedPanel.tsx` | loading / ready (items or empty) / unavailable; official-only source split enforced server-side, not by the App (Day 15–16 evidence, §4/§9/§10) |
| Mobile drawer | `layout/MobileDrawer.tsx` | 7 nav links + Clear Chat, no overflow at 360–430px (Day 13/16 evidence) |
| Theme | `theme/useTheme.ts`, `styles/tokens.css` | system / forced light / forced dark, token-driven, no raw colour literals |

Two interaction rules are already frozen and reused everywhere below rather than invented per state:

1. **Prefill, editable, never auto-send.** Launcher cards and clarification options both put text in
   the composer and focus it; nothing the student did not explicitly send reaches the backend.
2. **The App never reorders, filters, dedupes or interprets backend data.** Source order, job/event
   order, and (per this document) result-set/comparison order are all rendered exactly as received.

## 2. UI contracts

Each contract states what the App renders, what it never decides, and what it needs from the backend
(cross-referenced into §6).

### Result set
Bounded, ordered cards. Order is the `items` array order — the App never sorts, pads, dedupes or
truncates. Each card shows title, a domain badge, and safe optional fields (`label`/`value`,
`value: null` renders the neutral unknown label — see §6.1). Exactly one canonical action per card
("Ask about this" — see §4). `EMPTY` renders the backend's own plain statement with no cards and no
evidence-failure styling. `INCOMPLETE` renders whatever cards exist plus the backend's own caveat text
— the App adds no "incomplete" wording of its own.

### Selected result
A student may say "the second one" or use a card's action; either way the backend resolves identity.
When the App has a structured selection (a card was clicked), it sends the canonical
`SelectedResultAction` (§4) — never a guessed title, never a re-derived position.

### Clarification
Unchanged from the frozen v1 shape (`API_CONTRACT.md`). Restated because V7 depends on it: options
render in backend order, free text is always an alternative to clicking an option, only the latest
`pendingClarification` is answerable (older ones are visible history, disabled — Day 13), and an
explicit new question is allowed to interrupt a pending clarification rather than trap the student
(Day 2 verifies this end to end).

### Comparison
Two or more entities across backend-provided dimensions. Desktop renders a table; narrow widths may
scroll it horizontally rather than clip it. A `null` cell shows the same neutral unknown label a
result card uses — never blank, never the other entity's value, never inferred. Dimensions render in
the backend's declared order and are never dropped because one entity lacks them.

### Partial
Renders exactly like `ok` — the backend's own `answer` text carries the caveat (unchanged V3 rule,
already implemented for Jobs/Accommodation/Support/Events). If a future `answer_state` field arrives
(§6.3), a `PARTIAL` value may add a small, non-red label; the App still authors no wording about *what*
is missing.

### Useful unknown
Three parts, all backend-supplied: a direct statement of what cannot be established (the `answer`),
why the evidence is insufficient (also the `answer`), and an official next action (a canonical link,
§6.4). Rendered with the same info/gold-tint treatment as an ordinary notice — never `StatusNotice`'s
red `error` treatment, and the next-action block itself carries no "Not enough evidence" heading.
UNKNOWN must never read as "no results," and EMPTY must never read as an evidence failure — these are
different backend states with different causes and the App keeps their presentation visibly different.

## 3. Three target mock states (acceptance references)

Built as a dev-only gallery (`frontend/src/dev/v7/V7StateGallery.tsx`, route `/dev/v7-states`, gated
identically to `FixturePicker` — dev build + `VITE_USE_MOCK_TRANSPORT=1` only) inside the real chat
shell, so the screenshots below show the actual chat column, resource rail and mobile drawer, not an
isolated component sandbox.

| # | State | Fixture shape | What must be visible |
|---|---|---|---|
| 1 | Accommodation discovery result set | `status: ok`; 3 residence cards (`accommodation:residence:placeholder-*`); fields `Weekly cost` / `Catering` / `Room type`, one `null` per card in a different position each time; `result_set.status = RESULTS` | Cards in fixture order (A, B, C); "Ask about this" on each; a `null` field renders "Not published in the stored record", never blank; source cards beneath; no invented cost/vacancy figure anywhere |
| 2 | Comparison + selected result | Same two residences (A, B); comparison table with one `null` cell per entity (Catering missing for B, Room type missing for A); a "Selected: Placeholder residence B" chip with a dismiss control | Table shows every dimension once; the missing cell reads "Unknown", not copied from the other entity; chip visible, dismissible; (composer wiring is Day 2 — this page has no send path) |
| 3 | Useful unknown + next action | `status: insufficient_evidence` (nearest frozen status to proposed `UNKNOWN` — see §6.3 gap) + a proposed `next_action` link to the official residence page | Direct statement + reason (both from `answer`); an "official next step" link, `https:`, `target="_blank"`, `rel="noopener noreferrer"`; no red, no `role="alert"`, not styled as an error |

Evidence (screenshots at 1280×720 desktop and 360/390/430 mobile, light + dark, plus responsive
overflow measurements) is in `docs/evidence/V7_DAY_01_UX_CONTRACT_FREEZE.md` §5–§6. A fourth,
test-only state (`hostileUsefulUnknownFixture`) exercises safe rendering against hostile strings and a
`javascript:` next-action URL; it is not one of the three acceptance references.

## 4. Canonical result-action payload

Proposed addition to `conversation_state`, alongside `pending_clarification` (nullable; absent/`null`
when no result is selected):

```json
{
  "conversation_state": {
    "pending_clarification": null,
    "selected_result": {
      "result_set_id": "rs_...",
      "entity_id": "accommodation:residence:...",
      "position": 2
    }
  }
}
```

Rules:
- `entity_id` is copied verbatim from the backend item that produced the card — the App never
  constructs, guesses or normalizes it.
- `position` is the 1-based index in the `ResultSet.items` array exactly as received. It is not
  recomputed after any client-side change (there is none: the App never re-sorts) and is not derived
  from a rendered label.
- Set when a card's "Ask about this" action is used; shown as a dismissible chip near the composer;
  carried on the next request; cleared after that response resolves it, on explicit dismiss, or on
  Clear Chat.
- The card action still only prefills an editable question in the composer (the V5 rule, §1) —
  identity travels structured in `selected_result`, the student's words stay free text in `question`.
  These are independent channels; neither replaces the other.

## 5. Clear Chat semantics

**Visual (unchanged, V3-locked):** same button, same label ("Clear Chat", never "New Chat"), same
placement (desktop header / mobile drawer). Restores `Try asking`. V7 adds: also clears any
selected-result chip (§4) and any composer draft. *Proposed, Day 2 scope:* a polite live-region
announcement ("Conversation cleared") for screen-reader users, since V7 clarification/result state
makes the post-clear state change more consequential than before.

**Backend reset — this is a contract gap, not solved here.** Today the backend is stateless per
request (`server/src/server.js` is a byte-for-byte proxy; there is no session id, no server-side
conversation state, no reset endpoint). V7's bounded session-retention policy (master plan §2/§3)
needs *some* mechanism, and the App has one requirement regardless of which: **one client action, no
login, and provably deterministic** — after Clear Chat, a stale follow-up ("how much does it cost?")
must clarify or fail to resolve, never silently answer against the old entity. Two options, handed to
Qasim/Carmen for Day 1:

- **(A, recommended) Client-carried opaque state.** The backend returns an opaque, bounded
  `session_state` value in the envelope; the App echoes it back in
  `conversation_state.session_state` on the next request; Clear Chat simply drops it (sets it to
  `null`/absent). No new endpoint, no cookie, server stays stateless, and the reset is correct by
  construction — the old state is not stored anywhere for a stale request to find. Flags to resolve
  before this lands: the existing 64 KiB body cap (`server/src/server.js`) and the frozen 10-turn
  `history` limit (`docs/API_CONTRACT.md`) against the 20-turn canonical acceptance journey (master
  plan §2) — an opaque blob has to fit inside both, or one of those limits needs revisiting.
- **(B) Server-side session.** A `session_id` plus a `POST /api/v1/session/clear` (or equivalent) the
  App calls on Clear Chat. Needs an answer to "what does the student see if the reset call itself
  fails?" — a real failure mode (A) does not have, since dropping a client-held value cannot fail.

The App does not have a preference beyond the requirement above; (A) is recommended because it needs
no new endpoint and cannot fail to reset.

## 6. Component/state matrix and exact backend field needs

### Matrix

Semantics owner is always the backend; the App is only ever the renderer.

| Component | loading | RESULTS | EMPTY | INCOMPLETE | needs_clarification | PARTIAL | UNKNOWN | error | mobile ≤430 | keyboard |
|---|---|---|---|---|---|---|---|---|---|---|
| Result cards | — (no result state exists pre-response) | cards, backend order | plain statement, no cards | cards + backend caveat | n/a | n/a | n/a | n/a | stack, no overflow | each card a real `<button>`, reachable, named |
| Comparison table | — | n/a | n/a | n/a | n/a | renders like RESULTS | n/a | n/a | horizontal scroll, not clip | cells not separately focusable; row/column headers give screen-reader structure |
| Useful unknown block | — | n/a | n/a | n/a | n/a | n/a | statement + reason + next action, info treatment | never rendered here (error is `StatusNotice`, unchanged) | stacks under the answer | link keyboard-reachable, `noopener noreferrer` |
| Clarification | — | n/a | n/a | n/a | options + free text, latest only live | n/a | n/a | n/a | already proved (Day 13) | already proved (Day 13) |
| Selected-result chip | — | shown after a card action | n/a | n/a | cleared if clarification interrupts | shown | shown | cleared | wraps, dismiss control ≥44px | dismiss is a real button |

### Field needs (ranked; all proposed — Qasim/Carmen decide placement and naming)

1. **`items[]` element shape** for a result set: `entity_id` (same identity scheme as `Source.record_id`
   and clarification `option.id` — one scheme, not three), `domain`, `entity_type`, `title`, `url`
   (canonical, stored — never Gemini, matching the existing provenance invariant), `source_id`,
   `fields: [{label, value: string | null}]` (as stored; explicit `null`, never an omitted key, so the
   App never has to guess "missing" vs "empty string"). *Highest priority — nothing in §2/§3 renders
   without it.*
2. **ResultSet status + identity**: a top-level `result_set: {result_set_id, status: RESULTS |
   EMPTY | INCOMPLETE, items: [...]} | null`. Needed so the App never converts an UNKNOWN/INCOMPLETE
   state into "no results," and so §4's `selected_result.result_set_id` has something to reference.
3. **`answer_state: CONFIRMED | DERIVED | PARTIAL | UNKNOWN`**, explicit on the envelope. Without it the
   App would have to infer epistemic state from the existing `status` enum, which conflates transport
   status with reasoning state — exactly what the master plan's answer-state/ResultSet-status
   separation (§2/§3) says not to do.
4. **`next_action: {label, url} | null`** for useful-unknown answers — an official page, canonical URL,
   same provenance rule as `Source.url`.
5. **Comparison dimensions**: same `fields` labels across every compared item, explicit `null`,
   backend-declared order. (No new top-level field if comparison is delivered as two-or-more
   `ResultSet.items` sharing field labels — flagging the option, not requiring a new shape.)
6. **Session reset mechanism** — §5's two options, needs one explicit answer before Day 2.
7. **Optional, low priority: resolved-entity echo** (`{entity_id, label}`) so the UI could show "About:
   X" after a typed reference like "the second one" resolves. Master plan §6 says cross-domain return
   needs no heavy UI state, so this is a nice-to-have, not a blocker.

### What the App will not need

Match/relevance scores, ranks, confidence percentages, eligibility/vacancy booleans, or any
source-authority/internal-routing flag. None of these has a frozen student-facing meaning
(`CONVERSATION_CONTRACT.md`: "No Relief Mate confidence labels"), and source authority must never leak
to the browser (`API_CONTRACT.md`'s provenance invariant, and the Day 15/16 evidence that the App does
no source-based filtering of its own).

## 7. Open questions for the Day 1 gate

1. Which of §5's two Clear Chat mechanisms, and does it fit the existing 64 KiB body cap / 10-turn
   history limit, or do those need to move for the 20-turn acceptance journey?
2. Where do §6 items 1–5 land — new top-level fields on the existing `/api/v1/ask` envelope, or a
   versioned v2 contract? (This document takes no position; `types/api.ts` is unchanged either way
   until that's decided.)
3. Is `insufficient_evidence` the permanent status value for a useful-unknown answer, or does
   `answer_state: UNKNOWN` replace it as the signal the App keys presentation off? Today's mock uses
   `insufficient_evidence` because it is the only frozen status close to it (§3 state 3).

## 8. 23 Sep addendum — settled response-type UI direction

Qasim relayed this as the settled V7 UI target, alongside a mock-up (an events-list chat response).
It sharpens §1–§7 rather than replacing them.

**Shell is not a redesign target.** Keep the existing desktop layout exactly as built: chat as the
large left column, the existing right-hand rail (Explore nav, Quick Links, Upcoming Events, Current
Jobs), `Clear Chat`, orange/cream branding, and the existing mobile drawer. Cards and results render
**inside** the chat column — AskANU is not becoming a separate search-results page. This is a request
for functional hierarchy and response behaviour to match, not a pixel-perfect reproduction of the
mock-up.

**The change is inside the chat response, not the shell.** Some `ok` answers today render as long
text/database dumps rather than something a student can scan (Warrumbul was the named example; Events
answers also currently carry raw ISO-8601 timestamps in prose — see §5/§7 of
`docs/evidence/DAY_16_SIX_DOMAIN_RELEASE_VERIFICATION.md`, an already-known, already-recorded gap).
The renderer should pick a presentation from a small set of response types rather than one generic text
bubble, and Carmen/RAG supplies the structured data each type needs — the frontend still authors no
institutional fact, it only decides layout:

| Type | Student-facing shape | Relationship to §2 |
|---|---|---|
| `answer` | Plain concise conversational answer (e.g. "Warrumbul Lodge is self-catered.") | Existing `ok`/`AnswerBody` rendering — unchanged |
| `entity_summary` | **New, not yet modeled in §2/§3.** A compact single-entity overview: name, one-line description, then labelled fields (e.g. Cost / Catering / Residents / Facilities), then actions (e.g. "Room types & prices · How to apply · Compare"), official source underneath | Closest existing shape is a single-item `ResultItem` (§6.1's `fields`), but §2's "Result set" contract is written for *bounded ordered cards*, plural — a summary of one entity needs its own contract, not a one-item result set |
| `result_set` | Discovery/list results (events, scholarships, jobs): numbered cards with title/time/location/organiser, an *optional* image (never required — the design must look complete without one), a "+ Show more" expand control, and a collapsible Sources section underneath | Matches §2's "Result set" contract and the Day 1 gallery's `ResultCards` block; "+ Show more" and optional images are additions to design once, not built in the Day 1 gallery |
| `comparison` | Side-by-side structured comparison | Matches §2's "Comparison" contract and the Day 1 gallery's `ComparisonTable` block, unchanged |
| `clarification` | Selectable options, unchanged | Already implemented (§1) |
| `unknown` / `partial` | Direct statement + reason + next action | Matches §2's "Useful unknown"/"Partial" contracts and the Day 1 gallery's `UnknownWithNextAction` block, unchanged |

**Events provenance inside chat (restates and sharpens the existing rule):** the Upcoming Events sidebar
panel stays official-ANU-only, unchanged, already enforced server-side (Day 15/16 evidence). A
`result_set` answer to an Events question in chat may mix official ANU Events with approved Rubric
ANU-community events; a Rubric-sourced card needs a subtle, distinct provenance label — e.g. "ANU
community · via Rubric" — and must never be presented as an official ANU event. This is a rendering
requirement on the `result_set` card, not a new source-filtering decision — the App still does not
decide which source is authoritative, it only labels what the backend already tells it via `source_id`.

**Not every answer becomes a card.** The renderer depends on what the response actually is; a simple
factual question (e.g. "Is Warrumbul catered?") stays a plain `answer`, not a forced `entity_summary`
or `result_set`.

**`conversation_state` sequencing constraint (unchanged from §5, restated because it is easy to jump
ahead of):** do not lock App implementation to a concrete `conversation_state` shape until Carmen's
shared-contract PR is frozen, merged, and Qasim has given an explicit GO. Until then, the App's
`conversation_state` responsibility is exactly the transport/session role §5 already describes: store
the authoritative state RAG returns for the current chat, echo it back on the next request, and wipe it
(with visible history) on Clear Chat. The App does not interpret or mutate Carmen's semantic state.

**Added to the field-needs list (§6), pending Qasim/Carmen placement:**
8. A `response_type` (or equivalent) discriminator on the envelope — `answer | entity_summary |
   result_set | comparison | clarification | unknown | partial` — so the App selects a renderer from an
   explicit backend signal rather than inferring one from `status` + shape of `items`/`sources`.
9. For `entity_summary`: a single `ResultItem`-shaped payload (§6.1) plus an `actions: [{label,
   prompt | url}]` list for the follow-up affordances (e.g. "Room types & prices").
10. For `result_set` cards: an optional `image_url` per item (nullable — rendering must not depend on
    it being present) and whatever pagination signal backs "+ Show more" (e.g. a `has_more: boolean` or
    a larger `items` array the App paginates client-side over a fixed page size — flagged as an open
    question, not decided here).
11. Rubric provenance on a `result_set` item is already carried by the existing `source_id` field
    (`API_CONTRACT.md`); no new field is needed for this specific requirement, only a rendering rule
    keyed off the value the backend already sends.

**Open question added to §7 by this addendum:** what discriminates "+Show more" pagination — a
`has_more` flag, a total count, or does the App just cap the initial render of a longer `items` array
client-side? None of §2/§3/§6 as originally written commits to an answer.

## 9. Architecture readiness — Day 1's own asks, per Qasim's 23 Sep message

Qasim's fuller 23 Sep message named seven concrete Day 1 asks. This section records what each one
means for the App and what now exists against it. **None of it wires into production
(`frontend/src/types/api.ts`, `chat/useChatSession.ts`, `chat/AssistantTurn.tsx`) — everything here
stays proposal/dev-only, per the explicit instruction below not to lock onto an unmerged schema.**

### 9.1 Review of `askanu-rag` PR #34

`askanu-rag` PR #34 ("V7 Day 1 — Freeze shared conversational RAG contracts") was read in full
(wire contract, `docs/API_CONTRACT.md`/`docs/CONVERSATION_CONTRACT.md` diffs, and the new
`docs/v7/DAY_01_SHARED_CONTRACTS.md`) as of 23 Sep 2026. Status: **open, not merged, mergeable**
(17 files, +2632/-28). It is Carmen's Day 1 deliverable, not the App's, so this is a read for
App-side implications, not a review comment on that repo's PR — Qasim reviews and merges it himself.

Findings relevant to the App:

- **The wire change is exactly additive, and exactly Option A from §5.** `request = question + bounded
  history + optional conversation_state`; `response = existing envelope + authoritative
  conversation_state`. Every response status (`ok`/`error`/`needs_clarification`/...) gains the same
  field. Omitted `conversation_state` on the request initialises an empty schema-version-1 state; the
  old `{pending_clarification: ...}`-only shape stays valid. **This resolves §7 open question 1**: the
  Clear Chat mechanism is confirmed as client-carried opaque state, no new endpoint, no session ID.
- **`askanu-rag`'s own `docs/CONVERSATION_CONTRACT.md` names the App's Clear Chat responsibility in
  those words**: "The App... sends the next request with empty `history` and either omits
  `conversation_state` or sends the empty schema-version-1 state. The RAG service is stateless between
  requests... so that request cannot see the previous conversation." This is a stronger, repo-owned
  confirmation of §5 than this document could assert on its own.
- **The App genuinely does not need to type the internal shape.** Carmen's schema (`recent_entities`,
  `focus`, `student_facts`, `constraints`, `result_sets`, `selected_result`, `pending_clarification`,
  bounded at 12/6/20/16/12/1 respectively) is real, versioned (`schema_version: 1`) and validated
  server-side as untrusted input — but from the wire contract's own words, "the App does not
  semantically interpret it." The App's job is store/echo/clear, full stop.
- **This PR is about session *state*, not response *rendering*.** It does not add `items`, `result_set`,
  `answer_state`, `next_action` or any `response_type` field to the response envelope — those remain
  §6/§8 asks for whenever RAG's Day 3+ retrieval/response work produces them. Do not conflate "Carmen's
  state contract is close to frozen" with "the rendering fields this document asks for exist yet."

### 9.2 Prepared: opaque `conversation_state` transport (asks #2, #3)

`frontend/src/dev/v7/sessionState.ts` — four pure functions (`emptySessionState`, `toRequestField`,
`fromResponseEnvelope`, `clearSessionState`) implementing exactly the store/echo/clear pattern §9.1
confirms, typed as `OpaqueConversationState = unknown` so the module is correct regardless of Carmen's
exact field names changing during review. Tested in isolation
(`frontend/tests/sessionStateArchitecture.test.ts`): stores an opaque value by reference (never clones
or inspects it), omits the field entirely for a fresh/cleared session (matching "omits
`conversation_state`" above), and proves a full store → echo → Clear Chat → next-request round trip
leaves nothing for a stale follow-up to resolve against.

**Not wired into `useChatSession.ts`.** Once Qasim gives the GO on PR #34, wiring this in is: add one
optional field to `AskRequest`/`AskResponse` in `types/api.ts`, hold a `SessionStateHolder` alongside
`pendingClarification` in `useChatSession.ts`, and call these four functions at the same three points
`pendingClarification` already updates (send, response, `clearChat`). This module exists so that step
is small and low-risk when it happens, not to pre-empt it.

### 9.3 Prepared: response-type dispatcher architecture (ask #5)

`frontend/src/dev/v7/ResponseRenderer.tsx` — given a `ProposedResponse` (a discriminated union on a
proposed `response_type` field: `answer | entity_summary | result_set | comparison | unknown |
partial`), dispatches to one of `responseBlocks.tsx`'s render blocks. TypeScript's exhaustiveness
check over the switch is the concrete proof of "not permanently locked into one generic Markdown
response": adding a member to `ProposedResponse` is a compile error here until a case handles it.
`clarification` is not a dispatcher case — that shape already works, unchanged, through
`AssistantTurn.tsx`'s real `ClarificationOptions`.

To prove the dispatcher generalises beyond the three states Day 1 originally modeled, a fourth gallery
state renders Qasim's own example — "Tell me about Warrumbul Lodge" as an `entity_summary` (title,
one-line description, `Cost`/`Catering`/`Residents`/`Facilities` fields with the same neutral-unknown
missingness rule as every other block, and three follow-up actions — "Room types & prices," "How to
apply," "Compare" — each only prefilling the composer, never sending). `result_set`, `comparison` and
`unknown`/`partial` route through the same `ResultCards`/`ComparisonTable`/`UnknownWithNextAction`
blocks the three Day 1 acceptance states already use, extracted into `responseBlocks.tsx` so the
gallery and the dispatcher share one implementation rather than drifting apart. Tested in
`frontend/tests/responseRenderer.test.tsx` (one case per `response_type`, plus the missingness/no-error
rules each block already enforces) and `frontend/tests/v7StateGallery.test.tsx` (the entity_summary
demo rendered live through the dispatcher).

**What this deliberately does not do:** build the full events card catalog (images, "+ Show more"
pagination, the Rubric provenance badge) or any other production-facing component. Per Qasim's own
instruction — "Don't try to build every card/component today" — those stay documented asks (§8) and
open questions (§7), not code, until Day 2+.

### 9.4 Asks #4, #6, #7 — already satisfied, not new work

- **#4 (semantic intelligence stays in RAG):** already the frontend's standing rule (§1's "two
  interaction rules," `AGENTS.md`'s repo boundary). Nothing added this pass changes it — the session
  state and response type are both opaque/backend-declared inputs to the App, never App-computed.
- **#6 (keep the shell):** unchanged; every new block in this pass renders inside the existing chat
  column using only `tokens.css` custom properties, verified live (§10 of the evidence file).
- **#7 (document backend needs):** this document's §6 (fields) and §7 (open questions) already are that
  list; §9.1 sharpens it with what PR #34 does and does not cover.
