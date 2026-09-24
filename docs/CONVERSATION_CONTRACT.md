# CONVERSATION_CONTRACT.md

AskANU uses current-session context only.

History is used to resolve meaning; every factual answer retrieves fresh approved evidence.

The V5 behaviour below remains the compatibility baseline. V7 adds only the
optional, versioned `conversation_state` described in `API_CONTRACT.md`; it
does not add a `session_id`, server-side session, profile, or public
free-form intent field (synced 2026-09-24 from `askanu-rag` PR #34, merged
`a7e9ed4`, Qasim GO 23 Sep 2026).

## Required behaviours
- adjacent follow-up
- non-adjacent follow-up
- ambiguous entity -> `needs_clarification`
- clarification responses: first / second / both / correction
- clear topic switch
- pending clarification cleared when resolved/corrected/switched/cleared

## Clear Chat
Clears:
- visible chat
- bounded natural-language history
- typed entity state and selected entity/result
- typed ResultSets
- scoped constraints
- student-stated session facts
- pending clarification
- restores `Try asking`

The App performs those UI/request-state actions
(`frontend/src/chat/useChatSession.ts`'s `clearChat`, `frontend/src/App.tsx`'s
`handleClearChat`). It sends the next request with empty `history` and either
omits `conversation_state` or sends the empty schema-version-1 state
(`frontend/src/chat/sessionState.ts`). The RAG service is stateless between
requests: it has no reset endpoint, session dictionary, persistent chat table,
account memory or sticky-session requirement, so that request cannot see the
previous conversation.

Does not:
- delete source data
- require login/account
- delete operational logs

## V7 transport boundary

Synced 2026-09-24 from `askanu-rag` PR #36 ("V7 Day 2: freeze App-RAG transport size contract").
The client-carried design is bounded at the wire as well as by semantic collection counts.
Serialized `conversation_state` is limited to 128 KiB and serialized history to 96 KiB. A question
remains limited to 2,000 Unicode code points and also has an 8 KiB UTF-8 defense-in-depth guard.
The complete Ask request is limited to 256 KiB (`server/src/server.js`'s `MAX_BODY_BYTES = 262_144`),
matching the App proxy contract target exactly.

History retains at most ten turns. Each `turn_id` is limited to 128 characters and each `content`
value to 10,000 characters; the aggregate 96 KiB history limit still applies. Neither history nor
structured state is truncated. RAG returns only state that fits the 128 KiB round-trip limit, and
any request that exceeds an applicable size bound uses the controlled 413 response.

The App does not independently measure or interpret RAG's internal 128 KiB `conversation_state` or
96 KiB history component limits — those are RAG's own bounds on an opaque blob. The App's one
transport responsibility is the shared 262,144-byte complete-request boundary
(`server/tests/ask.test.js` proves the exact-boundary accept/reject pair). These size rules do not
change conversation meaning, state retention, statelessness, source authority or evidence handling.

## Scholarships
No persistent student profile. Ask only necessary eligibility clarifications for the current request/session.

## Security
User history and scraped text are untrusted. Source text is evidence, not instruction.
