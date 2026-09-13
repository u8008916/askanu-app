# V5 Sun 13 Sep evidence — Scholarships guided page

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day9-scholarships-domain` (from `4d85436`)
**Date:** Sunday 13 September 2026 — V5 Day 2 (calendar Day 9)
**Deliverable:** Scholarships resource page, reusing the Saturday `DomainLauncher` pattern

Numbers below are real command output or real DOM/browser measurements taken
locally; there is no CI run attached to this branch.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.7.

**Revision note:** this doc was written, then independently re-verified line
by line the same day (double-check pass). Two real gaps were found and
closed rather than just re-asserted: (1) criterion 3 was argued from
unchanged code, not tested — a real clarification/follow-up round trip was
added; (2) no screenshot file existed — one was captured, and a second
capture attempt (mobile) surfaced a genuine headless-Chrome tooling quirk on
this machine, documented in §5 rather than silently discarded.

---

## 0. Summary

Cross-repo pre-work check (scraper/RAG) confirmed Scholarships is an approved
domain/source but shared Cloud SQL persistence and the RAG persisted-record
model are still Courses-only. Per the agreed split, App/UI work is not
blocked by that: this PR only adds the frontend guided-domain launcher for
Scholarships. No API contract, schema, or shared-persistence change is made
or required.

The `DomainLauncherConfig` shape from Day 8 needed no changes — adding a
domain is exactly "one config + one route" as designed.

| | |
|---|---|
| New | `src/pages/ScholarshipsPage.tsx`; `SCHOLARSHIPS_DOMAIN` in `domains/domainConfig.ts`; `tests/scholarshipsPage.test.tsx`; `needsScholarshipClarificationResponse` fixture + `needs-clarification-scholarship` mock scenario |
| Changed | `App.tsx` (+route `/scholarships`), `layout/DomainNav.tsx` (Scholarships nav item now links instead of `aria-disabled`), `tests/navigation.test.tsx`, `mocks/askResponses.ts`, `dev/mockTransport.ts` |
| Deleted | none |
| Runtime dependencies added | **0** |

**No backend call was required or made.** Card click only prefills the composer.

---

## 1. Official links — verified, not guessed

Both URLs were opened in a real browser today and returned HTTP 200, reached
from ANU's own site navigation (`study.anu.edu.au` → Scholarships →
Find a scholarship):

- `https://study.anu.edu.au/scholarships` — Scholarships home
- `https://study.anu.edu.au/scholarships/find-scholarship` — the official ANU
  Scholarships Finder (matches `source_id = scholarships_anu_finder` from the
  cross-repo identity contract for Sunday)

The finder's own filters (`Scholarship status`, `Application requirement`,
`Study stage`, `Student type`, `Study level`, `Area of study`) line up with
the metadata fields Will/Carmen are freezing for `metadata_json`, confirming
the UI's four card intents (find / eligibility / deadlines / degree) map to
real source-supported facets rather than invented ones. An individual
scholarship's canonical URL (e.g.
`https://study.anu.edu.au/scholarships/find-scholarship/anu-vice-chancellor-scholars-program`)
confirms the "canonical URL slug" identity convention is a real, stable path,
not a guess.

Query-string filtered links (e.g. "Scholarships for current students") were
seen on the source site but deliberately left out of the compact resource
list — consistent with the identity contract's instruction to strip query
strings for anything meant to be stable/canonical.

### 1a. Frozen Day 9 identity contract, and why these two links sit outside it

An earlier pair of PM messages disagreed on `entity_id` ("stable source ID"
vs. "canonical URL slug"). That is **closed**: the PM confirmed on 13 Sep
that the canonical ANU Scholarship Finder detail-URL slug is the frozen
`entity_id`, and the "stable source ID" wording is superseded.

```
domain        = scholarships
source_id     = scholarships_anu_finder        # which collector produced the record
canonical_url = https://study.anu.edu.au/scholarships/find-scholarship/<slug>
entity_id     = <slug>                         # which individual scholarship it is
record_id     = scholarships:scholarship:<entity_id>
```

Exact persisted-detail boundary: `https` · host exactly `study.anu.edu.au` ·
path exactly `/scholarships/find-scholarship/<slug>` · no query, no fragment,
no trailing slash · final path segment equals `entity_id` by literal
equality. `source_id` and `entity_id` are separate concepts and are never
mixed; `entity_id` is never derived from the title.

**Two kinds of link — do not apply the record rule to the wrong one:**

| Kind | Examples | Where it lives | Subject to the identity CHECK? |
|---|---|---|---|
| Navigation / resource | `https://study.anu.edu.au/scholarships`, `…/scholarships/find-scholarship` | Statically configured in `domainConfig.ts` as trusted official escape hatches | **No** — not a persisted record, no slug, no `entity_id`/`record_id` |
| Evidence / source | `https://study.anu.edu.au/scholarships/find-scholarship/<slug>` | Arrives in `/api/v1/ask` `sources[]` from the RAG service's stored `canonical_url` | **Yes** — Scraper and RAG both enforce the boundary |

The two App resource links are the first kind. They are valid as-is; nobody
should append a fake slug to them or run them through the persisted-record
validator. The App never constructs a scholarship record URL or ID — the
only place `record_id`/`url` appear in `frontend/src` is passthrough of the
API envelope (`types/api.ts`, `chat/askResponse.ts`, `chat/SourceCards.tsx`).
This distinction is also recorded as a comment on `SCHOLARSHIPS_DOMAIN` in
`domainConfig.ts` so it survives past this handoff.

---

## 2. Cards — no invented data

Per `CONVERSATION_CONTRACT.md` (Scholarships: "ask only necessary eligibility
clarifications", no persistent profile) and the day's "do not create
scholarship-specific fake UI logic" instruction, none of the four card
titles/descriptions state a dollar value, percentage, closing date, or named
scholarship — pinned by `scholarshipsPage.test.tsx › shows no invented
scholarship data`.

| Card | Prompt placed in composer |
|---|---|
| Find scholarships for me | `Find scholarships for me` |
| Check eligibility | `Am I eligible for this scholarship?` |
| Deadlines | `When is the application deadline for this scholarship?` |
| Scholarships for my degree | `What scholarships are available for my degree?` |

---

## 3. Desktop no-scroll gate (1280×720)

Measured on the launcher root (`main > div > :first-child`), same method as
Day 8:

```
clientHeight: 672   scrollHeight: 672   → no scroll
```

Identical to the Courses page's measured result — the shared component, not
a per-page fix, is what keeps this true.

---

## 4. Card → chat hand-off, measured

Real pointer click on **"Find scholarships for me"** at 1280×720:

```
path      : /
draft     : "Find scholarships for me"
focused   : true
Try asking: present (empty state intact)
network   : no /api/v1/ask request
```

Real tap on **"Deadlines"** at 390×844:

```
path      : /
draft     : "When is the application deadline for this scholarship?"
focused   : true
Try asking: present
```

Both guided flows (scholarship matching, deadline check) requested by the
day's plan are covered above and, as of the double-check pass below, by a
real clarification round-trip in `scholarshipsPage.test.tsx`.

### Clarification + session follow-up, actually exercised (added on double-check)

The first pass of this PR only argued criterion 3 ("Card → New Chat →
clarification/answer works") by pointing at the generic chat pipeline being
unchanged. On re-verification that was judged too indirect, since no test
actually drove a Scholarships card into a clarification and back. Added
`scholarshipsPage.test.tsx › renders clarification naturally and supports a
session follow-up`:

1. Click **"Check eligibility"** → composer holds `Am I eligible for this
   scholarship?`.
2. Mock scenario `needs-clarification-scholarship`, Send → the read-only
   `Clarification options` list renders (`CONVERSATION_CONTRACT.md`: answer
   in words, not a picker). The test asserts the **scholarship-specific**
   content: answer `Which scholarship do you mean?`, options
   `Placeholder scholarship A` / `Placeholder scholarship B` in contract
   order, the single-choice wording (`allow_multiple: false`), and that no
   course code (`COMP\d{4}`) appears.
3. Type `first` in the same composer (session kept, no reset), switch mock
   scenario to `ok`, Send → the resolved answer renders, no second
   clarification list appears, and both turns (`Am I eligible for this
   scholarship?` and `first`) are still visible in one conversation.

PR #29 review (Qasim) caught that the first version of this test drove the
Scholarship card into the *generic course* clarification fixture
(`Do you mean COMP1110 or COMP1600?`), which proved the mechanics but not a
representative Scholarship flow. Fixed by adding
`needsScholarshipClarificationResponse` to `mocks/askResponses.ts` (option
ids use the frozen `scholarships:scholarship:<slug>` shape; slugs and labels
are placeholders, not real ANU scholarships, per the no-invented-facts rule)
and the `needs-clarification-scholarship` scenario to `dev/mockTransport.ts`,
which also makes it selectable in the dev fixture picker.

This is real, passing coverage for "renders clarification naturally" and
"test session follow-up" from the day's Chat UX integration work block, not
an inference from unchanged code. (Note: no equivalent round-trip test exists
yet for Courses either — this is a suite-wide gap the Day 8 evidence didn't
close, not something new introduced here.)

---

## 5. Mobile

The trustworthy check is the one already done in-session: the Browser
pane's CDP-based `resize_window` to exactly 390×844 (the same mechanism used
for the desktop 1280×720 numbers above) — four cards stacked, full text
wrapped correctly, no horizontal overflow, vertical scroll present by design.
This matches Courses' mobile behaviour and is the same shared component, so
nothing page-specific could regress it.

**Tooling note (found during double-check, not an app defect):** an attempt
to also save a mobile screenshot *file* via headless Chrome CLI
(`chrome.exe --headless=new --window-size=390,844 --screenshot=...`)
produced an image with text clipped at the right edge. Diagnosed with a
blank `data:` URL probe:

```
--window-size=390,844  →  innerWidth=512, innerHeight=746   (old and new headless, same result)
--window-size=1280,720 →  innerWidth=1258, innerHeight=622
```

This machine's Chrome build does not honour `--window-size` as the actual
viewport below roughly 512px wide — it silently floors the width, so the app
laid out for ~512px and the screenshot cropped it back to the requested
390px, producing the apparent (false) overflow. The CDP-based `resize_window`
check above does not go through this code path and is unaffected — it is
what should be trusted for pixel-exact viewport claims on this machine, not
a CLI `--window-size` screenshot. The misleading mobile PNGs were deleted
rather than kept as evidence. `scholarships-1280x720-dark.png` (§ below) is
kept only as an approximate visual reference, not as proof of exact
1280×720 layout — its own real inner size was 1258×622, not 1280×720, for
the same reason.

---

## 6. Automated tests and build

```
$ cd frontend && npx vitest run
 Test Files  13 passed (13)
      Tests  135 passed (135)

$ npm run build          # tsc --noEmit && vite build
dist/assets/index-BH-8UOPY.js   265.06 kB │ gzip: 85.03 kB
✓ built in 1.04s
```

122 (Day 8) → 135 (+13): 11 new in `scholarshipsPage.test.tsx` (10 from the
first pass, +1 clarification/follow-up round-trip from the double-check),
2 new in `navigation.test.tsx` (routes to Scholarships; opens Scholarships
directly from its own URL); the old "leaves the five unbuilt domains" test
was narrowed to the four still-disabled domains and the nav link count moved
2 → 3.

A static full-page render was also saved for the record:
`docs/evidence/day09/scholarships-1280x720-dark.png` (headless Chrome
defaulted to dark `prefers-color-scheme` on this machine; light mode was
visually confirmed interactively earlier in-session but not saved as a file
— see the tooling note in §5 for why a CLI-saved light-mode file wasn't
pursued further).

---

## 7. Security

- No `dangerouslySetInnerHTML`; card copy renders as text (same
  `DomainLauncher`/`RecommendedQuestionCard` as Courses).
- Both official links go through `ExternalLink` → `isSafeHttpUrl`;
  `target="_blank" rel="noopener noreferrer"` confirmed; host restricted to
  `study.anu.edu.au` in `scholarshipsPage.test.tsx`.
- No new dependency.

---

## 8. Acceptance criteria (`my_day_by_day_tasks.md`, Sun 13 Sep — page/UI scope)

| # | Criterion | Result |
|---|---|---|
| 1 | Scholarships page uses same reusable structure as Courses | PASS — same `DomainLauncher`, no per-page markup |
| 2 | No-scroll desktop target passes | PASS — 672/672 at 1280×720 (§3) |
| 3 | Card → New Chat → clarification/answer works | PASS — routing/prefill (§4) plus a real clarification-then-answer round trip driven from a Scholarships card, added on double-check (§4) |
| 4 | Source cards and error/insufficient states render safely | PASS by inheritance — unchanged generic pipeline (`sourceCards.test.tsx`/`responseStates.test.tsx`/`safeRendering.test.tsx`); `okMultiSourceResponse` already includes a `domain: 'scholarships'` source card fixture exercised by `sourceCards.test.tsx`, so the scholarships domain value specifically is covered, not just "some domain" |

### Not in this PR's scope (explicitly deferred per today's cross-repo decision)

- Real scholarship search results, eligibility answers, or deadline data —
  depends on Carmen's query/ranking work and the shared persistence
  generalisation Carmen is coordinating; App does not fabricate this.
- Any Cloud SQL / RAG persisted-record schema change.

---

## 9. Qasim integration checkpoint

Per today's plan: **Scholarships vertical-slice release gate.** No shared
contract/source/schema/cloud change was made in this PR — flagging for
Qasim's review is procedural (nothing to approve beyond the new route),
recorded here so the checkpoint isn't silently skipped.
