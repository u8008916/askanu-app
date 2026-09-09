# Day 5 evidence — Courses resource page + final empty-state component

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day5-course-breadth+hybrid-retrieval` (from `ca9e7ff`)
**Date:** Wednesday 09 September 2026 — V3 Day 5
**Phase:** COURSE BREADTH + HYBRID RETRIEVAL
**Deliverable:** PR — Courses page + final empty-state component

Every number below is real command output, a real DOM measurement from the running
app, or a real HTTP response. Nothing here is an assertion about what should happen.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.4.

---

## 0. Summary

Day 4 left the app as a single page with no router: all six domains in `DomainNav`
were inert `aria-disabled` buttons under the note *"Resource pages coming soon."*
Day 5 adds the first real resource page, which required a routing primitive.

Three things were found by measuring rather than by looking, and all three are fixed:

1. Lifting the composer draft to `App` made **every keystroke re-render the whole
   shell**. Typing went from inside the 350 ms mock latency to 355 ms, breaking the
   in-flight guard test. Memoising the rail and drawer brought it to 264 ms (§5.1).
2. The mobile app bar's wordmark is an `<h1>`, so `/courses` rendered **two `h1`
   elements on mobile**. The desktop-only test stub could not see this (§5.2).
3. Two Day 4 safe-rendering assertions assumed source cards were the app's only
   anchors. Internal route links now exist, so both were narrowed without weakening
   the provenance invariant (§5.3).

**No backend was required today.** The `/ask` path is unchanged; the local RAG
service is not running, which is why the live chat screenshots show the Day 3
transport-failure state. That is the designed behaviour, not a defect.

---

## 1. Tasks

### 1.1 Courses information page with official links — DONE

New `src/pages/CoursesPage.tsx` (+ `.module.css`), reachable at `/courses`.

**Every URL was opened and verified before it was written into the source.** V3
restricts the Courses domain to `programsandcourses.anu.edu.au`
(`ALL_TEAM_DAY_BY_DAY_TASKS.md:98`). All four candidates came from the site's own
navigation — none was guessed:

| URL | HTTP | Final URL | `<title>` |
|---|---|---|---|
| `https://programsandcourses.anu.edu.au/catalogue` | 200 | no redirect | `Search - ANU` |
| `https://programsandcourses.anu.edu.au/degree-builder` | 200 | no redirect | `Degree Builder - Programs and Courses - ANU` |
| `https://programsandcourses.anu.edu.au/` | 200 | no redirect | `Programs and Courses - ANU` |
| `https://programsandcourses.anu.edu.au/Faq` | 200 | no redirect | `Frequently Asked Questions - ANU` |

Discovered by reading the anchors on the live home page:

```
{h: "https://programsandcourses.anu.edu.au/degree-builder", t: "Degree Builder …"}
{h: "https://programsandcourses.anu.edu.au/catalogue",      t: "Search Programs & Courses …"}
{h: "https://programsandcourses.anu.edu.au/Faq",            t: "Frequently Asked Questions"}
```

Rendered link attributes, measured in the browser at `/courses`:

```
https://programsandcourses.anu.edu.au/catalogue       target=_blank rel="noopener noreferrer" h=82px
https://programsandcourses.anu.edu.au/degree-builder  target=_blank rel="noopener noreferrer" h=82px
https://programsandcourses.anu.edu.au/                target=_blank rel="noopener noreferrer" h=63px
https://programsandcourses.anu.edu.au/Faq             target=_blank rel="noopener noreferrer" h=63px
```

`API_CONTRACT.md` defines **no courses endpoint**, so the page states the fields a
course record will carry rather than displaying any value, under the note
*"Placeholder only — awaiting the courses endpoint."* No course code, title, session
or requirement is invented. The one course code on the page, `COMP1110`, appears only
inside the editable question the CTA hands to the composer.

Quick Links remain non-navigating placeholders — their URLs are still unresolved and
are out of Day 5 scope.

### 1.2 Call to action back to the single chat — DONE

`Ask a course question` sets the composer draft, focuses it, and navigates to `/`.
It never sends. Measured immediately after the real click:

```
path    : /
draft   : "Tell me about COMP1110."
focused : true
caret   : 23        (end of the string, so it can be edited immediately)
```

`coursesPage.test.tsx` additionally spies on `window.fetch` and asserts zero calls,
no `Conversation` list, and that the `Try asking` empty state is intact.

### 1.3 Empty-state suggestion cards: keyboard and touch — DONE

The cards were already real `<button>` elements. What was missing was a focus and a
pressed treatment — they inherited only the global outline and had no `:active` at
all. Added `:focus-visible`, `:active` and `-webkit-tap-highlight-color: transparent`,
confirmed live in the cascade:

```
._suggestion_1l72j_27:focus-visible => background: var(--gold-tint); border-color: var(--gold-soft);
._suggestion_1l72j_27:active        => background: var(--gold-soft); border-color: var(--gold-deep);
._suggestion_1l72j_27               => -webkit-tap-highlight-color: transparent
:focus-visible                      => outline: 2px solid var(--focus-ring); outline-offset: 2px;
```

Measured card geometry at 1280px — the V3 minimum is 44px:

| Card | Tag | `type` | Height | Width |
|---|---|---|---|---|
| What scholarships are available… | BUTTON | button | 112px | 245px |
| What are the prerequisites for COMP1110? | BUTTON | button | 112px | 245px |
| I need help with accommodation | BUTTON | button | 112px | 245px |
| What events are happening this week? | BUTTON | button | 69px | 245px |

Tab order, measured against the document's focusable list:

```
card tab indices : [2, 3, 4, 5]   consecutive: true
neighbour before : "Clear Chat"
neighbour after  : TEXTAREA
total focusable  : 17
```

A real `Tab Tab Tab` press produced a visible gold focus ring on the focused card
(screenshot captured). Enter and Space activation are covered in
`emptyState.test.tsx`.

One suggestion was retargeted from *"When are classes for COMP1110 next semester?"*
(a timetable question) to *"What are the prerequisites for COMP1110?"*, which is an
actual Programs & Courses question, so the empty state matches the new page's domain.

### 1.4 Theme tokens stay central — DONE

Every colour, space, radius and size on the new page and the new link component
resolves to an existing token. All 27 referenced tokens were checked against
`tokens.css`:

```
OK --brand-btn-bg  --brand-btn-bg-hover --brand-btn-fg --gold-deep --gold-soft
OK --gold-tint --ink --ink-2 --ink-3 --leading-body --leading-tight --line
OK --radius-lg --radius-pill --radius-xl --shadow-panel --space-2 --space-3
OK --space-4 --space-5 --surface --text-2xl --text-lg --text-sm --text-xs
OK --touch-target-min --transition-fast
```

**No token was added**, so the *"KEEP THE TWO DARK BLOCKS IN SYNC"* hazard in
`tokens.css` was not touched. Grep for hardcoded colour in every new or changed
stylesheet:

```
$ grep -nE '#[0-9a-fA-F]{3,8}|rgb\(|hsl\(' CoursesPage.module.css ExternalLink.module.css \
    EmptyState.module.css DomainNav.module.css Brand.module.css
none
```

Dark mode verified by emulation at 1280px: the page, the gold CTA panel, the link
cards and the rail all resolve correctly with no untokenised light background.

---

## 2. Routing

`react-router-dom@7.18.3` added — the first runtime dependency since React itself.
The router lives **inside `App`** rather than in `main.tsx`, so the application and
its tests share one history and the 25 existing `render(<App />)` call sites across
five test files needed no rewrite.

Routing swaps **only the main content column**. The shell, the desktop rail and the
mobile drawer are constant, which is what keeps the confirmed V3 layout and the
current-session chat state intact across navigation.

| Route | Renders |
|---|---|
| `/` | `ChatPanel` |
| `/courses` | `CoursesPage` |
| `*` | redirect to `/` |

`Home` and `Courses` are now real `NavLink`s; the other five domains stay
`aria-disabled` no-op buttons until their scheduled days. Measured at `/courses`:

```
nav links    : [{Home, /, cur:null}, {Courses, /courses, cur:"page"}]
nav buttons  : [Scholarships, Accommodation, Jobs, Events, Support Services]
```

Chat state across a round trip is proven twice: by `navigation.test.tsx`, and
incidentally in the browser, where a question asked before navigating to `/courses`
was still on screen after returning.

The mobile drawer closes itself when a destination is chosen:

```
open  : {drawer: true,  role: "dialog", expanded: "true",  focus: "Close menu"}
after : {drawer: false, expanded: "false", path: "/courses"}
```

---

## 3. Responsive

No horizontal scroll on either route at any tested width. `scrollWidth` measured
against `innerWidth`:

| Width | `/` | `/courses` |
|---|---|---|
| 360px | 360 / 360 — no overflow | 360 / 360 — no overflow |
| 390px | 390 / 390 — no overflow | 390 / 390 — no overflow |
| 430px | 430 / 430 — no overflow | 430 / 430 — no overflow |
| 1280px | — | 1280 / 1280 — no overflow |

At 360px the widest element in the document is `HTML` itself at exactly 360px.

The desktop rail is present at `/courses`; the mobile Courses page stacks under the
app bar with no chat input.

---

## 4. Resource hub, not another chat

The Day 5 verify gate, measured at `/courses`:

```
textareas on page          : 0
Send control               : absent
role="textbox"             : absent
aria-label="Conversation"  : absent
h1                         : ["Courses"]   (exactly one)
```

---

## 5. Defects found and fixed

### 5.1 Lifting the draft made every keystroke re-render the whole shell

The CTA needs to place a question into the composer from another route, so the draft
moved from `ChatPanel` local state up to `App`. That put the whole shell — rail,
`DomainNav`, resource cards, drawer — into the re-render path of every keystroke.

It surfaced as a failing Day 3 test, `refuses to send a second question while one is
in flight`: typing the second question now outran the 350 ms mock latency, so the
answer landed mid-type and the Send button legitimately re-enabled.

Measured before assuming, with a temporary instrumented test:

```
before : TYPING_MS=355  MOCK_LATENCY=350  ANSWER_ALREADY_LANDED=true
after  : TYPING_MS=264  MOCK_LATENCY=350  ANSWER_ALREADY_LANDED=false
```

Fixed by memoising `ResourceRail` and `MobileDrawer`, which are pure and prop-stable.
A 26% reduction in per-keystroke cost. The test was **not** relaxed.

### 5.2 Two `h1` elements on `/courses` on mobile

`Brand` renders the wordmark as `<h1>`. On desktop that is correct — it is the chat
panel's heading, and `ChatPanel` is not mounted at `/courses`. On mobile the app bar
is persistent above every route, so the new page's own `h1` gave `/courses` two.

The desktop-only `matchMedia` stub in `tests/setup.ts` cannot see this; it was found
by reading headings in the real browser at 390px:

```
before  /courses @390px : ["H1: AskANU", "H1: Courses"]
```

Fixed by treating the app-bar wordmark as site chrome: `Brand` gained an `asHeading`
prop, `TopBar` passes `false`, and the mobile chat home's greeting was promoted from
`h2` to `h1`. The mobile active-conversation branch has no visible heading, so it
carries a `visually-hidden` one. Measured after, in the browser:

| Viewport | Route | count | `h1` |
|---|---|---|---|
| 1280px | `/` | 1 | `AskANU` |
| 1280px | `/courses` | 1 | `Courses` |
| 390px | `/` empty | 1 | `How can I help you today?` |
| 390px | `/` active | 1 | `AskANU chat` (visually hidden) |
| 390px | `/courses` | 1 | `Courses` |

A desktop regression test was added to `navigation.test.tsx`.

### 5.3 Day 4 anchor assertions were scoped to "all anchors"

`safeRendering.test.tsx` asserted that *every* anchor in the app is `https?://` and
sits inside the `Sources` region. Both were written when source cards were the only
links in the app; internal route links are relative by design.

Narrowed to preserve the actual invariant rather than to pass: an anchor is either
evidence provenance (inside `Sources`) or a static in-app route (inside `Explore`,
and its href must start with `/`). Nothing in an answer can still produce an anchor.
The hostile-fixture scenario driving both tests is unchanged.

---

## 6. Verification commands

```
$ npm run build          # tsc --noEmit && vite build
✓ 98 modules transformed.
dist/index.html                   0.95 kB │ gzip:  0.56 kB
dist/assets/index-BG8JIiiS.css   22.27 kB │ gzip:  4.29 kB
dist/assets/index-By5t8CrJ.js   262.71 kB │ gzip: 84.51 kB
✓ built in 1.27s

$ npx vitest run
Test Files  11 passed (11)
     Tests  113 passed (113)
```

95 tests before today, 113 after — 18 added across three files:

| File | Added |
|---|---|
| `tests/coursesPage.test.tsx` (new) | 6 — hub not a chat, one `h1`, official links only, no invented data, CTA prefills without sending, prefill stays editable |
| `tests/navigation.test.tsx` (new) | 7 — routing, `aria-current`, five domains stay disabled, chat survives a round trip, Clear Chat after navigating, unknown route, direct `/courses` URL, one `h1` per route |
| `tests/emptyState.test.tsx` (extended) | 5 — every card is a real button, click sends, Tab reaches each card, Enter activates, Space activates |

Before today `emptyState.test.tsx` never clicked a suggestion; it only checked that
the heading appeared and disappeared.

---

## 7. Security

- No `dangerouslySetInnerHTML` anywhere in `src` — the only three matches are
  comments explaining why it is not used.
- Every outbound link carries `rel="noopener noreferrer"` and is guarded by the
  existing `isSafeHttpUrl`; a URL that fails renders as text, never repaired.
  `SourceCards` was deliberately not refactored — its Day 4 tests pin its markup.
- No secret in the production bundle. The single `password` match is React's own
  input-type table (`{…number:!0,password:!0,range:!0…}`), not a credential.
- `npm audit`: 2 moderate, both pre-existing in `@vitest/mocker`/`vitest`
  (a devDependency, not shipped). `react-router-dom@7.18.3` contributes none.

---

## 8. Observations, not defects

- **Clear Chat does not clear an unsent composer draft.** Unchanged from Day 1–4.
  `CONVERSATION_CONTRACT.md` scopes Clear Chat to the visible chat, current-session
  context and pending clarification; an unsent draft is the student's own typing and
  none of those. Flagged rather than changed.
- **The live chat shows the transport-failure state** in today's screenshots because
  no local RAG service is running. `/ask` was not touched today.
- **Mobile layout remains browser-verified, not unit-tested.** `tests/setup.ts`
  reports the desktop breakpoint to every component test. §5.2 is a concrete example
  of what that stub hides; worth revisiting on Day 18's accessibility pass.

---

## 9. V3 compliance

| Locked decision | Status |
|---|---|
| Chat primary/left, resources right | Unchanged — routing swaps the main column only |
| `Clear Chat`, not `New Chat` | Unchanged; still works after navigating |
| No profile/login block | Nothing added |
| `Try asking` in empty state only, gone after first question | Unchanged and still tested |
| Resource pages are hubs, not separate bots | Enforced and tested — zero inputs on `/courses` |
| Mobile is the same responsive site with drawer nav | Drawer now navigates and closes |
| Courses source = Programs and Courses | All four URLs on that host, each verified 200 |
| Theme tokens central | No new token; no hardcoded colour |

No API contract, schema, scope or architecture change. `DECISION_LOG.md` is untouched:
adding a frontend routing library is an implementation choice, not a contract change.

---

## 10. Acceptance criteria — verification pass

Re-verified against the committed build (`2afa547`). Every row is a real command
result or a browser measurement, not a restatement of intent.

### Tasks

| Task | Evidence |
|---|---|
| Courses resource page linked from navigation | `/courses` via `NavLink`; opened from the desktop rail and the mobile drawer |
| Information hub, not another chatbot | `textareas: 0`, no Send control, no `role="textbox"`, no `Conversation` list |
| Official Programs & Courses search/navigation links | 4 links, each verified HTTP 200 before hardcoding (§1.1) |
| Only source-backed/current information | Copy audited line by line (§10.1); no course data invented |
| CTA to ask a course question in the main chat | Prefills + focuses, sends nothing (§1.2) |
| Single shared chat is the only chat | One `Composer` in the app; `/courses` has none |
| Refined empty-state suggestion cards | `:focus-visible`, `:active`, tap-highlight added |
| Cards work with mouse / keyboard / touch | All three exercised for real (§10.2) |
| Visible focus behaviour | Gold ring + tint, confirmed in cascade and screenshot |
| Theme/design tokens central | 27/27 tokens resolve; no token added; no hardcoded colour |
| Responsive layout preserved | No overflow at 360/390/430/1280 on both routes |
| Quick Links / Events / Jobs preserved | Present on both routes (§10.3) |

### Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Courses resource page exists | PASS — `src/pages/CoursesPage.tsx` at `/courses` |
| 2 | Navigation opens the Courses page | PASS — rail click and drawer click both route; drawer closes |
| 3 | Not a separate chatbot | PASS — 0 textareas, 0 Send, 0 conversation list |
| 4 | Official Programs & Courses links used | PASS — 4 links, all `programsandcourses.anu.edu.au`, all 200 |
| 5 | External links safe/canonical | PASS — `target="_blank" rel="noopener noreferrer"`, `isSafeHttpUrl` guarded |
| 6 | CTA returns to the single chat | PASS — lands on `/` with focused, unsent draft |
| 7 | Cards work with mouse | PASS — click sends the card's text |
| 8 | Cards work keyboard-only | PASS — Tab reaches all 4 consecutively; Enter and Space activate |
| 9 | Cards work on touch/mobile | PASS — real touch sequence under Android emulation (§10.2) |
| 10 | Focus state visible | PASS — `:focus-visible` tint + 2px `--focus-ring` outline |
| 11 | Suggestions disappear after first question | PASS — `tryAskingGone: true` after a touch tap |
| 12 | Clear Chat restores empty state | PASS — drawer Clear Chat → 0 turns, 4 cards back |
| 13 | No horizontal scroll at 360px | PASS — `scrollWidth 360 / innerWidth 360` both routes |
| 14 | No horizontal scroll at 390px | PASS — `390 / 390` both routes |
| 15 | No horizontal scroll at 430px | PASS — `430 / 430` both routes |
| 16 | Real API integration functional | PASS — live `POST /api/v1/ask` captured (§10.4) |
| 17 | Existing chat/source-card tests green | PASS — all Day 1–4 suites pass; 2 assertions narrowed, not weakened (§5.3) |
| 18 | `npm run test` passes | PASS — 11 files, 113 tests |
| 19 | `npm run build` passes | PASS — `tsc --noEmit` + `vite build`, built in 1.11s |
| 20 | `git diff --check` passes | PASS — exit 0, working tree and `HEAD~1..HEAD` |

### 10.1 Copy audit — no unsourced claim

| Statement | Basis |
|---|---|
| "Programs and Courses is the official ANU catalogue." | Site title `Programs and Courses - ANU` |
| "Search programs, majors, minors and courses in the current academic year and beyond." | The linked page's own description of itself |
| "Browse degrees by area of interest…" | Paraphrase of the Degree Builder blurb |
| "ANU answers to common questions about the catalogue." | `/Faq` → `Frequently Asked Questions - ANU` |
| "Course records are being added to AskANU…" | Roadmap statement, explicitly labelled placeholder |
| "AskANU does not show course information it cannot source…" | The provenance invariant in `API_CONTRACT.md` |

No course code, title, session, unit value, prerequisite or date is displayed as
current data. The only course code on the page is inside the editable CTA question.

### 10.2 Touch verified for real, not inferred

Under `resize_window` mobile emulation the tab is a real touch device:

```
userAgent      : Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36
maxTouchPoints : 5
ontouchstart   : true
innerWidth     : 375
```

A full `touchstart` → `touchend` → synthesised `click` sequence on the third card:

```
tapped card   : "I need help with accommodation"
card size     : 69 x 309 px   (>= 44px: true)
question sent : true
Try asking    : gone
turns         : 2
```

### 10.3 Resource areas preserved

| Viewport | Route | Quick Links | Upcoming Events | Current Jobs |
|---|---|---|---|---|
| 1280px | `/` | yes (rail) | yes (rail) | yes (rail) |
| 1280px | `/courses` | yes (rail) | yes (rail) | yes (rail) |
| 375px | `/` empty | yes (home + drawer) | yes | yes |
| 375px | `/courses` | yes (drawer) | yes (drawer) | yes (drawer) |

Below the breakpoint the rail is not rendered at all — by existing design, its
content is reached through the drawer, so nothing is duplicated in the
accessibility tree. `QuickLinksCard`, `FeedPanel` and `ResourceCards` are
byte-identical to Day 4.

### 10.4 Real API path still fires

Network capture from the running app after sending a question:

```
POST http://localhost:5173/api/v1/ask → 500 Internal Server Error
```

The 500 is the dev proxy with no RAG service behind it. What it proves is that the
production transport — not the mock — still issues the contract POST, and that the
UI degrades to the controlled `error` state rather than failing open. `askApi.ts`,
`askResponse.ts`, `askTransport.ts`, `useChatSession.ts` and `types/api.ts` are all
byte-identical to Day 4:

```
$ git diff --quiet HEAD~1 HEAD -- <each file>
UNCHANGED  src/chat/askApi.ts        UNCHANGED  src/chat/askResponse.ts
UNCHANGED  src/chat/askTransport.ts  UNCHANGED  src/chat/useChatSession.ts
UNCHANGED  src/types/api.ts          UNCHANGED  src/chat/SourceCards.tsx
```

### Out of scope — confirmed not done

No separate Courses bot. No Scholarships or Jobs page. No deployment or Firebase
config. No App server change — `server/` is still empty scaffolding.
