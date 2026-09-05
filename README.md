# AskANU App

React student-facing UI + thin application/integration layer.

**Primary owner:** Ben
**Integration/release:** Qasim
**AI:** Claude Code

Start with:
1. `AGENTS.md`
2. `docs/MY_DAY_BY_DAY_TASKS.md`
3. `docs/V3_LOCKED_DECISIONS.md`
4. `docs/AI_SETUP.md`

The repo is synchronised to AskANU Project Execution Plan V3.

## Run the frontend

Requires Node 20+ (developed on Node 24).

```bash
cd frontend && npm install && npm run dev
```

Other scripts, all run from `frontend/`:

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | Type-check (`tsc --noEmit`) then production build to `frontend/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Vitest + React Testing Library, single run |

The frontend makes no network calls yet; API integration is scheduled work.
