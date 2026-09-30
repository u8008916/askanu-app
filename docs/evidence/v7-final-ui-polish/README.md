# V7 final UI polish and R6 re-verification

**Date:** 2026-09-30
**App branch:** `ben/v7-final-ui-polish`, created from `ben/v7-day7` at `d3ec8e15d49386d20a2af542bee8ffe4f515863c`. `ben/v7-day7` (the 44/45 + 281/284 evidence checkpoint) is untouched.
**Production baseline:** `d5ed8ff9d04086bcdb0a295d60475735a37cd71c`. No contract, wire, RAG or scraper change. No App-side parsing, filtering or wording of meaning was added.
**Design target:** the PM's light-mode AskANU reference screenshot (chat left, Explore rail right, numbered event cards, full-width Show more, Sources row).

All results are local engineering evidence, not CI.

## 1. Functional: R6-B / R6-C

**RAG tested:** `e88a0d7e6bde2f6135ef152dc1b90d211a56a83e` (`carmen/v7-day7-rc-torture`, "fix: tighten R6 hard-constraint parsing", pushed 30 Sep 09:31 after `971e837`). Compared against `971e837` on the same fixtures.

Method: a live `create_app` from Carmen's own D4/D5/D6 fixtures with the clock fixed to 14 Sep 2026 (`serve_rc.py`), driven by the committed App-faithful clients. `r6_reverify.py` is new and only observes RAG's own `conversation_state.constraints` and `items`. Reproducibility check: the reconstructed fixture set gives **281/284 at `971e837`**, exactly the recorded baseline, so the harness is faithful.

| Gate | `971e837` | `e88a0d7` |
|---|---|---|
| `torture_rc.py` | 47/48 | **47/48** (same single known-stale expectation: "older turn's Show more" predates Option A) |
| Broader matrix | 281/284 | **282/284** (R6 valid location now passes; R3 and Jobs duplicate prose stay open) |
| `r6_reverify.py` (28 checks, PM's phrasings) | 14/28 | **20/28** |

The torture script reports 48 cases rather than the recorded 45 because my reconstruction includes the Day 6 Hall/Lodge accommodation records that three extra cases need. Those three pass.

### R6-B: **NOT CLOSED** (the reported query is fixed; one requested phrasing is not)

| Query | Result at `e88a0d7` |
|---|---|
| What jobs are available at ANU in Canberra? | PASS: `location=canberra`, 5 cards, no `"anu in canberra"`, population-incomplete caveat kept |
| What jobs are available in Canberra? | PASS (same) |
| Any ANU jobs in Canberra? | PASS (same) |
| Show me jobs at ANU in Canberra | PASS (same) |
| **Are there jobs around Canberra?** | **FAIL**: `insufficient_evidence`, 0 cards, **no location constraint extracted** ("around" is not understood; answer is the course-prerequisite fallback text). Same at `971e837`, so not a regression. |
| What jobs are available at ANU? (control) | PASS: 5 cards, no location |
| **Show me any jobs at ANU** (control) | **FAIL**: 0 cards, no constraints. Same at `971e837`. |

### R6-C: **NOT CLOSED** (`any` and `about` are fixed; other conversational words are not)

| Query | Result at `e88a0d7` |
|---|---|
| Are there any jobs in Canberra? | PASS: no `employment_type`, 5 cards |
| Tell me about jobs in Canberra | PASS: no `employment_type`, 5 cards (was `about` + 0 cards at `971e837`) |
| Any casual jobs in Canberra? | PASS: `employment_type=casual` honoured, 1 card |
| Are there any full-time jobs in Canberra? | PASS: `employment_type=full-time` honoured, 1 card |
| Any jobs in Antarctica? / casual jobs in Sydney? | PASS: constraint kept and visible, no unconstrained list |
| **Do you know about jobs in Canberra?** | **FAIL**: only `location=canberra` (the `about` constraint is gone), yet **0 cards** and `insufficient_evidence`, while "Tell me about jobs in Canberra" returns 5. |
| **What about jobs in Canberra?** | **FAIL**: same as above. |
| **Do you have jobs in Canberra?** | **FAIL**: **spurious `employment_type="have"`**, 0 cards. Same class of defect as R6-C, new word. |
| **Show me jobs / Show me jobs at ANU / Show me any jobs at ANU** | **FAIL**: 0 cards. `any` is no longer a constraint, but the query still returns nothing. Same at `971e837`. |

Exact request, response and state for each remaining failure: `r6-remaining-failures.e88a0d7.json`. Full run: `r6-e88a0d7.json` (and `r6-971e837.json` for comparison).

All of this is RAG-owned interpretation. The App did not patch any of it, per the ownership rule. Recommended next ask for Carmen: treat conversational filler ("have", "know", "what about", "show me", "around") the way `any`/`about` are now treated, and make bare "Show me jobs" route to the Jobs listing.

Original torture / broader matrix (unchanged scripts): **47/48** and **282/284**.
New regression versus `971e837`: **none**.

## 2. UI

| Item | Status |
|---|---|
| ANU crest | **DONE, with a provenance flag.** The header shows the crest file supplied at 09:54 on 30 Sep (`Australian_National_University-Logo.wine.png`, copied byte-for-byte to `frontend/src/assets/brand/anu-crest.png`; alt "Australian National University crest"). It sits in a fixed square so the wordmark never shifts. The supplied file is a mid-brown line mark, so on the dark theme it sits on a light backing chip instead of being recoloured. **The filename indicates logo.wine, not an ANU brand portal. It is not confirmed as an approved official asset; PM needs to confirm provenance before merge.** If it is rejected, deleting `anu-crest.png` restores the placeholder mark with no code change. |
| Quick Link logos | **PARTIAL.** Fixed-size logo box, equal tile heights, alignment and external-link indicator are done for the 2-column grid and the mobile row. **Canvas** uses the supplied `Canvas_LMS.png` (logo.wine again; same provenance flag), cropped to its round icon because the wordmark is unreadable at 28px; the crop is trimming only, no recolour or redraw. **AnuHub, MyTimetable and ANU Careers have no supplied logo**, so they keep the icon fallback in the same box. Drop `anuhub.*`, `mytimetable.*` or `anu-careers.*` into `src/assets/brand/` to replace them. Logo `<img>` is decorative (`alt=""`) because each link already has its visible name beside it. |
| User avatar | DONE: gold circle with silhouette, role `img` named "You", right of the bubble, fixed size (no layout shift) |
| AskANU avatar | DONE: reusable `AskANUIdentity` (gold "A" + "AskANU") on every assistant turn, including notices and the pending state |
| Assistant answer layout | DONE: one answer surface: heading, optional backend prose, numbered cards, Show more, Sources row, timestamp |
| Events rich card | DONE with one honest difference: no thumbnail. The wire carries no image field, so a domain-icon tile stands in; nothing is fetched or invented. Time row with clock, venue row with pin, organiser · provenance line, chevron. |
| Show more restyle | DONE: full width with a plus icon, inside the result group, worded per domain ("Show more events", "Show more jobs"). Still sends the server cursor; no local slicing. |
| Sources accordion | DONE: "Sources (n)" row with document icon and chevron, closed by default, native `<details>`. The abstention (insufficient evidence) path opens it because that source is all the turn has. Every source, URL and label is unchanged inside. |
| Timestamps | DONE: local creation time (`Date.now()` when the turn is added), both sides, subtle. Never a backend value; absent for fixtures. |
| Light / dark / 375px | See screenshots. Light PASS, dark PASS, 375px PASS. No horizontal overflow in any of the 25 captures; console errors and warnings: 0. |

Heading wording is a count and a domain noun only ("5 events", "1 course", "4 accommodation options", "5 jobs"). It never says best, eligible, open, available or happening, and no wording is added beyond the domain name. Where RAG writes its own caveat (PARTIAL/UNKNOWN, Support scope), that prose is shown under the heading and above the cards, verbatim.

### Deliberate deviations from the brief

- **Short intro sentence** ("Here are 5 events on Tuesday 23 September 2025"): not built. RAG's list prose restates each record, so it cannot serve as a one-line intro without App-side text parsing, which is out of bounds. The intro line is mechanical from `result_page` only ("Showing 1–5 · more available").
- **Current Jobs sidebar panel:** already exists and is unchanged; nothing new added.
- **Every stored field stays reachable.** The most scannable fields are icon rows; the rest sit under "More details" on the same card; an unpublished field reads "Not published", never omitted or guessed. The row markup is a description list, so each value stays a labelled pair.
- **Known limitation:** a PARTIAL Jobs/Scholarship answer keeps RAG's whole prose above the cards, and that prose also restates every record (the open "Jobs duplicate prose" item). The App must not split it. It is long but complete and unchanged from before this pass.

### Files

New: `chat/MessageIdentity.tsx`, `chat/results/ResultCard.tsx`, `chat/results/cardLayout.ts`, `ui/brandAssets.ts`, `assets/brand/{README.md, anu-crest.png, canvas.png}`. Reworked: `AssistantTurn`, `UserTurn`, `PendingTurn`, `SourceCards`, `ResultList`, `Brand`, `QuickLinksCard`, `useChatSession` (adds `createdAt`), plus their CSS.

## 3. Regression

| | Before | After |
|---|---|---|
| Frontend | 508/508 | **548/548** (+40 in `tests/v7FinalUiPolish.test.tsx`) |
| D4 / D5 / D6 / D7 | 31 / 52 / 34 / 14 | **31 / 52 / 34 / 14** |
| Server | 50/50 | **50/50** |
| `tsc --noEmit` | PASS | **PASS** |
| `vite build` | PASS | **PASS** (JS 303.6 kB, CSS 33.7 kB) |
| `git diff --check` | clean | **clean** |
| React warnings | none | **none** (0 console errors/warnings in 25 real-browser captures) |
| Horizontal overflow | none | **none** at 1280 and 375 |

One transient failure appeared once in one full-suite run (machine under load, name not captured) and did not reproduce in the three consecutive full runs that followed (548/548 each); flagging it rather than hiding it.

Existing tests changed (presentation only; every semantic assertion kept): "N results" headings became "N jobs" and similar; "Show more" queries match "Show more events" and its siblings; `<details>` lookups target the "Show as text" disclosure specifically because cards and Sources are now disclosures too; the ordinal is read from `data-ordinal`; two exact DOM-order lists are compared order-insensitively. The four safe-rendering tests that asserted "no `<img>` anywhere" now assert "no image except the bundled brand files" (`untrustedImages` in `tests/helpers.ts`), so injected `<img>` from model, record or user text is still caught. New helpers `showAsTextDetails` and `resultCardNumber` are also in `tests/helpers.ts`.

## 4. Evidence index

Real dev App (Vite) against the real RAG at `e88a0d7` (fixture data, clock 14 Sep 2026), captured with headless Chrome over CDP.

- `screens/events-desktop-01-answer.png`: main comparison shot against the reference
- `screens/events-desktop-02-show-more-sources.png`, `-03-sources-open`, `-04-after-show-more`
- `screens/events-mobile-01-answer.png`, `-02-cards`, `-03-show-more-sources` (375px)
- `screens/course-mobile-01.png`, `scholarship-mobile-01-cards.png`, `accommodation-mobile-01.png`, `jobs-mobile-01-cards.png`, `support-mobile-01.png` (375px, each from a fresh page)
- `screens/course-desktop-01.png`, `scholarship-desktop-01/02`, `accommodation-desktop-01.png`, `jobs-desktop-01/02`, `support-desktop-01.png`
- `screens/home-desktop-light.png`, `home-desktop-dark.png`, `home-mobile-light.png`
- `screens/events-desktop-dark-01/02`, `events-mobile-dark-01-answer.png`

Two capture reports: `screens/_capture-report.json` (desktop) and `_capture-report-mobile.json`. Both record horizontal-overflow checks per screenshot (none) and console errors/warnings (0).

On phones (<= 480px) the decorative domain tile is hidden so the text gets the full card width; the numbered title, icon rows and chevron remain.

Data behind the screenshots is Carmen's synthetic test fixtures ("Event 800001", "Venue 1"), so it looks placeholder-ish by design.

## 5. Housekeeping

- The two supplied originals still sit untracked in the repo root (`Australian_National_University-Logo.wine.png`, `Canvas_LMS.png`); they are not committed. The bundled copies are in `frontend/src/assets/brand/`.
- Mobile Quick Links truncate "MyTimetable" and "ANU Careers" with an ellipsis in the 4-across row. That is unchanged from the accepted Day 15 mobile evidence (`docs/evidence/day15/home-390x844-mobile.png`) and was not touched here.
- `serve_rc.py` (this folder) is the local RC server used for section 1 and for the screenshots; it imports Carmen's test fixtures from an `askanu-rag` checkout at the SHA under test.
