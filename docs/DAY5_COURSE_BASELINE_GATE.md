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

Commit reviewed:

Merge commit:

Result:

`PENDING`

### Required review evidence

- [ ] More than one course discovered
- [ ] More than one program discovered
- [ ] Development sample is explicitly bounded
- [ ] No uncontrolled crawl
- [ ] Academic year preserved
- [ ] Entity type preserved
- [ ] Canonical URLs preserved
- [ ] Stable logical IDs produced
- [ ] Duplicate canonical entities detected
- [ ] Duplicate logical entities detected
- [ ] Duplicate records not silently inserted
- [ ] Sanity counts available before broader write
- [ ] Suspicious empty/invalid discovery fails safely
- [ ] Repeated discovery produces stable logical results
- [ ] No unapproved source added
- [ ] No first-class major/minor/specialisation schema type added without approval
- [ ] Existing scraper/parser tests remain green
- [ ] New discovery tests pass
- [ ] `git diff --check` passes

### Sanity counts

Courses discovered:

Programs discovered:

Duplicates detected:

Invalid/skipped:

Sample limit:

Repeated-run result:

Notes:

---

## Carmen — RAG / Backend

Issue:

`askanu-rag#10` — Day 5 — Implement hybrid course and program query planning

PR:

Commit reviewed:

Merge commit:

Result:

`PENDING`

### Required review evidence

- [ ] Exact course code remains deterministic
- [ ] Exact program code is deterministic
- [ ] Case variation normalizes correctly
- [ ] Spacing variation normalizes correctly
- [ ] Explicit academic year preserved
- [ ] Explicit unavailable year does not fall back
- [ ] Multi-year ambiguity produces clarification
- [ ] Unambiguous course-name lookup works deterministically
- [ ] Unknown exact identifier never nearest-matches another identifier
- [ ] Semantic/vector retrieval only runs after deterministic routes are insufficient
- [ ] Vector retrieval is limited to approved stored records
- [ ] Vector retrieval cannot override explicit identity constraints
- [ ] Vector retrieval cannot override explicit year constraints
- [ ] Gemini remains grounded on retrieved evidence
- [ ] Source attachment remains programmatic
- [ ] Frozen `/api/v1/ask` contract remains unchanged
- [ ] Day 2–4 regression tests remain green
- [ ] New hybrid retrieval tests pass
- [ ] `git diff --check` passes

### Retrieval routing evidence

Exact code route:

Program code route:

Course-name route:

Semantic route:

Unknown-code route:

Multi-year route:

Notes:

---

## Ben — App / UI

Issue:

`askanu-app#14` — Day 5 — Build Courses resource page and final empty-state interaction

PR:

Commit reviewed:

Merge commit:

Result:

`PENDING`

### Required review evidence

- [ ] Courses resource page exists
- [ ] Main navigation opens Courses page
- [ ] Courses page is an information/resource hub, not another chatbot
- [ ] Official Programs & Courses links are used
- [ ] External links remain safe/canonical
- [ ] CTA returns/leads to the single AskANU chat
- [ ] Suggestion cards work with mouse
- [ ] Suggestion cards work with keyboard only
- [ ] Suggestion cards work with touch/mobile
- [ ] Visible keyboard focus state exists
- [ ] Empty suggestions disappear after first question
- [ ] Clear Chat restores empty state
- [ ] No horizontal scrolling at 360px
- [ ] No horizontal scrolling at 390px
- [ ] No horizontal scrolling at 430px
- [ ] Existing real API integration remains functional
- [ ] Existing source-card/security behaviour remains intact
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `git diff --check` passes

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

HTTP status:

API status:

request_id:

retrieval route:

record_id:

answer:

source URL:

latency:

### Checks

- [ ] Exact identifier used
- [ ] No vector identity substitution
- [ ] Correct stored entity returned
- [ ] Correct evidence returned
- [ ] Official stored source returned

### Result

`PENDING`

---

## D2 — Case and spacing normalization

### Queries

`comp1110`

`comp 1110`

### Expected

Both resolve to the same logical course identity as `COMP1110`.

### Evidence

Result 1:

Result 2:

### Checks

- [ ] Lowercase form normalized
- [ ] Spaced form normalized
- [ ] Same logical entity returned
- [ ] No semantic nearest-match used for identity

### Result

`PENDING`

---

## D3 — Explicit academic year

### Query

Use an explicit known year, including:

`COMP1110 2026`

### Expected

- only the requested year is returned
- requested year is not silently changed

### Evidence

API status:

record_id:

academic year:

source URL:

### Checks

- [ ] Explicit year preserved
- [ ] Correct entity version returned
- [ ] No silent year inference

### Result

`PENDING`

---

## D4 — Explicit unavailable year

### Query

Use an academic year not present in the bounded dataset.

### Expected

- no fallback to 2026 or another available year
- controlled insufficient-evidence/clarification behaviour

### Evidence

Query:

API status:

answer:

sources:

### Checks

- [ ] Requested unavailable year is respected
- [ ] Another year is not silently substituted
- [ ] No fabricated source

### Result

`PENDING`

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

Query:

available years:

API status:

clarification:

### Checks

- [ ] Multiple years detected
- [ ] No arbitrary year chosen
- [ ] Clarification is controlled
- [ ] Gemini does not choose the year

### Result

`PENDING`

---

## D6 — Course name lookup

### Query

Use an unambiguous course title from the bounded dataset.

### Expected

- deterministic name/metadata route where unambiguous
- correct course entity
- correct official source

### Evidence

Query:

retrieval route:

record_id:

source URL:

### Checks

- [ ] Correct course resolved
- [ ] Deterministic route used when possible
- [ ] Source remains stored/official

### Result

`PENDING`

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

Program code:

record_id:

retrieval route:

source URL:

### Checks

- [ ] Program code resolves deterministically
- [ ] Correct entity type returned
- [ ] No semantic identity override
- [ ] Official stored source returned

### Result

`PENDING`

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

Query:

retrieval route:

retrieved records:

similarity/evidence notes:

answer:

source URL:

latency:

### Checks

- [ ] Semantic retrieval was genuinely needed
- [ ] Search stayed inside approved stored records
- [ ] Retrieved evidence supports the answer
- [ ] Gemini added no unsupported facts
- [ ] Source URL came from stored evidence

### Result

`PENDING`

---

## D9 — Unknown exact identifier

### Query

Use a clearly non-existent course/program identifier.

### Expected

- no nearest-code substitution
- no semantic mapping to a similar identifier
- controlled evidence-safe response

### Evidence

Query:

API status:

answer:

sources:

### Checks

- [ ] Exact unknown identifier recognised as unknown
- [ ] Similar course/program not substituted
- [ ] No fabricated entity
- [ ] No fabricated source

### Result

`PENDING`

---

## D10 — Insufficient evidence

### Query

Ask for a factual field genuinely absent from retrieved evidence.

### Expected

`insufficient_evidence`

### Evidence

Query:

API status:

answer:

sources:

### Checks

- [ ] Missing evidence recognised
- [ ] No guess produced
- [ ] No unsupported Gemini fact
- [ ] No fabricated source

### Result

`PENDING`

---

## D11 — Source-link validation

### Scope

Validate representative course and program source cards/links through API and React.

### Checks

- [ ] API source record matches retrieved record
- [ ] API URL equals stored canonical URL
- [ ] React renders safe source card
- [ ] Source card opens official ANU page
- [ ] Model text cannot create/replace source link

### Evidence

Course source:

Program source:

Browser result:

### Result

`PENDING`

---

# Duplicate / Identity Gate

### Checks

- [ ] `record_id` remains stable
- [ ] `entity_id` remains stable
- [ ] course/program identities are not mixed
- [ ] academic year remains part of versioned identity
- [ ] duplicate canonical URLs are detected
- [ ] duplicate logical entities are detected
- [ ] repeated bounded discovery does not multiply logical records
- [ ] semantic retrieval never mutates identity

### Result

`PENDING`

---

# Deterministic-Before-Semantic Gate

### Required ordering

1. exact identifier
2. deterministic metadata/name filtering
3. semantic/vector retrieval only if deterministic retrieval is insufficient

### Checks

- [ ] Exact code never depends on vector similarity
- [ ] Exact program code never depends on vector similarity
- [ ] Explicit year constrains retrieval before semantic search
- [ ] Unknown exact code cannot fall through to similar-code semantic retrieval
- [ ] Course-name deterministic resolution occurs before semantic fallback
- [ ] Semantic fallback is observable/testable
- [ ] Vector results cannot override explicit constraints

### Result

`PENDING`

---

# Grounding and Provenance Gate

### Checks

- [ ] Retrieval remains factual authority
- [ ] Gemini receives approved retrieved evidence
- [ ] Gemini does not create entity identity
- [ ] Gemini does not create source URLs
- [ ] Final answer is supported by retrieved records
- [ ] Unsupported facts abstain
- [ ] Sources are programmatically attached
- [ ] Official URLs remain canonical stored URLs
- [ ] Day 4 prompt-injection protections remain intact

### Result

`PENDING`

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

- [ ] All six fields remain required
- [ ] Status enum preserved
- [ ] App and RAG remain synchronised
- [ ] No hidden dependency on undocumented fields
- [ ] Clarification route remains contract-shaped
- [ ] Semantic route uses same public contract
- [ ] No shared contract drift introduced

### Result

`PENDING`

---

# Courses UI Gate

### Checks

- [ ] Courses resource page works
- [ ] It is not a second chatbot
- [ ] Single AskANU chat architecture preserved
- [ ] Official navigation/resource links used
- [ ] CTA returns to main AskANU experience
- [ ] Mouse interaction works
- [ ] Keyboard interaction works
- [ ] Touch/mobile interaction works
- [ ] Focus state visible
- [ ] Responsive at 360px
- [ ] Responsive at 390px
- [ ] Responsive at 430px
- [ ] Clear Chat restores empty-state suggestions
- [ ] Existing safe source rendering preserved

### Result

`PENDING`

---

# Performance Observations

These are observations, not invented pass thresholds unless the team explicitly agrees on one.

## Exact deterministic query

Query:

Latency:

Notes:

## Semantic/vector query

Query:

Latency:

Notes:

## Gemini synthesis

Representative model:

Observed latency:

Notes:

---

# Cost Observations

Record actual available observations only.

Do not invent prices or token counts.

Embedding/vector cost observation:

Gemini/model cost observation:

Number of model calls for deterministic exact query:

Number of model calls for semantic query:

Notes:

---

# Automated Test Evidence

## Scraper

Commands:

Results:

Tests passed:

Diff check:

Notes:

## RAG

Commands:

Results:

Tests passed:

Diff check:

Notes:

## App

Commands:

Results:

Tests passed:

Build:

Diff check:

Notes:

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

None recorded yet.

---

# Final Course Baseline Gate

## Implementation lanes

- [ ] Will bounded discovery — PASS
- [ ] Carmen hybrid retrieval — PASS
- [ ] Ben Courses UI — PASS

## Golden tests

- [ ] D1 Exact course code — PASS
- [ ] D2 Case/spacing normalization — PASS
- [ ] D3 Explicit year — PASS
- [ ] D4 Unavailable year — PASS
- [ ] D5 Multi-year ambiguity — PASS
- [ ] D6 Course-name lookup — PASS
- [ ] D7 Exact program code — PASS
- [ ] D8 Semantic description — PASS
- [ ] D9 Unknown exact identifier — PASS
- [ ] D10 Insufficient evidence — PASS
- [ ] D11 Source-link validation — PASS

## Cross-cutting gates

- [ ] Duplicate/identity safety — PASS
- [ ] Deterministic-before-semantic routing — PASS
- [ ] Grounding/provenance — PASS
- [ ] API contract — PASS
- [ ] Courses UI — PASS
- [ ] Representative latency recorded
- [ ] Representative cost observation recorded
- [ ] No unapproved shared schema expansion
- [ ] No P0/P1 blocker remains

## Final decision

`PENDING`

Allowed values:

- `PASS`
- `BLOCKED`

## Decision rationale

To be completed after Day 5 integration testing.

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
