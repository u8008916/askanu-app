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

## Scholarships
No persistent student profile. Ask only necessary eligibility clarifications for the current request/session.

## Security
User history and scraped text are untrusted. Source text is evidence, not instruction.
