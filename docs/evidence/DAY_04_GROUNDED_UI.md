# Day 4 evidence — grounded answer presentation + safe rendering

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day4-grounded-ui` (from `301b44f`)
**Date:** Tuesday 08 September 2026 — V3 Day 4
**Phase:** GROUNDED GEMINI + ABSTENTION
**Deliverable:** PR — grounded answer presentation + safe rendering tests

Every number below is real command output, a real DOM measurement from the running
app, or a real HTTP response. Nothing here is an assertion about what should happen.

---

## 0. Summary

Day 3 left the answer as a single `<p>` with `white-space: pre-wrap`
(`AssistantTurn.module.css`, comment: *"Rich formatting is Day 4"*). A synthesised
answer carries structure — paragraphs, lists, `**label**` lead-ins — so today adds a
formatter that turns that plain text into blocks, renders it as React text children,
and proves it cannot execute HTML.

One real defect was found by measuring rather than by looking: the answer that first
made the conversation taller than the pane introduced a scrollbar and **narrowed the
chat column by 15px**, re-wrapping the question already on screen. Fixed and measured
at 0px movement (§4).

**Carmen's Gemini path is not pushed yet.** `askanu-rag` `main` carries the Day 3
deterministic course path (`4af8dda`) and no Day 4 branch exists on that remote at the
time of writing, so no real *multi-paragraph* grounded answer exists to photograph.
The formatter is proven against the real deterministic response (§5) and against
grounded-shaped fixtures (§3). Nothing about it depends on Gemini's arrival.

---

## 1. Tasks

### 1.1 Grounded response with readable paragraphs/lists and source block — DONE

New `src/chat/answerBlocks.ts` (pure, no React) and `src/chat/AnswerBody.tsx`.

| Input in `answer` | Rendered |
|---|---|
| blank line | new block |
| `- x` / `* x` / `• x` on consecutive lines | one `<ul>` |
| `1. x` / `2) x` on consecutive lines | one `<ol>` |
| `**text**` | `<strong>` |
| single newline inside a paragraph | kept as a line break (`pre-wrap`) |
| anything else | one paragraph |

The parser returns **data** — `{ kind, spans }` — never markup. It emits no tag, no
attribute and no href, and it does not escape, strip or rewrite the answer: it only
decides where blocks begin. An unstructured answer becomes exactly one paragraph,
which is Day 2/3 behaviour unchanged.

No markdown library was added. A markdown renderer produces HTML, which is the one
thing `SECURITY_BASELINE.md` forbids here. Dependencies are unchanged from Day 3.

Measured in the browser against the grounded fixture at 1280px:

```
paragraphs rendered      : 3
<ul>                     : 1   (3 items)
<ol> in the answer body  : 1   (2 items)      <- the second <ol> on screen is Sources
<strong>                 : ["Placeholder label:"]
markers printed as text  : false              ("**" and "- First placeholder" absent)
list-style-type          : disc
anchors outside Sources  : 0
img/script/b/i elements  : 0
```

### 1.2 Insufficient-evidence / off-topic clear but compact — DONE

`StatusNotice` keeps its heading, icon and `role="alert"`-on-`error`-only behaviour and
now renders its body through `AnswerBody` at a compact scale, so a service message that
arrives as two short paragraphs reads as two paragraphs. The notice is capped at `34rem`
so a no-answer state cannot occupy the width of a real answer.

Measured at 1280px, same viewport, one question each:

| Fixture | Turn height | Notice width | `role="alert"` |
|---|---|---|---|
| `insufficient_evidence` | 113.5px | 544px | 0 |
| `off_topic` | 113.5px | 544px | 0 |
| `error` | 91.8px | 544px | 1 |
| `ok` (grounded, for scale) | — | 736px answer column | 0 |

An abstention is correct behaviour, not a fault: it is neither announced as an alert
nor coloured with `--red`. Unchanged from Day 2, re-measured today.

### 1.3 User content and answer text rendered safely, not as executable HTML — DONE

The `hostile` fixture now also carries markdown-ish attack strings, so the *new* code
path is attacked, not just the old one:

```
'<img src=x onerror=alert(1)><script>alert(2)</script><b>bold</b>'
'- <img src=x onerror=alert(5)> hostile list item'
'- **<script>alert(6)</script>** hostile emphasis inside a list item'
'1. <b>hostile numbered item</b>'
```

Rendered in the browser:

```
turn text          : "<img src=x onerror=alert(1)><script>alert(2)</script><b>bold</b> |
                      <img src=x onerror=alert(5)> hostile list item |
                      <script>alert(6)</script>"
img/script/b/i elements created : 0
list structure created          : yes   (the markers are structure; the HTML is text)
console errors                  : none
```

In the test suite, the emphasis case is pinned at the DOM level:

```
strong.tagName    : STRONG
strong.innerHTML  : &lt;script&gt;alert(6)&lt;/script&gt;
```

The browser escaped it on the way in, which is what a React text child does and what a
markdown renderer would not have done.

**Provenance:** a new test asserts that *every* anchor on screen sits inside the
`Sources` region. Answer text cannot produce a link, so no model-authored URL can reach
a student even if the model writes one — `API_CONTRACT.md`'s provenance invariant held
in the renderer, not only in the client.

### 1.4 Empty-state suggestions still disappear after the first question — DONE

Measured live, 1280px, one question sent:

```
Try asking present when empty          : true
Try asking present after first question : false
```

Restoration by Clear Chat is covered by `tests/clearChat.test.tsx` ("clears the
conversation and restores Try asking"), which still passes, and was exercised by hand
during the real-service run in §5.

---

## 2. Acceptance criteria

### 2.1 No layout shift — PASS (after a real fix; see §4)

### 2.2 No unsafe HTML execution — PASS (§1.3, and the repo-wide scan in §3)

### 2.3 No horizontal scroll at 360 / 390 / 430px — PASS

Reloaded at each width with a **grounded answer and a source card on screen**
(`elementsPastEdge` counts every node whose right edge passes the viewport, which is
stricter than `scrollWidth` alone):

| Width | `scrollWidth > clientWidth` | Elements past edge | Answer `<ul>` / `<ol>` | Sources |
|---|---|---|---|---|
| 360px | `false` | **0** | 3 / 2 items | 1 |
| 390px | `false` | **0** | 3 / 2 items | 1 |
| 430px | `false` | **0** | 3 / 2 items | 1 |
| 1280px | `false` | **0** | 3 / 2 items | 1 |

At 360px the list marker sits inside the column (`padding-left: 24px`) and wrapped list
items keep their hanging indent.

The real deterministic response was also measured at 360px on its own:
`scrollWidth 360`, `elementsPastEdge 0`, `sources 1`.

### 2.4 Information hierarchy unchanged — PASS

Order is still answer → clarification → sources, asserted in
`tests/assistantTurn.test.tsx` by comparing text positions. No timestamp, no
`request_id`, no confidence label, no reordering of evidence, no change to the
read-only clarification list (interactive options remain Day 13).

### 2.5 No shared contract, architecture or source-policy change — PASS

```
$ git status --short docs/API_CONTRACT.md docs/CONVERSATION_CONTRACT.md \
                     docs/V3_LOCKED_DECISIONS.md docs/SECURITY_BASELINE.md \
                     docs/DECISION_LOG.md AGENTS.md server/
(no output — untouched)
```

`docs/DECISION_LOG.md` therefore needs no entry. `server/` is still empty; the App
service is Day 6.

### 2.6 No secret in the production bundle — PASS

```
$ npm run build && grep -o -F <string> dist/assets/*.js dist/index.html | wc -l

example.invalid        0
MOCK_SCENARIOS         0
setMockScenarioId      0
onerror=alert          0
req_mock               0
Dev: mock              0
grounded, paragraphs   0
```

The two `Placeholder` hits that remain in `dist` are the Events/Jobs panel copy
("Placeholder only — awaiting the jobs endpoint"), which is intentional shipped UI, not
fixture leakage. No fixture answer text, no fixture URL, no hostile string and no dev
control reached the bundle. `.env` is git-ignored and holds only local URLs; the browser
still talks to no DB and no model.

### 2.7 `git diff --check` — PASS

```
$ git diff --check ; echo exit=$?
exit=0
```

Only Git's usual CRLF advisories on Windows.

---

## 3. Automated tests

```
$ npm run test

 ✓ tests/answerBlocks.test.ts     (16 tests)   <- new
 ✓ tests/askApi.test.ts           (26 tests)
 ✓ tests/sourceCards.test.tsx     (12 tests)
 ✓ tests/assistantTurn.test.tsx   (19 tests)   <- +3
 ✓ tests/themeToggle.test.tsx      (3 tests)
 ✓ tests/clearChat.test.tsx        (2 tests)
 ✓ tests/emptyState.test.tsx       (2 tests)
 ✓ tests/safeRendering.test.tsx    (7 tests)   <- +3
 ✓ tests/responseStates.test.tsx   (8 tests)

 Test Files  9 passed (9)
      Tests  95 passed (95)
```

73 -> 95. One Day 2 assertion in `sourceCards.test.tsx` was updated, because the
hostile fixture's source title now also carries the gate's literal string; its intent
(title renders as text, no element created) is unchanged. Nothing else was rewritten.

| Added test | Asserts |
|---|---|
| `answerBlocks` (16) | paragraph/bullet/number grouping; `1.` and `2)`; `-`, `*`, `•`; mixed blocks; a dash inside a sentence is **not** a list; `**` emphasis; unbalanced `**` and `****` stay literal; empty input yields no blocks; every non-marker character survives; hostile text passes through byte-for-byte with no escaping and no tag construction |
| `assistantTurn` (+3) | grounded answer renders 3 paragraphs, a 3-item `<ul>`, a 2-item `<ol>` and one `<strong>`, with markers not printed; hierarchy answer → clarification → sources; a two-paragraph abstention stays compact and unannounced |
| `safeRendering` (+3) | hostile list/emphasis content creates no `img`/`b`/`script` while still creating list structure, and `<strong>` contains escaped text; **every anchor on screen is inside the Sources region**; the gate's literal `<script>alert('x')</script>` driven through all three untrusted channels at once — user input, answer content and a stored source title |

The repo-wide scan for `dangerouslySetInnerHTML` / `.innerHTML =` still returns `[]`. It
globs `src/**`, so it covers `answerBlocks.ts` and `AnswerBody.tsx` automatically —
that is why no new guard was needed for the new files.

---

## 4. The defect this day found: 15px of layout shift

Day 4's verification line is "renders without layout shift", so it was measured rather
than eyeballed: the same element's box, sampled while the request was pending and again
after the answer landed.

```
before fix
  user turn while pending : { top: 146.70, left: 49, width: 774, height: 71.39 }
  user turn once settled  : { top: 146.70, left: 49, width: 759, height: 71.39 }
                                                            ^^^ 15px narrower

cause
  scroller.offsetWidth - scroller.clientWidth = 15      (scrollbar)
  scrollbar-gutter                            = auto
  content taller than the pane                = true
```

The answer that first makes the conversation scroll adds a scrollbar, which narrows the
column and re-wraps the question already on screen. It is not specific to the new
formatter — any long answer did it — but grounded answers make it the normal case.

Fix: `scrollbar-gutter: stable` on the chat scroll container (`ChatPanel.module.css`),
which reserves the gutter from the start.

```
after fix
  user turn while pending : { top: 146.70, left: 49, width: 759, height: 71.39 }
  user turn once settled  : { top: 146.70, left: 49, width: 759, height: 71.39 }
  composer while pending  : { top: 544.81, left: 49, width: 774, height: 95.59 }
  composer once settled   : { top: 544.81, left: 49, width: 774, height: 95.59 }

  userTurnMoved : false
  composerMoved : false
```

Sampled with the mock transport's 350ms latency, which is what makes a pending frame
observable at all; the local RAG service answers in under 30ms.

---

## 5. Real service — still green

`askanu-rag` on `main` (`4af8dda`, the merged Day 3 deterministic course path), uvicorn
on `127.0.0.1:8000`, reached through the Vite dev proxy. Nothing in that repo was
modified.

```
$ curl http://127.0.0.1:8000/health
{"status":"ok"}

$ curl -X POST .../api/v1/ask -d '{"question":"What are the prerequisites for COMP1110?",...}'
{"answer":"The stored evidence for COMP1110 (2026) does not establish its prerequisites.",
 "items":[],
 "sources":[{"record_id":"courses:course:COMP1110_2026",
             "source_id":"courses_programs_and_courses",
             "title":"COMP1110 representative fixture",
             "url":"https://programsandcourses.anu.edu.au/2026/course/COMP1110",
             "domain":"courses"}],
 "request_id":"req_175b9b21a1e245859dd805ba2ee52ebc",
 "status":"insufficient_evidence","clarification":null}
```

In the browser, production transport (mock flag off, fixture picker absent from the DOM):

```
usingMock      : false
picker present : false
rendered       : "Not enough evidence to answer |
                  The stored evidence for COMP1110 (2026) does not establish its prerequisites. |
                  SOURCES | 1 | COMP1110 representative fixture | courses"
role=alert     : 0
source href    : https://programsandcourses.anu.edu.au/2026/course/COMP1110
target / rel   : _blank / noopener noreferrer
injected nodes : 0
```

The compact notice and the evidence block sit together exactly as intended: the
abstention is visibly narrower than the answer column, and the student still gets the
official ANU link. The Day 3 §9.5 behaviour (an abstention keeps its sources) is
unchanged and still covered by its regression test.

---

## 6. Files

**New:** `src/chat/answerBlocks.ts`, `src/chat/AnswerBody.tsx`,
`src/chat/AnswerBody.module.css`, `tests/answerBlocks.test.ts`, this evidence file.

**Changed:** `src/chat/AssistantTurn.tsx` + `.module.css`, `src/chat/StatusNotice.tsx` +
`.module.css`, `src/chat/ChatPanel.module.css` (the gutter fix), `src/mocks/askResponses.ts`,
`src/dev/mockTransport.ts`, `tests/assistantTurn.test.tsx`, `tests/safeRendering.test.tsx`.

**Untouched:** every contract doc, `AGENTS.md`, `server/`, `.env.example`,
`src/chat/askApi.ts`, `src/chat/askResponse.ts`, `src/chat/useChatSession.ts`, and
everything in `askanu-rag`.

```
9 files changed, 221 insertions(+), 15 deletions(-)   (excluding the new files)
```

Bundle: `217.44 kB -> 219.01 kB` JS, `17.67 kB -> 18.15 kB` CSS. The 1.6 kB is the
formatter and the component that renders it.

---

## 7. For Qasim's Day 4 gate

Values for the **Ben — App** row and the gates his `DAY4_GROUNDING_SECURITY_GATE.md`
lists (that file is on `qasim/day4-grounding-security-gate` and not merged, so it could
not be filled in place):

| Gate item | Result | Where |
|---|---|---|
| G6 — user HTML does not execute | PASS | §1.3, `tests/safeRendering.test.tsx` |
| G6 — assistant/model HTML does not execute | PASS | §1.3 — including inside lists and emphasis |
| G6 — source title/content cannot execute HTML | PASS | Day 2 test, still green |
| G6 — no unsafe `dangerouslySetInnerHTML` introduced | PASS | repo-wide scan returns `[]` |
| API contract — App parser still requires all six fields | PASS | `src/chat/askResponse.ts` unchanged; `tests/askApi.test.ts` (26) green |
| API contract — no undocumented field dependency added | PASS | today's change reads only `status`, `answer`, `sources`, `clarification` |
| Grounding — source URLs are not model-authored | PASS | every anchor is inside the Sources region (new test) |
| Secrets — none in frontend production assets | PASS | §2.6 |

---

## 8. Open items carried forward

| Item | Status |
|---|---|
| Carmen's grounded Gemini path | **Not pushed at time of writing.** Formatter verified against fixtures + the real deterministic response; re-run when it lands |
| Whether Gemini emits markdown at all | Unknown. Flat prose degrades to a single paragraph — no rework either way |
| Port disagreement (`.env.example` 8080/8081 vs the service's actual 8000) | **Still open from Day 3 §9.6.** Shared file, Qasim's call; not changed here |
| Inline links inside answer text | Deliberately not supported — a model-authored link would breach the provenance invariant |
| Quick Links canonical URLs · ANU crest asset | Still not supplied |
| Resource page routing | Day 5 |
| Events / Jobs endpoints | Days 10 and 12 |
| Interactive clarification selection | Day 13 |

## 9. Scope boundary held

Changes are confined to `frontend/` plus this evidence file. No contract, architecture
boundary, source policy, status semantic or interaction rule changed, and no dependency
was added. The one thing built beyond the literal task list is the `scrollbar-gutter`
fix in §4 — it is the direct result of the day's own "no layout shift" verification, and
it is one CSS declaration.

---

# Part B — second verification pass against the full Day 4 task list

Re-run item by item against the written Day 4 task list and acceptance criteria, after
the first pass. Two gaps were found and closed; everything else was confirmed by
measurement rather than by assertion.

## B.1 Gap closed — the gate's literal string was not the one being tested

The gate names `<script>alert('x')</script>`. The fixtures used
`<script>alert(2)</script>` and friends — equivalent in kind, but not the literal
string the gate asks for. That string is now in the fixture's answer **and** in a stored
source title, and a new test drives it through all three untrusted channels at once.

Live, with `window.alert` replaced by a spy and an `error` listener attached:

```
user input rendered   : &lt;script&gt;alert('x')&lt;/script&gt;      <- escaped by React
answer body contains  : true    (as text)
source title rendered : "<img src=x onerror=alert(3)><script>alert('x')</script>Title that must render as text"
alert() calls fired   : []
window errors         : []
<script> elements containing alert('x') : 0
```

Also verified against the **real service** (mock flag off, fixture picker absent):
typing `<script>alert('x')</script>` into the composer produced
`<p>&lt;script&gt;alert('x')&lt;/script&gt;</p>` and no execution.

## B.2 Gap closed — a Day 2 assertion pinned the old title

Extending the hostile source title broke `sourceCards.test.tsx`'s regex. The assertion
was updated to the current fixture; its intent is unchanged (title renders as text, no
element created). Caught by the suite, not shipped.

## B.3 Every frozen status renders a controlled, non-blank state — PASS

All ten fixtures, driven one after another in the browser at 1280px:

| Fixture | Status | Non-blank | Chars | Source rows / links | `role="alert"` | Injected nodes |
|---|---|---|---|---|---|---|
| `ok` | `ok` | yes | 161 | 1 / 1 | 0 | 0 |
| `ok-multi` | `ok` | yes | 401 | 3 / 3 | 0 | 0 |
| `grounded` | `ok` | yes | 535 | 1 / 1 | 0 | 0 |
| `partial` | `partial` | yes | 162 | 1 / 1 | 0 | 0 |
| `needs-clarification` | `needs_clarification` | yes | 120 | 0 / 0 | 0 | 0 |
| `insufficient` | `insufficient_evidence` | yes | 135 | 0 / 0 | 0 | 0 |
| `off-topic` | `off_topic` | yes | 117 | 0 / 0 | 0 | 0 |
| `error` | `error` | yes | 65 | 0 / 0 | **1** | 0 |
| `hostile` | `ok` | yes | 400 | **2 / 1** | 0 | 0 |
| `reject` (transport failure) | `error` | yes | 76 | 0 / 0 | **1** | 0 |

```
alert() calls fired across the whole sweep : []
window errors across the whole sweep       : []
```

The hostile row's `2 sources / 1 link` is the safe-URL guard working: the record whose
stored URL is `javascript:alert(4)` is rendered as a card but **not** as a link.
Document-wide check: `any href starting with "javascript:" : false`.

## B.4 Loading, `Try asking` and `Clear Chat` — PASS

One uninterrupted sequence, measured at each step (the mock's 350ms latency is what
makes the in-flight frame observable):

| Step | `Try asking` | Suggestion buttons | Turns | Note |
|---|---|---|---|---|
| empty state | present | 4 | 0 | |
| in flight | **gone** | 0 | — | "AskANU is finding an answer" shown; Send disabled |
| answered | gone | 0 | 2 | pending turn replaced in place |
| after `Clear Chat` | **present** | 4 | 0 | composer also cleared |

## B.5 Real COMP1110 source card opens the official ANU page — PASS

Href read from the rendered card in the running app, then loaded:

```
card href : https://programsandcourses.anu.edu.au/2026/course/COMP1110
target    : _blank      rel: noopener noreferrer      inline onclick: false

loaded    : title "Structured Programming - ANU"
            url   https://programsandcourses.anu.edu.au/2026/course/COMP1110
            page  "PROGRAMS AND COURSES COURSES COMP1110 COURSE Structured Programming
                   An undergraduate course offered by the School of Computing."
```

## B.6 Out-of-scope areas untouched — PASS

```
$ git diff --name-only main...HEAD | grep -E "src/(layout|resources|theme|ui)/|src/App|main.tsx|package.json|vite.config|\.env"
(no output)
```

The right resource rail, navigation, mobile drawer, theme, `App.tsx`, `package.json`,
`vite.config.ts` and every `.env*` file are unchanged. The diff is 13 files, all under
`src/chat/`, `src/mocks/`, `src/dev/` and `tests/`.

**No second chat architecture:** `useChatSession` is still referenced only by `App.tsx`,
`ChatPanel.tsx` and its own module — one chat, one session, as V3 requires.

**No unsafe rendering path:** the only three matches for `dangerouslySetInnerHTML` in
`src/` are comments explaining that it is not used; the CI scan strips comments before
searching and still returns `[]`. `isSafeHttpUrl` remains the single gate on every
source link, and no component in `src/chat/` constructs an anchor except `SourceCards`.

## B.7 Command gate — PASS

```
$ npm run test    ->  Test Files 9 passed (9)   Tests 95 passed (95)
$ npm run build   ->  tsc --noEmit && vite build   ✓ built (219.01 kB JS / 18.15 kB CSS)
$ git diff --check ; echo exit=$?
exit=0

dist leakage: example.invalid 0 · MOCK_SCENARIOS 0 · alert('x') 0 · onerror=alert 0 · req_mock 0
```
