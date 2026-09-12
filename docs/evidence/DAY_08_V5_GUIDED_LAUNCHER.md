# V5 Sat 12 Sep evidence — Reusable guided-domain launcher + Courses redesign

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/v5-sat12-guided-domain-launcher` (from `085fc8a`)
**Date:** Saturday 12 September 2026 — V5 Day 1 (calendar Day 8)
**Phase:** V5 foundations — guided-intent UX
**Deliverable:** PR — reusable `DomainLauncher` + Courses converted to four recommended-question cards

Every number below is real command output or a real DOM measurement from the
running app. Nothing here is an assertion about what should happen.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.4.

---

## 0. Summary

V5 changes one V3 UI decision: domain pages stop being dense information hubs
and become compact **guided-intent launchers** — recommended-question cards on
top, compact official links at the bottom, card click hands an editable draft
to the one chat. This is recorded in `docs/DECISION_LOG.md` (2026-09-12).

The Day 5 Courses page already had the exact hand-off mechanism (prefill +
focus + navigate, never send). Today reshaped the page around a data-driven
component so the next five domains are config, not new pages.

| | |
|---|---|
| New | `src/domains/domainConfig.ts`, `DomainLauncher.tsx`, `RecommendedQuestionCard.tsx`, `DomainLauncher.module.css`; `tests/domainLauncher.test.tsx` |
| Changed | `pages/CoursesPage.tsx` (146 → 11 lines), `App.tsx` (callback renamed `askAboutCourses` → `askInChat`), `ui/ExternalLink` (`variant="compact"`), `ui/Icon.tsx` (+3 icons), `tests/coursesPage.test.tsx` |
| Deleted | `pages/CoursesPage.module.css` (154 lines) |
| Untouched | everything under `src/chat/`, `layout/DomainNav.tsx`, `server/`, `firebase.json`, `API_CONTRACT.md`, `CONVERSATION_CONTRACT.md` |
| Runtime dependencies added | **0** |

**No backend was required.** No request is made until the student presses Send.

---

## 1. The reusable contract — what other domains fill in

`src/domains/domainConfig.ts`:

```ts
interface DomainLauncherConfig {
  id: string;                 // route/aria id prefix, e.g. 'courses'
  title: string;              // h1
  intro: string;              // one line under the h1
  Icon: DomainIcon;           // inline SVG from ui/Icon
  questions: RecommendedQuestion[];   // 3–5 cards
  resourcesTitle: string;     // region name of the official-links section
  resources: OfficialResource[];      // verified https:// official URLs
  resourcesNote?: string;     // e.g. which host the links open
}
interface RecommendedQuestion { id; title; description; prompt; Icon }
interface OfficialResource   { label; href }
```

`prompt` is what lands in the composer; today it equals `title`. A future
domain is: one `COURSES_DOMAIN`-shaped constant + one `<Route>`.
`DomainLauncher` is proven config-driven by `domainLauncher.test.tsx`, which
renders a throwaway 3-card domain that shares nothing with Courses.

---

## 2. Before / after — the jumbo is gone

Measured on the launcher root (`main > div > :first-child`) at 1280×720, the
agreed desktop acceptance viewport:

| | `clientHeight` | `scrollHeight` | Overflow | Sections |
|---|---|---|---|---|
| Before (Day 5 page, `085fc8a`) | 672 | **913** | **241px — scrolls** | Ask AskANU about a course · Official ANU search and navigation · Course details in AskANU |
| After | 672 | **672** | **0 — no scroll** | Recommended questions · Official ANU search and navigation |

Removed: the gold CTA panel (one button, three paragraphs) and the
"Course details in AskANU" placeholder field list. Kept: the same four
verified `programsandcourses.anu.edu.au` links, now as one-line chips.

Screenshots captured in the pane at 1280×720 (before shows the scrollbar and
the third section cut off; after fits with the resources at the column foot).

---

## 3. Desktop no-scroll matrix

`chat` column = `main > div`; launcher root = its first child. `noScroll` is
`scrollHeight <= clientHeight` on both.

| Viewport | chat client / scroll | root client / scroll | Page `scrollHeight` | No scroll | Horizontal overflow |
|---|---|---|---|---|---|
| **1280×720** (gate) | 672 / 672 | 672 / 672 | 720 | **yes** | none (1280/1280) |
| 1366×768 | 720 / 720 | — | — | yes | none |
| 1440×900 | 852 / 852 | — | — | yes | none |
| 1024×640 (below target, informational) | 592 / 592 | — | — | yes | none |

At 1280×720 the four cards measure 406×121px each in a 2×2 grid; the four
official links are 44px tall chips.

---

## 4. Card → chat hand-off, measured

Real pointer click on **"Can I still qualify for honours?"** at 1280×720:

```
path      : /
draft     : "Can I still qualify for honours?"
focused   : true          (document.activeElement === textarea)
caret     : 32 / 32       (end of string — editable immediately)
Try asking: present       (empty state intact)
turns     : 0
network   : no /api/v1/ask request
console   : no errors
```

Real tap on **"Can I take this course in my study plan?"** at 430×932 under
touch emulation (`maxTouchPoints: 5`):

```
path      : /
draft     : "Can I take this course in my study plan?"
focused   : true
Try asking: present
h1        : ["How can I help you today?"]   (mobile chat home, one h1)
network   : no /api/v1/ask request
```

The conversation is **kept** when a card is chosen mid-session — pinned by
`coursesPage.test.tsx › keeps the current conversation when a card is chosen
mid-session`. Only `Clear Chat` clears the session (V3).

---

## 5. Keyboard and focus

Measured at `/courses`, 1280×720, against the document's visible focusable list:

```
card tab indices : [0, 1, 2, 3]   consecutive: true
neighbour after  : "Search Programs & Courses"   (first official link)
```

After a real `Tab Tab`, the focused element and its computed style:

```
focused : BUTTON "What are the prerequisites for this course?"
outline : solid 2px rgb(190, 131, 14)     (--focus-ring)
bg      : rgb(245, 237, 222)              (--gold-tint)
border  : rgb(232, 206, 151)              (--gold-soft)
```

Screenshot captured showing the gold ring + tinted card.

**Enter/Space activation** is pinned by `userEvent` in both
`domainLauncher.test.tsx` and `coursesPage.test.tsx`. The Browser pane's
synthetic key press arrives as bare `keydown`/`keyup` with no `keypress`, so
it cannot natively activate a `<button>` — instrumented and confirmed
(`["keydown:Enter","keyup:Enter"]`, no `click`). That is a pane limitation;
the card is a plain `type="button"` with `onClick` and no key handler, so
native activation applies in a real browser. Same situation as Day 5.

---

## 6. Mobile

No horizontal overflow on `/courses` at any tested width; the widest element
is `HTML` itself.

| Width | `scrollWidth` / `innerWidth` | Cards | h1 |
|---|---|---|---|
| 360 | 360 / 360 | 4 stacked, 328×121–143px | `Courses` (one) |
| 390 | 390 / 390 | stacked | one |
| 430 | 430 / 430 | stacked | one |

Vertical scroll is allowed on mobile by design. Screenshot captured at 390×844.

---

## 7. Dark mode

`prefers-color-scheme: dark` emulated at 1280×720. Every surface resolves to a
token; no untokenised light patch:

```
body/main : rgb(20, 16, 9)     card : rgb(31, 26, 18)
card icon : rgb(58, 44, 18)    chip : rgb(31, 26, 18)
h1        : rgb(244, 239, 228)
```

No token was added; `tokens.css` and its two dark blocks are untouched.
Grep for hardcoded colour in the new stylesheet:

```
$ grep -nE '#[0-9a-fA-F]{3,8}|rgb\(|hsl\(' src/domains/DomainLauncher.module.css
none
```

---

## 8. Home did not regress

`/` at 1280×720 after all changes:

```
h1          : ["AskANU"]
Try asking  : present, 4 suggestion buttons
textarea    : present        Clear Chat : present
rail        : Explore · Quick Links · Upcoming Events · Current Jobs
```

`src/chat/*` is byte-identical to `085fc8a`. Empty-state suggestion cards
still **send** on click (their Day 5 behaviour, a different affordance from
launcher cards, and still pinned by `emptyState.test.tsx`).

---

## 9. Automated tests and build

```
$ cd frontend && npx vitest run
 Test Files  12 passed (12)
      Tests  122 passed (122)

$ npm run build          # tsc --noEmit && vite build
dist/assets/index-FaOJBnyq.css   22.81 kB │ gzip:  4.39 kB
dist/assets/index-D3_vv61t.js   263.65 kB │ gzip: 84.73 kB
✓ built in 1.28s

$ git diff --check       # exit 0
```

113 before → 122 after (+9 net):

| File | Change |
|---|---|
| `tests/domainLauncher.test.tsx` (new) | +5 — renders any config; passes `prompt` not `title`; Tab order + Enter + Space; unsafe href renders as text; no chat input |
| `tests/coursesPage.test.tsx` (rewritten) | 6 → 10 — launcher not a chat; one h1; four real buttons in config order; official links safe/on-host/after the cards; no invented course data (no `COMP\d{4}`, no unit/session text); card prefills without sending; every card prefills its own prompt; Enter and Space; draft editable and sendable; conversation kept mid-session |

One Day 5 assertion was **removed, not weakened**: `shows no invented course
data` used to look for the placeholder block's "Placeholder only — awaiting
the courses endpoint" text. That block is the jumbo V5 asks to remove; the
test now asserts the stronger property directly (no course code or unit /
session value on the page).

`navigation.test.tsx` passes unchanged: still 2 nav links, 5 `aria-disabled`
domains, one h1 per route.

Bundle needle grep of `dist/` (Day 7 list): `Bearer` 0 · `metadata.google` 0 ·
`RAG_AUTH` 0 · `run.app` 0 · `GEMINI` 0 · `RAG_SERVICE_URL` 0 · positive
control `/api/v1/ask` 1.

---

## 10. Security

- No `dangerouslySetInnerHTML`; card titles/descriptions render as text.
- Every official link goes through `ExternalLink` → `isSafeHttpUrl`;
  `target="_blank" rel="noopener noreferrer"` measured on all four. A
  `javascript:` href in config renders as plain text — pinned by
  `domainLauncher.test.tsx`.
- No secret in the bundle (needle grep above). No new dependency.

---

## 11. Acceptance criteria (`MY_DAY_BY_DAY_TASKS.md:36-41`)

| # | Criterion | Result |
|---|---|---|
| 1 | Courses page fits supported desktop viewport without vertical content scroll | PASS — 672/672 at 1280×720; also 1366×768, 1440×900 (§3) |
| 2 | Four guided cards route to New Chat correctly | PASS — real click and real tap land on `/` with the prompt focused and unsent (§4); every card pinned in tests |
| 3 | Official ANU resource section remains accessible at bottom | PASS — region "Official ANU search and navigation", 4 links, after the cards in DOM order (test) and at the column foot (screenshot) |
| 4 | Keyboard focus/Enter/Space activation works | PASS — Tab order consecutive + visible ring measured (§5); Enter/Space pinned by `userEvent` |
| 5 | Home snapshot/smoke remains green | PASS — §8; `src/chat/*` unchanged |

### Evidence to hand off

- PR + screenshots at 1280×720 (before/after, focus ring, dark) and 390×844 — captured in the pane during this session.
- Route/state test output — §9.
- Before/after showing removal of jumbo content — §2.
- Card config fields other domains reuse — §1.

---

## 12. Decisions taken today (with Ben)

| Question | Decision |
|---|---|
| Card wording | Screenshot wording; `prompt` = card title |
| Card click vs. current conversation | Keep it — prefill only. "Clear then prefill" is not implemented; revisit on the Wed 16 session-UX day if wanted |
| Desktop no-scroll viewport | 1280×720 (V5 §15 TBC item, now proposed to Qasim) |
| Decision log | Row added; `AGENTS.md` / `V3_LOCKED_DECISIONS.md` wording left for Qasim's Sat gate |

## 13. Observations, not defects

- **`Clear Chat` still does not clear an unsent composer draft** (Day 5 §8
  carry-over, unchanged).
- **Resources sit at the column foot on desktop** (`margin-top: auto`), so at
  larger viewports there is empty space between the cards and the links.
  Deliberate — keeps "official resources at the bottom" true at every size.
- Five domains remain `aria-disabled` in the Explore nav — Sun–Thu work.
- `gcloud` still not installed here; irrelevant today (no deploy).
