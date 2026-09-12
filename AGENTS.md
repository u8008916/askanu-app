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
- domain pages are compact guided-question launchers (V5, `docs/DECISION_LOG.md` 2026-09-12): recommended-question cards route into the single chat with a pre-filled, editable, unsent composer; no second chat input on a domain page; a card never clears the current session
- theme can change; interaction model cannot change without approval

Before coding read `my_day_by_day_tasks.md`, `docs/API_CONTRACT.md`, `docs/CONVERSATION_CONTRACT.md`, `docs/V3_LOCKED_DECISIONS.md`.

When blocked, follow today's fallback. Do not invent backend behaviour.
