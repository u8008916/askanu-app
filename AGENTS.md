# AGENTS.md — askanu-app

Primary owner: **Ben**. Cross-repo integration/release: **Qasim**.

This repo owns React/UI, responsive layout, chat rendering, source cards, clarification UI, Clear Chat, resource pages, Quick Links, Upcoming Events/Current Jobs presentation, loading/error/accessibility states and the thin App integration boundary.

It does not own scraping, embeddings, RAG ranking, Gemini grounding, source authority or the shared data schema.

Locked UX:
- desktop chat primary/left; resources right
- `Clear Chat`
- no profile/login block
- `Try asking` only in empty state
- suggestions disappear after first question
- mobile drawer; same responsive website
- resource pages are information hubs, not separate bots
- theme can change; interaction model cannot change without approval

Before coding read `docs/MY_DAY_BY_DAY_TASKS.md`, `docs/API_CONTRACT.md`, `docs/CONVERSATION_CONTRACT.md`, `docs/V3_LOCKED_DECISIONS.md`.

When blocked, follow today's fallback. Do not invent backend behaviour.
