# V6 Thu 17 Sep evidence — selectable clarification, mobile stabilisation, five-domain demo readiness

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day13-five-domain-UX` · continues from HEAD `bb7bd29`
**Date:** Thursday 17 September 2026 — V6 Day 13 (`docs/MY_DAY_BY_DAY_TASKS.md`: "CONVERSATION + MOBILE + DEMO STABILISATION")
**Deliverable:** Finish mobile interaction and clarification UI across the five shipped domains (Courses, Scholarships, Jobs, Accommodation, Support), fix any shared P0/P1 defect centrally, and freeze a repeatable Friday demo baseline. Events/Rubric stays intentionally out of scope — it ships Saturday — and its nav entry must stay truthfully disabled, not implied-complete.

No CI is attached to this branch (none exists in the repo yet). Numbers below are real `npm test` / `npm run build` output and real DOM/computed-style measurements taken through the Browser pane's CDP `resize_window` and `javascript_tool`, per the convention in `DAY_09`/`DAY_10`/`DAY_11B`/`DAY_12` evidence.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.7.

---

## 0. Summary

| | |
|---|---|
| Scope | Selectable clarification controls (the item `AssistantTurn.tsx`/`assistantTurn.test.tsx` had explicitly deferred to "Day 13"); a real Quick Links truncation defect found during the mobile pass; full five-domain regression; demo-journey script |
| Changed | `frontend/src/chat/AssistantTurn.tsx`, `AssistantTurn.module.css`, `ChatPanel.tsx`, `App.tsx`, `resources/QuickLinksCard.tsx`, `resources/Panel.module.css` |
| Tests — extended | `tests/assistantTurn.test.tsx` (+6: single-select button fill, keyboard `Enter` activation, multi-select "both" via checkboxes, single-pick-of-one via checkboxes, keyboard `Space` toggle; 1 existing test updated from "not as controls" to "as selectable controls") |
| Tests — updated for new copy | `tests/accommodationPage.test.tsx`, `tests/scholarshipsPage.test.tsx`, `tests/supportPage.test.tsx` (clarification note text) |
| New runtime dependencies | **0** |
| Backend/contract changes | **0** — `Clarification`/`ClarificationOption` types, the `/api/v1/ask` envelope and `conversation_state.pending_clarification` are unchanged. A selected option only ever writes into the same composer draft a domain-launcher card already writes into; it never bypasses "prefill, focus, never auto-send" |
| P1 defect found and fixed this pass | Quick Links tile labels (`QuickLinksCard.tsx`, both the 2×2 rail/drawer grid and the mobile-home row) hard-clipped mid-word at narrow widths with no ellipsis, because `text-overflow: ellipsis` was set on the flex row mixing the icon and the text, not on the text run itself — CSS only ellipsises a single inline text box, so it silently no-opped. Fixed by wrapping each label in its own `overflow:hidden` span. Confirmed both before ("AnuHuk", "MyTime", "ANU Ca" — hard cut, no `…`) and after ("MyTim…", "ANU C…" — real ellipsis) in-browser at 360/390px |

---

## 1. Selectable clarification controls (today's headline item)

`assistantTurn.test.tsx` carried this exact line until today: *"Selectable controls are Day 13. Today the student replies in words."* This pass implements that deferred item without touching the conversation contract:

- **Single-select** (`allow_multiple: false`): each option renders as a real `<button>`. Clicking (or `Enter`/`Space` while focused, native `<button>` behaviour) calls `onSelectClarification(option.label)`, which does exactly what a domain-launcher `RecommendedQuestionCard` already does — `setDraft(text)` + bump `focusComposerSignal` in `App.tsx` — filling and focusing the composer, never sending. Verified live: selecting "COMP1600" from the 7-option broad-catalogue fixture put `"COMP1600"` in the composer and returned focus to it, with **no new turn added**.
- **Multi-select** (`allow_multiple: true`): each option renders as a checkbox, plus a "Use selection" button (disabled until at least one is checked). Selecting produces the exact conversational wording the contract names: two selections join as `"Both <A> and <B>"`; one selection passes through as-is; three or more join as `"A, B and C"`. Verified live with the COMP1110/COMP1600 fixture: checking both and clicking "Use selection" put `"Both COMP1110 and COMP1600"` in the composer, unsent.
- The message-box fallback stays: the note under the controls always says the student can still reply in words, and typing continues to work exactly as before (existing per-domain "renders clarification naturally and supports a session follow-up" tests, all still green, only their note-text assertion updated).
- Every option row (52px measured) and the "Use selection" button (44px measured) clear the `--touch-target-min` (44px) token at 360px.
- Keyboard: confirmed via `@testing-library/user-event` — a live remote-browser CDP `key: space` dispatch did **not** toggle the checkbox in this run (a known limitation of that automation path, not of the app: the identical interaction through `user.keyboard(' ')` in a real DOM via jsdom passed immediately). Both a button-`Enter` test and a checkbox-`Space` test are now permanent regression tests in `assistantTurn.test.tsx` rather than relying on manual browser checks, since native `<button>`/`<input type="checkbox">` elements are keyboard-operable by HTML semantics and no custom keydown handling was added that could break that.

No change to `types/api.ts`, `parseAskResponse`, or any request payload: `conversation_state.pending_clarification` is still whatever the last response sent, independent of which turn's controls the student clicked.

## 2. Five-domain regression — real DOM measurements

Desktop 1280×720, dev server, all five domains, `document.documentElement.scrollWidth`/`clientWidth` plus a card-region query:

| Domain | h1 | cards | scrollWidth / clientWidth |
|---|---|---|---|
| Courses | Courses | 4 | 1280 / 1280 |
| Scholarships | Scholarships | 4 | 1280 / 1280 |
| Jobs | Jobs | 4 | 1280 / 1280 |
| Accommodation | Accommodation | 4 | 1280 / 1280 |
| Support Services | Support Services | 4 | 1280 / 1280 |

Mobile, home route plus all five domains, `scrollWidth` vs `clientWidth` at each frozen width (no route overflows at any width):

| Width | Home | Courses | Scholarships | Jobs | Accommodation | Support |
|---|---|---|---|---|---|---|
| 360 | 360/360 | 360/360 | 360/360 | 360/360 | 360/360 | 360/360 |
| 390 | 390/390 | 390/390 | 390/390 | 390/390 | 390/390 | 390/390 |
| 430 | 430/430 | 430/430 | 430/430 | 430/430 | 430/430 | 430/430 |

Mobile drawer (close, Clear Chat, Explore nav, Quick Links) opened and closed cleanly at 360px with `Escape`-to-close and focus returned to the toggle button (existing behaviour, re-verified, unchanged this pass).

## 3. Events — truthful state, unchanged

`DomainNav.tsx` still renders Events with no `to`, `aria-disabled="true"`, and the shared note "Remaining resource pages coming soon." This is correct and was **not** touched: Events/Rubric ships Saturday per the day-by-day plan, and the nav already reports it as not-yet-available rather than implying completion. Verified live in the Explore panel on both desktop and the 360px drawer.

## 4. Reset / error / loading — unchanged, spot-checked

`Clear Chat` (visible chat, current-session context, pending clarification, restores `Try asking`), the loading placeholder, and the `error`/`insufficient_evidence`/`off_topic` compact-notice states are all pre-existing, already covered by `tests/responseStates.test.tsx` and `tests/clearChat.test.tsx` (all green), and were not modified this pass. Spot-checked live: toggling dark mode mid-draft preserves the unsent composer text; sending the mock `transport failure` fixture still renders the controlled "AskANU could not be reached" error turn, not a blank one.

## 5. Automated tests and build

```
frontend npm run test    → 18 files, 248 passed
frontend npm run build   → tsc --noEmit OK · vite build ✓ 111 modules
         dist/assets/index-*.js   275.54 kB │ gzip 87.57 kB
```

Production bundle scan (`grep -c` on `dist/assets/index-*.js`): `FixturePicker` 0 · `Dev: mock response` 0 · `mockTransport` 0 · `Placeholder` 0 · `example.invalid` 0 — the dev-only fixture picker, mock transport and every fixture (including the new clarification "both" scenario) stay out of the shipped bundle, same as every earlier day.

## 6. Repeatable Friday demo journeys

Each journey starts from a fresh `Clear Chat` / empty state and uses only the shipped, real interaction model (no invented backend data).

1. **Scholarships — guided launcher → clarification → "both"**
   Explore → Scholarships → click "Find scholarships for me" (prefills, does not send) → send → if the service returns an ambiguous-entity clarification, check two options and click "Use selection" (or answer "both" in words) → resolved answer shows its Scholarships source card.
2. **Jobs — panel → chat**
   Home → Current Jobs panel (desktop rail / mobile drawer) shows up to 5 real current roles, nearest closing date first → `View all` → Jobs resource page → guided card into chat for a jobs question.
3. **Accommodation — single-select clarification**
   Explore → Accommodation → a residence-question card → if the service asks which residence, click the named option button (fills composer, does not send) → edit if needed → send → answer plus its Accommodation source card.
4. **Support — mobile, sensitive-topic path**
   Open the app at 360–430px → drawer → Support Services → a support card → answer renders with its category-appropriate source, no invented hotline/hours claim.
5. **Cross-domain session survival + reset**
   Ask a Courses question on Home → visit Scholarships → visit Accommodation → return Home → the original answer and its Sources region are still present → `Clear Chat` → empty state with `Try asking` restored.
6. **Events — truthful "not yet"**
   Open Explore (desktop or the mobile drawer) → point out Events is visibly disabled with "Remaining resource pages coming soon," not hidden and not implied-working — the one domain that should look unfinished, on purpose, until Saturday.

Fallback if the RAG/App backend is unreachable during the demo: the dev mock transport (`VITE_USE_MOCK_TRANSPORT=1`, `.env.local` at the repo root — gitignored, never committed) reproduces every one of the above states, including both clarification shapes, from the `Dev: mock response` picker, without any code change.

## 7. Remaining gaps — reported, not worked around

1. **Events/Rubric is not built.** This is the known, accepted Saturday item, not a Day 13 shortfall — flagged here only so nobody mistakes its absence for a regression.
2. **No committed screenshot PNGs.** As `DAY_12` recorded (and Qasim's review there accepted), this evidence file uses real DOM/computed-style measurements and live in-browser verification instead. Unlike Day 12, this session has no tool path to persist the Browser pane's rendered frame to a file on disk, so a screenshot matrix could not be produced as image files this pass; every state listed in §6 was visually confirmed live. If a committed image matrix is required for the stakeholder deck, it needs to be captured manually (OS screenshot) rather than through this session's tooling.
3. **The remote-browser keyboard-Space quirk in §1** is worth a one-line callout to Qasim: it is a CDP/automation-path limitation observed in this session, confirmed not to reproduce in a real jsdom keyboard simulation, and is not believed to affect real users in real Chrome/Safari/Firefox (native checkboxes handle Space without any JS). Recorded here rather than silently dropped.

No hard-coded domain facts, invented Events data, or backend behaviour were added anywhere in production code this pass.
