# Day 5 — Course Domain Baseline Gate

## Date
Wednesday, 9 September 2026

## Owner
Qasim — PM / Integration / GCP / Testing / Security / Release

## Issue
`askanu-app#15` — Day 5 — Freeze course-domain baseline after breadth and retrieval tests

## Phase
COURSE BREADTH + HYBRID RETRIEVAL

## Final decision
`PENDING`

Allowed values:

- `PASS`
- `BLOCKED`

---

# Objective

Determine whether the Courses/Programs implementation is ready to become the reusable retrieval and UI pattern for later AskANU domains.

Day 5 is not complete merely because individual PRs pass their own tests.

The integrated system must prove:

bounded discovery
→ stable normalized records
→ deterministic-first retrieval
→ semantic/vector fallback only when needed
→ grounded Gemini synthesis
→ frozen API contract
→ React Courses experience
→ official stored ANU sources

The course baseline must not be approved if identity, year handling, provenance or retrieval routing can silently produce the wrong entity.

---

# Day 4 Baseline Entering Day 5

Day 4 finished with final decision:

`GO`

Verified real path:

ANU Programs & Courses
→ merged scraper
→ normalized `COMP1110_2026`
→ merged RAG
→ real Gemini
→ strict validation
→ `/api/v1/ask`
→ merged React UI
→ official stored ANU source

Known correct COMP1110 2026 evidence:

- `record_id`: `courses:course:COMP1110_2026`
- title: `Structured Programming`
- prerequisites: `COMP1100 OR COMP1130 OR COMP1730`
- incompatibilities: `COMP1140 or COMP6710 or COMP7710`
- assumed knowledge: `MCOMP students from 2026 onwards must enrol in COMP7710 Programming Fundamentals.`
- First Semester 2026 offering
- Second Semester 2026 offering
- official stored canonical URL

Day 5 must preserve these properties while expanding beyond the one-course demo.

---

# Day 5 PRs

## Will — Scraper / Data

Issue:

`askanu-scraper#8` — Day 5 — Add bounded Programs & Courses catalogue discovery

PR:

`askanu-scraper#12` — Will/day5 catalogue discovery

Commit reviewed:

`57ff9125b90c0d99915fb1a2aa45b1f9d3dc2d4b` — final reviewed PR head after the live catalogue fix was integrated

Live catalogue fix:

`c8986ceadeb813db60303ffe5730a8b8f4d0f6b9` — `fix: support bounded live ANU catalogue discovery`

Merge commit:

`fa41a4d70e7d532081c4aa2b0640a7295097ad1e` — merge of `askanu-scraper#12` into `main`

Result:

`PASS`

### Required review evidence

- [x] More than one course discovered
- [x] More than one program discovered
- [x] Development sample is explicitly bounded
- [x] No uncontrolled crawl
- [x] Academic year preserved
- [x] Entity type preserved
- [x] Canonical URLs preserved
- [x] Stable logical IDs produced
- [x] Duplicate canonical entities detected
- [x] Duplicate logical entities detected
- [x] Duplicate records not silently inserted
- [x] Sanity counts available before broader write
- [x] Suspicious empty/invalid discovery fails safely
- [x] Repeated discovery produces stable logical results
- [x] No unapproved source added
- [x] No first-class major/minor/specialisation schema type added without approval
- [x] Existing scraper/parser tests remain green
- [x] New discovery tests pass
- [x] `git diff --check` passes

### Sanity counts

Courses discovered:

`2` in the bounded live 2026 verification sample

Programs discovered:

`2` in the bounded live 2026 verification sample

Duplicates detected:

`0` in the bounded live API sample; duplicate identity/canonical handling is covered by the automated discovery/collector tests

Invalid/skipped:

`0` in the successful bounded live API sample

Sample limit:

`4` persisted detail records total — `2` courses + `2` programs; one course API page, one undergraduate-program API page, no automatic pagination

Repeated-run result:

Fixture-driven repeated ingestion preserved stable record IDs and content hashes. The second bounded fixture run marked all four records unchanged.

Notes:

Independent reviewer verification completed with `102/102` tests passing.

The live 2026 bounded end-to-end run completed with `SUCCESS`, `records_seen = 4`, and `records_added = 4`.

Verified live records included:

- `ARCH8046_2026` — Microanalysis in Archaeological Science
- `COMP8703_2026` — Vulnerability Research and Exploit Mitigation
- `BACCT_2026` — Bachelor of Accounting
- `HACCT_2026` — Bachelor of Accounting (Honours)

Production HTTP catalogue requests default to a minimum one-second spacing. Live discovery uses the ANU Programs & Courses catalogue JSON endpoints, remains bounded, performs no automatic pagination, and preflights all selected detail records before the first write.

Majors, minors, and specialisations remain discovery-only and were not promoted to first-class schema-v1 persisted entity types.

---

## Carmen — RAG / Backend

Issue:

`askanu-rag#10` — Day 5 — Implement hybrid course and program query planning

PR:

`askanu-rag#14` — Day 5 — Implement deterministic-first hybrid course and program query planning

Commit reviewed:

`f0348d74136d9dfbdbb9b7d0add9fe95c9afdcec`

Implementation commit:

`a0453a8` — `feat: add deterministic-first hybrid course and program retrieval`

Merge commit:

`d0abeefb2150bf442a93093471571ad3a3e585f0` — squash merge of `askanu-rag#14`

Result:

`PASS`

### Required review evidence

- [x] Exact course code remains deterministic
- [x] Exact program code is deterministic
- [x] Case variation normalizes correctly
- [x] Spacing variation normalizes correctly
- [x] Explicit academic year preserved
- [x] Explicit unavailable year does not fall back
- [x] Multi-year ambiguity produces clarification
- [x] Unambiguous course-name lookup works deterministically
- [x] Unknown exact identifier never nearest-matches another identifier
- [x] Lexical-vector fallback only runs after deterministic routes are insufficient
- [x] Lexical-vector retrieval is limited to approved stored records
- [x] Lexical-vector retrieval cannot override explicit identity constraints
- [x] Lexical-vector retrieval cannot override explicit year constraints
- [x] Gemini remains grounded on retrieved evidence
- [x] Source attachment remains programmatic
- [x] Frozen `/api/v1/ask` contract remains unchanged
- [x] Day 2–4 regression tests remain green
- [x] New hybrid retrieval tests pass
- [x] `git diff --check` passes

### Retrieval routing evidence

Exact code route:

- `COMP1110`
- `comp1110`
- `comp 1110`
- all planned as `route: exact`
- all normalized to `COMP1110`
- `semantic_allowed: False`

Program code route:

- `Tell me about BACCT 2026`
- planned as `route: exact`
- identifier `('program', 'BACCT')`
- explicit year `2026`
- `semantic_allowed: False`
- resolved to `courses:program:BACCT_2026`

Course-name route:

- `Structured Programming`
- planned as `route: name`
- normalized title `structured programming`
- `semantic_allowed: False`
- resolved deterministically to `courses:course:COMP1110_2026`

Lexical-vector fallback route:

- `Which ANU course covers marine biodiversity?`
- deterministic identifier/name routes were not applicable
- lexical-vector fallback calls: `1`
- candidate set was limited to approved stored course records
- resolved to `courses:course:BIOL9001P_2026`
- no identity/year constraint was overridden

Unknown-code route:

- `What are the prerequisites for ABCD9999?`
- lexical-vector fallback calls: `0`
- status: `insufficient_evidence`
- no nearest-match course substituted
- sources: empty

Explicit-year route:

- `Tell me about COMP1110 2026`
- status: `ok`
- returned only `courses:course:COMP1110_2026`

Unavailable-year route:

- `Tell me about COMP1110 2025`
- status: `insufficient_evidence`
- no fallback to 2026
- lexical-vector fallback disabled

Multi-year route:

- `Tell me about COMP1100`
- stored fixture contained 2026 and 2027
- status: `needs_clarification`
- both academic-year options returned
- no arbitrary year selected
- lexical-vector fallback disabled

### API contract evidence

Representative exact, unavailable-year, multi-year and lexical-vector requests were sent through `/api/v1/ask`.

All returned exactly the frozen six fields:

- `status`
- `answer`
- `items`
- `sources`
- `clarification`
- `request_id`

Observed statuses:

- `COMP1110 2026` → `HTTP 200 / ok`
- `COMP1110 2025` → `HTTP 200 / insufficient_evidence`
- `COMP1100` → `HTTP 200 / needs_clarification`
- marine-biodiversity descriptive query → `HTTP 200 / ok`

The earlier HTTP 400 run was caused by an intentionally/inadvertently incomplete manual request body and was not recorded as an implementation defect; the controlled error envelope still preserved the six-field contract.

### Source provenance evidence

Program source round-trip checked against stored `BACCT_2026` record:

- response `record_id` == stored `record_id`
- response title == stored title
- response URL == stored `canonical_url`
- response `source_id` == stored `source_id`
- response domain == stored domain

All comparisons returned `True`.

Sources remain programmatically attached from stored records.

### Real Gemini evidence

Local configured model:

`gemini-3.5-flash-lite`

Configured timeout:

`30.0 seconds`

Real Gemini integration was independently exercised using the Day 5 schema-v1 synthetic multi-record fixture.

Results:

1. `What are the prerequisites for COMP1110?`
   - HTTP `200`
   - status `ok`
   - grounded prerequisite answer preserved:
     `COMP1100 OR COMP1130 OR COMP1730`
   - source: `courses:course:COMP1110_2026`
   - observed latency: `2.721s`

2. `Tell me about Structured Programming`
   - HTTP `200`
   - status `ok`
   - deterministic name route before Gemini
   - source: `courses:course:COMP1110_2026`
   - observed latency: `2.604s`

3. `Which ANU course covers marine biodiversity?`
   - HTTP `200`
   - status `ok`
   - bounded lexical-vector fallback selected `BIOL9001P_2026`
   - final answer remained evidence-grounded
   - observed latency: `2.402s`

4. `Tell me about BACCT 2026`
   - HTTP `200`
   - status `ok`
   - exact program route selected `courses:program:BACCT_2026`
   - grounded answer: `Bachelor of Accounting`
   - stored program source attached
   - observed latency: `2.44s`

No model-generated source URL entered the response.

### Automated verification

Independent reviewer commands/results:

- full `python -m pytest -q` — all executed tests passed, `1 skipped`
- focused `python -m pytest -q tests/test_hybrid_planner.py` — all tests passed
- `python -m pip check` — `No broken requirements found.`
- `python -m compileall -q src tests` — PASS, no output
- `git diff --check main...HEAD` — PASS, no output
- working tree clean

Dependency-only deprecation warnings were observed from Starlette/httpx and google-genai/Python internals; no Day 5 test failure resulted.

### Retrieval implementation note

The Day 5 fallback is explicitly:

`in-memory TF-IDF + cosine sparse lexical-vector retrieval`

It is a bounded local pre-pgvector baseline, not pretrained embedding-based semantic retrieval.

The PR documentation was updated to state this explicitly. Production embedding/pgvector retrieval remains later work and was not silently represented as completed by this Day 5 lane.

### Reviewer conclusion

`PASS`

Carmen's Day 5 RAG implementation satisfies the reviewer-owned Day 5 backend gate on the tested schema-v1 multi-record fixture.

This does **not** make the overall Day 5 Course Domain Baseline PASS yet.

Remaining overall dependencies include:

- Will's bounded real Programs & Courses discovery/data lane
- integration against the resulting broader real dataset
- Ben's Courses resource-page/UI lane
- final cross-repo Day 5 baseline decision

---

## Ben — App / UI

Issue:

`askanu-app#14` — Day 5 — Build Courses resource page and final empty-state interaction

PR:

`askanu-app#22` — Ben/day5 course breadth+hybrid retrieval

Commit reviewed:

`6145b9c2a76a705f67778577ed8599b3c0997e8f`

Implementation commit:

`2afa547c432c51a740dccc46101a109b7fa9fb9f` — `feat(app): Courses resource page + final empty-state component`

Merge commit:

`94635cd5822ffc5e25d369357cec206b8bae54fb` — merge of `askanu-app#22` into `main`

Result:

`PASS`

### Required review evidence

- [x] Courses resource page exists
- [x] Main navigation opens Courses page
- [x] Courses page is an information/resource hub, not another chatbot
- [x] Official Programs & Courses links are used
- [x] External links remain safe/canonical
- [x] CTA returns/leads to the single AskANU chat
- [x] Suggestion cards work with mouse
- [x] Suggestion cards work with keyboard only
- [x] Suggestion cards work with touch/mobile
- [x] Visible keyboard focus state exists
- [x] Empty suggestions disappear after first question
- [x] Clear Chat restores empty state
- [x] No horizontal scrolling at 360px
- [x] No horizontal scrolling at 390px
- [x] No horizontal scrolling at 430px
- [x] Existing real API integration remains functional
- [x] Existing source-card/security behaviour remains intact
- [x] `npm run test` passes
- [x] `npm run build` passes
- [x] `git diff --check` passes

### Independent reviewer evidence

Exact reviewed PR head:

`6145b9c2a76a705f67778577ed8599b3c0997e8f`

Independent local verification on the exact PR head:

- `npm ci` — completed successfully
- `npm run test` — `11` test files passed, `113/113` tests passed
- `npm run build` — TypeScript check and Vite production build passed
- `git diff --check main...HEAD` — PASS, no output
- working tree remained clean after install, tests and build

Reviewer inspection confirmed:

- `/courses` is a resource/information hub with no second composer or conversation surface
- only Home and Courses are live resource routes; the remaining Day 9–12 domains stay non-navigating
- current-session chat state survives navigation between `/` and `/courses`
- the Courses CTA prefills and focuses the existing composer without sending a request
- external resource links are guarded by `isSafeHttpUrl` and use `noopener noreferrer`
- no current course values are fabricated on the static Courses resource page
- source-card/security tests remain intact after internal routing links were introduced
- visible keyboard focus uses the global `2px` focus ring plus card-specific focus styling
- suggestion cards remain real buttons and automated tests exercise click, Tab, Enter and Space

Ben's recorded browser evidence additionally covers:

- real touch interaction under Android device emulation
- no horizontal overflow at 360px, 390px and 430px

### Reviewer qualification / carry-over

The frontend's real `/api/v1/ask` transport path was exercised and issued the expected POST, but the RAG service was not running during Ben's browser check, so the request returned `500`.

This is sufficient for the App/UI lane to show that Ben did not bypass or replace the existing production transport. A successful App -> RAG -> grounded response remains part of the final cross-repo Day 5 integration gate.

`BrowserRouter` also requires the eventual deployed App service to serve the SPA entry point for a fresh request to `/courses`. The current `server/` directory is still scaffolding and App-server/deployment work is explicitly outside Ben's Day 5 issue. This is carried into deployment work rather than blocking this lane.

---

# Golden Test Matrix

## D1 — Exact course code

### Query

`What are the prerequisites for COMP1110?`

### Expected

- deterministic exact identifier route
- vector/semantic search not required to identify the course
- correct academic year handling
- grounded answer
- stored official source

### Evidence

HTTP status: `200`

API status: `ok`

request_id: present in the frozen six-field response; value was not printed by the summarized integration harness

retrieval route: `exact`

record_id: `courses:course:COMP1110_2026`

answer: `The prerequisites for COMP1110 (2026) are: COMP1100 OR COMP1130 OR COMP1730`

source URL: `https://programsandcourses.anu.edu.au/2026/course/comp1110`

latency: `2.970 s` through Vite -> `/api/v1/ask` -> RAG -> real Gemini

The exact route did not permit semantic identity selection.

### Checks

- [x] Exact identifier used
- [x] No vector identity substitution
- [x] Correct stored entity returned
- [x] Correct evidence returned
- [x] Official stored source returned

### Result

`PASS`

---

## D2 — Case and spacing normalization

### Queries

`comp1110`

`comp 1110`

### Expected

Both resolve to the same logical course identity as `COMP1110`.

### Evidence

Result 1: `comp1110` -> exact route -> `courses:course:COMP1110_2026` -> `ok`

Result 2: `comp 1110` -> exact route -> `courses:course:COMP1110_2026` -> `ok`

Both plans reported `semantic_allowed = False`.

### Checks

- [x] Lowercase form normalized
- [x] Spaced form normalized
- [x] Same logical entity returned
- [x] No semantic nearest-match used for identity

### Result

`PASS`

---

## D3 — Explicit academic year

### Query

Use an explicit known year, including:

`COMP1110 2026`

### Expected

- only the requested year is returned
- requested year is not silently changed

### Evidence

API status: `ok`

record_id: `courses:course:COMP1110_2026`

academic year: `2026`

source URL: `https://programsandcourses.anu.edu.au/2026/course/comp1110`

The explicit-year request stayed on the deterministic exact route.

### Checks

- [x] Explicit year preserved
- [x] Correct entity version returned
- [x] No silent year inference

### Result

`PASS`

---

## D4 — Explicit unavailable year

### Query

Use an academic year not present in the bounded dataset.

### Expected

- no fallback to 2026 or another available year
- controlled insufficient-evidence/clarification behaviour

### Evidence

Query: `COMP1110 2025`

API status: `insufficient_evidence`

answer: `I could not find stored evidence matching all requested constraints.`

sources: `[]`

The planner kept the exact route and did not silently fall back to the available 2026 record.

### Checks

- [x] Requested unavailable year is respected
- [x] Another year is not silently substituted
- [x] No fabricated source

### Result

`PASS`

---

## D5 — Multi-year ambiguity

### Setup

Use a course with multiple stored academic-year records.

### Query

Ask for the course without specifying year.

### Expected

`needs_clarification`

or equivalent frozen-contract clarification behaviour.

### Evidence

Query: `COMP1100`

available years: `2026`, `2027`

API status: `needs_clarification`

clarification:
- `courses:course:COMP1100_2026`
- `courses:course:COMP1100_2027`

Gemini calls: `0`

The bounded live Day 5 smoke is 2026-only, so this behavioural test uses Carmen's committed schema-v1 Day 5 multi-year fixture. No live multi-year claim is made.

### Checks

- [x] Multiple years detected
- [x] No arbitrary year chosen
- [x] Clarification is controlled
- [x] Gemini does not choose the year

### Result

`PASS`

---

## D6 — Course name lookup

### Query

Use an unambiguous course title from the bounded dataset.

### Expected

- deterministic name/metadata route where unambiguous
- correct course entity
- correct official source

### Evidence

Query: `Structured Programming`

retrieval route: `name`

record_id: `courses:course:COMP1110_2026`

source URL: `https://programsandcourses.anu.edu.au/2026/course/comp1110`

The title resolved deterministically with `semantic_allowed = False`.

### Checks

- [x] Correct course resolved
- [x] Deterministic route used when possible
- [x] Source remains stored/official

### Result

`PASS`

---

## D7 — Exact program code

### Query

Use a real program code from Will's bounded dataset.

### Expected

- deterministic exact program-code route
- no vector identity selection
- correct program record
- official source

### Evidence

Program code: `BACCT`

record_id: `courses:program:BACCT_2026`

retrieval route: `exact`

source URL: `https://programsandcourses.anu.edu.au/2026/program/bacct`

This record came from Will's bounded live Day 5 catalogue output.

### Checks

- [x] Program code resolves deterministically
- [x] Correct entity type returned
- [x] No semantic identity override
- [x] Official stored source returned

### Result

`PASS`

---

## D8 — Semantic course description

### Query

Use a natural descriptive question that does not contain an exact course/program identifier and genuinely requires semantic retrieval.

### Expected

- deterministic routes checked first
- semantic/vector route used only because deterministic identity resolution is insufficient
- retrieval limited to approved stored records
- final Gemini answer grounded in retrieved evidence
- stored official source returned

### Evidence

Query: `Which course covers vulnerability research?`

retrieval route: `semantic`

retrieved records: `courses:course:COMP8703_2026`

similarity/evidence notes: deterministic identity/name resolution was insufficient, so the bounded local TF-IDF retrieval path selected the approved stored COMP8703 record. No provider-generated identity or URL was accepted.

answer: grounded stored excerpt for `Vulnerability Research and Exploit Mitigation`

source URL: `https://programsandcourses.anu.edu.au/2026/course/comp8703`

latency: `2.690 s` through Vite -> `/api/v1/ask` -> RAG -> real Gemini

### Checks

- [x] Semantic retrieval was genuinely needed
- [x] Search stayed inside approved stored records
- [x] Retrieved evidence supports the answer
- [x] Gemini added no unsupported facts
- [x] Source URL came from stored evidence

### Result

`PASS`

---

## D9 — Unknown exact identifier

### Query

Use a clearly non-existent course/program identifier.

### Expected

- no nearest-code substitution
- no semantic mapping to a similar identifier
- controlled evidence-safe response

### Evidence

Query: `ABCD9999`

API status: `insufficient_evidence`

answer: `I could not find stored evidence matching all requested constraints.`

sources: `[]`

Route remained deterministic `exact`, `semantic_allowed = False`, and Gemini was not called.

### Checks

- [x] Exact unknown identifier recognised as unknown
- [x] Similar course/program not substituted
- [x] No fabricated entity
- [x] No fabricated source

### Result

`PASS`

---

## D10 — Insufficient evidence

### Query

Ask for a factual field genuinely absent from retrieved evidence.

### Expected

`insufficient_evidence`

### Evidence

Query: `What are the prerequisites for ARCH8046?`

Verified stored field: `metadata_json.prerequisites = null`

API status: `insufficient_evidence`

answer: controlled missing-evidence response

sources: stored official ARCH8046 source:
`https://programsandcourses.anu.edu.au/2026/course/arch8046`

Gemini calls: `0`

The source is not fabricated: it identifies the retrieved course whose requested factual field is absent. The gate does not require sources to be empty on an insufficient-evidence response.

### Checks

- [x] Missing evidence recognised
- [x] No guess produced
- [x] No unsupported Gemini fact
- [x] No fabricated source

### Result

`PASS`

---

## D11 — Source-link validation

### Scope

Validate representative course and program source cards/links through API and React.

### Checks

- [x] API source record matches retrieved record
- [x] API URL equals stored canonical URL
- [x] React renders safe source card
- [x] Source card opens official ANU page
- [x] Model text cannot create/replace source link

### Evidence

Course source:
`courses:course:COMP1110_2026`
-> `https://programsandcourses.anu.edu.au/2026/course/comp1110`

Program source:
`courses:program:BACCT_2026`
-> `https://programsandcourses.anu.edu.au/2026/program/bacct`

The BACCT API source object was compared field-for-field with the loaded stored record and matched exactly.

React source-card/safe-link behaviour remains covered by the independently reviewed Ben Day 5 lane and the merged frontend suite (`113/113` tests). External URL rendering continues to use the approved safe-link boundary; model text does not own API source URLs.

### Result

`PASS`

---

# Duplicate / Identity Gate

### Checks

- [x] `record_id` remains stable
- [x] `entity_id` remains stable
- [x] course/program identities are not mixed
- [x] academic year remains part of versioned identity
- [x] duplicate canonical URLs are detected
- [x] duplicate logical entities are detected
- [x] repeated bounded discovery does not multiply logical records
- [x] semantic retrieval never mutates identity

### Evidence

Integrated record set contained five validated real records: three courses and two programs.

- all `record_id` values unique
- all `entity_id` values unique
- all canonical URLs unique
- all URLs on the approved Programs & Courses host
- year remains encoded in versioned record/entity identity
- course and program namespaces remain separate

Will's merged scraper tests additionally cover duplicate discovery/persistence behaviour and repeated bounded runs.

### Result

`PASS`

---

# Deterministic-Before-Semantic Gate

### Required ordering

1. exact identifier
2. deterministic metadata/name filtering
3. semantic/vector retrieval only if deterministic retrieval is insufficient

### Checks

- [x] Exact code never depends on vector similarity
- [x] Exact program code never depends on vector similarity
- [x] Explicit year constrains retrieval before semantic search
- [x] Unknown exact code cannot fall through to similar-code semantic retrieval
- [x] Course-name deterministic resolution occurs before semantic fallback
- [x] Semantic fallback is observable/testable
- [x] Vector results cannot override explicit constraints

### Evidence

Observed routes:

- `COMP1110`, `comp1110`, `comp 1110`, `COMP1110 2026` -> `exact`
- `Structured Programming` -> `name`
- `BACCT` -> `exact`
- `ABCD9999` -> `exact` and abstain
- descriptive vulnerability query -> `semantic`

Exact/name routes reported `semantic_allowed = False`. The semantic route selected the real stored `COMP8703_2026` record only after deterministic resolution was insufficient.

### Result

`PASS`

---

# Grounding and Provenance Gate

### Checks

- [x] Retrieval remains factual authority
- [x] Gemini receives approved retrieved evidence
- [x] Gemini does not create entity identity
- [x] Gemini does not create source URLs
- [x] Final answer is supported by retrieved records
- [x] Unsupported facts abstain
- [x] Sources are programmatically attached
- [x] Official URLs remain canonical stored URLs
- [x] Day 4 prompt-injection protections remain intact

### Evidence

Real Gemini exact and semantic integration both returned facts and source URLs from retrieved stored records.

The real exact response preserved the COMP1110 prerequisites exactly:
`COMP1100 OR COMP1130 OR COMP1730`.

The real semantic response used stored `COMP8703_2026`.

Missing supported evidence abstained before Gemini. API source objects remained RAG-owned and programmatically attached. Day 4 prompt-injection and strict-output protections remain covered by the merged RAG suite.

### Result

`PASS`

---

# API Contract Gate

Frozen `/api/v1/ask` response fields:

- `status`
- `answer`
- `items`
- `sources`
- `clarification`
- `request_id`

### Checks

- [x] All six fields remain required
- [x] Status enum preserved
- [x] App and RAG remain synchronised
- [x] No hidden dependency on undocumented fields
- [x] Clarification route remains contract-shaped
- [x] Semantic route uses same public contract
- [x] No shared contract drift introduced

### Evidence

Every tested Day 5 response contained exactly the frozen six fields:

- `status`
- `answer`
- `items`
- `sources`
- `clarification`
- `request_id`

The exact, semantic, insufficient-evidence and needs-clarification paths all used the same public response shape. Real requests successfully traversed the merged frontend dev proxy to the merged RAG service.

### Result

`PASS`

---

# Courses UI Gate

### Checks

- [x] Courses resource page works
- [x] It is not a second chatbot
- [x] Single AskANU chat architecture preserved
- [x] Official navigation/resource links used
- [x] CTA returns to main AskANU experience
- [x] Mouse interaction works
- [x] Keyboard interaction works
- [x] Touch/mobile interaction works
- [x] Focus state visible
- [x] Responsive at 360px
- [x] Responsive at 390px
- [x] Responsive at 430px
- [x] Clear Chat restores empty-state suggestions
- [x] Existing safe source rendering preserved

### Evidence

Ben's merged Day 5 App lane independently passed all required Courses resource-page, single-chat, safe-link, mouse, keyboard, touch/mobile, focus, responsive and Clear Chat checks.

Merged frontend verification:
- `11` test files passed
- `113/113` tests passed
- production build passed

### Result

`PASS`

---

# Performance Observations

These are observations, not invented pass thresholds unless the team explicitly agrees on one.

## Exact deterministic query

Query:

`What are the prerequisites for COMP1110?`

Latency:

`2.970 s`

Notes:

Measured end-to-end through local Vite -> `/api/v1/ask` -> merged RAG -> real Gemini.

## Semantic/vector query

Query:

`Which course covers vulnerability research?`

Latency:

`2.690 s`

Notes:

The local bounded semantic route selected real `COMP8703_2026`, then real Gemini produced the grounded response.

## Gemini synthesis

Representative model:

configured Day 5 Gemini model (`gemini-3.5-flash-lite`)

Observed latency:

Representative full-request observations were `2.970 s` exact and `2.690 s` semantic.

Notes:

These are local end-to-end observations, not production SLOs.

---

# Cost Observations

Record actual available observations only.

Do not invent prices or token counts.

Embedding/vector cost observation:

Day 5 semantic fallback is the in-memory `LocalTfidfRetriever`; no external embedding/vector provider call was required by this gate.

Gemini/model cost observation:

Two representative real Gemini synthesis calls were made during the final App -> RAG integration run. The gate does not expose trustworthy billing/token-cost telemetry, so no monetary or token estimate is invented.

Number of model calls for deterministic exact query:

`1`

Number of model calls for semantic query:

`1`

Notes:

Cost evidence is recorded as actual provider-call count and retrieval architecture only.

---

# Automated Test Evidence

## Scraper

Commands:

`python -m pytest -q`

Results:

PASS

Tests passed:

`102/102`

Diff check:

PASS during independent Day 5 review.

Notes:

Merged scraper main:
`fa41a4d70e7d532081c4aa2b0640a7295097ad1e`

## RAG

Commands:

full `pytest` suite plus focused hybrid-planner verification during independent review

Results:

PASS — all executed tests passed; `1` skipped and `0` failures during the reviewed Day 5 lane.

Tests passed:

Full merged Day 5 implementation was independently verified before squash merge.

Diff check:

PASS during independent review.

Notes:

Merged RAG main:
`d0abeefb2150bf442a93093471571ad3a3e585f0`

Final integration additionally exercised real exact and semantic HTTP requests against this merged commit.

## App

Commands:

`npm run test`

`npm run build`

Results:

PASS

Tests passed:

`113/113`

Build:

PASS

Diff check:

PASS during independent Day 5 review.

Notes:

Merged App main:
`94635cd5822ffc5e25d369357cec206b8bae54fb`

---

# Defects Found

## P0 — Release blocker

None recorded yet.

## P1 — Important

None recorded yet.

## P2 — Non-blocking

None recorded yet.

---

# Carry-over

- Production deployment must provide SPA fallback/history routing so a fresh request to `/courses` serves the frontend entry point.
- The bounded Day 5 live catalogue smoke is 2026-only. Multi-year planner behaviour is verified with the committed schema-v1 fixture; broader live multi-year catalogue breadth remains later work.

---

# Final Course Baseline Gate

## Implementation lanes

- [x] Will bounded discovery — PASS
- [x] Carmen hybrid retrieval — PASS
- [x] Ben Courses UI — PASS

## Golden tests

- [x] D1 Exact course code — PASS
- [x] D2 Case/spacing normalization — PASS
- [x] D3 Explicit year — PASS
- [x] D4 Unavailable year — PASS
- [x] D5 Multi-year ambiguity — PASS
- [x] D6 Course-name lookup — PASS
- [x] D7 Exact program code — PASS
- [x] D8 Semantic description — PASS
- [x] D9 Unknown exact identifier — PASS
- [x] D10 Insufficient evidence — PASS
- [x] D11 Source-link validation — PASS

## Cross-cutting gates

- [x] Duplicate/identity safety — PASS
- [x] Deterministic-before-semantic routing — PASS
- [x] Grounding/provenance — PASS
- [x] API contract — PASS
- [x] Courses UI — PASS
- [x] Representative latency recorded
- [x] Representative cost observation recorded
- [x] No unapproved shared schema expansion
- [x] No P0/P1 blocker remains

## Final decision

`PASS`

Allowed values:

- `PASS`
- `BLOCKED`

## Decision rationale

Day 5 PASS.

All three implementation lanes are merged and independently reviewed.

The final integration gate proved the required end-to-end course-domain baseline:

- bounded real multi-course/program discovery with stable schema-v1 identities
- duplicate/identity and approved-source provenance checks
- deterministic exact, year, program-code and title routing before semantic fallback
- explicit unavailable-year abstention and controlled multi-year clarification
- real semantic fallback over approved stored records
- grounded real Gemini synthesis for both exact and semantic requests
- frozen six-field `/api/v1/ask` contract through the merged App -> RAG path
- stored official source URLs remain programmatically authoritative
- Courses resource UI and single-chat architecture remain intact

D10 is PASS even though its `insufficient_evidence` response retains the stored course source: the requested field is absent, Gemini is not called, no factual guess is produced, and the attached source is the genuine retrieved course record rather than a fabricated source.

The only recorded carry-overs are non-blocking deployment/history fallback work and broader future live multi-year catalogue breadth.

---

# End-of-Day Requirement

Courses may become the template for later AskANU domains only if the integrated system proves:

bounded multi-course/program discovery
→ stable identities and deduplication
→ deterministic exact/metadata routing
→ bounded semantic fallback
→ grounded Gemini synthesis
→ frozen API contract
→ safe Courses UI
→ official stored ANU source provenance

Do not mark Day 5 `PASS` merely because individual PRs merge.
