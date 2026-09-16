# V6 Wed 16 Sep evidence — Accommodation + Support guided launchers + five-domain regression

**Repo:** `askanu-app` · **Owner:** Ben · **Branch:** `ben/day12-accomodation`, PR #34 · continues from HEAD `b46ef1f`
**Date:** Wednesday 16 September 2026 — V6 Day 12; alignment pass same day, after Qasim's PR #34 review
**Deliverable:** Ship Accommodation and Support as guided-domain launchers through the existing `DomainLauncher` shared component (config + route + nav entry, not a new page framework), and re-run the five-domain (Courses/Scholarships/Jobs/Accommodation/Support) UX regression. This revision also folds in Qasim's PR #34 review: align dev-fixture identity to the now-frozen production contract, soften Support copy that overclaimed coverage, and bring `SUPPORT_DOMAIN` into the shared regression matrix symmetrically with the other four domains.

No CI is attached to this branch (none exists in the repo yet). Numbers below are real `npm test`/`npm run build` output and real DOM measurements taken through the Browser pane's CDP `resize_window`, per the convention in `DAY_09`/`DAY_10`/`DAY_11B` evidence.

Environment: Node v24.12.0, npm 11.6.2, Vite 7.3.6, Vitest 3.2.7.

---

## 0. Summary

| | |
|---|---|
| New config | `ACCOMMODATION_DOMAIN`, `SUPPORT_DOMAIN` in `frontend/src/domains/domainConfig.ts` (4 guided-intent cards each) |
| New pages/routes | `AccommodationPage.tsx` → `/accommodation`, `SupportPage.tsx` → `/support` (`App.tsx`) |
| Nav | `DomainNav.tsx`: Accommodation and Support Services now link; only Events stays disabled |
| New fixtures | `mocks/askResponses.ts` + `dev/mockTransport.ts`: `ok`/`needs_clarification`/`partial` × {accommodation, support} (6 fixtures) |
| Tests — new | `tests/accommodationPage.test.tsx` (16), `tests/supportPage.test.tsx` (17) |
| Tests — extended | `tests/domainLauncher.test.tsx` (+Support Services in the shared config table — all five domains now covered symmetrically; banned-wording and broad-coverage-claim guards applied to all configs), `tests/navigation.test.tsx` (+7: Accommodation/Support routing, cross-domain session survival, Clear Chat after visiting both, Support nav reachable after a backend error) |
| Identity alignment (PR #34 review) | `mocks/askResponses.ts` fixtures updated to the frozen production shape: Accommodation `source_id = accommodation_anu_study`, `record_id = accommodation:residence:<slug>`; Support `source_id = support_anusa_student_assistance`, `record_id = support:support_service:<slug>`. Each pinned by a dedicated "mock sources match the frozen production identity shape" test, mirroring the existing Jobs v1 pattern |
| Support wording alignment (PR #34 review) | Intro/card copy no longer implies broad indexed ANU-and-ANUSA coverage (stored universe is the six ANUSA Student Assistance categories only) — asserted by test |
| Runtime dependencies added | **0** |
| Backend calls added | **0** — both domains use the existing `/api/v1/ask` path only; no new endpoint |

---

## 1. Contract fidelity and wording constraints

Neither domain adds a request-time list endpoint (unlike Jobs/Events); both route every guided question through the existing `/api/v1/ask` and render the frozen status enum (`ok`, `partial`, `needs_clarification`, `insufficient_evidence`, `off_topic`, `error`) exactly as the shared `StatusNotice`/`AssistantTurn` components already do for Courses/Scholarships/Jobs. No App code change was needed to `askApi.ts`, `askTransport.ts` or `server/`.

Card copy constraints (asserted by test, not just by convention):
- **Accommodation** never states a residence name, price, feature or eligibility result, and never implies a live vacancy/room-availability check. `tests/domainLauncher.test.tsx` and `tests/accommodationPage.test.tsx` assert no `vacan(t|cy)` / `room(s)? available` text anywhere in the Recommended Questions region or the launcher column.
- **Support** never states a hotline number, opening hours, a "24/7" claim or a guaranteed response time. `tests/supportPage.test.tsx` asserts no `24/7|hotline|guaranteed response` text, no clock-time pattern (`\d{1,2}(:\d{2})?\s?(am|pm)`), and no phone-number-shaped pattern anywhere in the launcher column. Following Qasim's PR #34 review, Support copy also no longer reads as promising broader indexed ANU-and-ANUSA coverage than is actually stored: the intro line changed from "Get help finding the right ANU support service through AskANU" to "Get help finding the right support option through AskANU", and the first card's description from "Find the ANU or ANUSA service that matches what you need" to "Find the support option that matches what you need" — the approved ANU wellbeing pages stay visible as official navigation resources, just not framed as indexed entities. Asserted by a dedicated test (`does not claim broader indexed ANU-and-ANUSA coverage than is stored`) plus a shared guard in `domainLauncher.test.tsx` (no domain's copy may say "ANU or ANUSA").

**Record identity (frozen cross-repo, PR #34 review):** dev fixtures now carry the same structural shape production will send. Accommodation: `source_id = accommodation_anu_study`, `entity_type = residence`, `record_id = accommodation:residence:<slug>`. Support: `source_id = support_anusa_student_assistance`, `entity_type = support_service`, `record_id = support:support_service:<slug>`. Titles, slugs and URLs stay obvious dev-only placeholders (`example.invalid`, "Placeholder residence record title", etc.) for bundle-safety testing — only the structural shape had to match. The App still treats every field as opaque backend data; it does not construct, derive or validate either id.

## 2. Official resources — verified live, Day 12

All URLs below were opened in-browser today and returned content (HTTP 200 via final resolved URL), reached from each site's own navigation, not guessed:

- Accommodation, from `study.anu.edu.au` → "Accommodation": `/accommodation`, `/accommodation/compare-residences` ("Compare" tile), `/accommodation/our-residences` ("Our residences" tile), `/accommodation/application-advice` ("Application advice" tile).
- Support, from two official navigations: `anusa.com.au` → "Student Assistance" → `anusa.com.au/student-assistance/`; and `anu.edu.au` → "Current students" → "Health, safety & wellbeing" → `anu.edu.au/students/health-safety-wellbeing`, its "Getting help at ANU" child page, and that page's "Support - wellbeing, medical, academic" child page.

Both domains render these as `target="_blank" rel="noopener…"` `https://` links only (`isSafeHttpUrl`), asserted per-domain in `accommodationPage.test.tsx` / `supportPage.test.tsx` with an explicit allowed-host list (`study.anu.edu.au` for Accommodation; `anusa.com.au` and `www.anu.edu.au` for Support). Following Qasim's PR #34 review, `domainLauncher.test.tsx`'s shared config table now also covers Support Services symmetrically with the other four domains: its official-resource host check was broadened from a blanket `*.anu.edu.au`-suffix rule to `hostname === 'anusa.com.au' || hostname.endsWith('.anu.edu.au')`, so the one shared assertion stays meaningful and applies to all five domains rather than excluding Support.

## 3. Five-domain regression — real DOM measurements

Desktop 1280×720, dev server, all five domains, read via `document.documentElement.scrollWidth`/`clientWidth` and a card-region query:

| Domain | h1 | cards | scrollWidth vs clientWidth |
|---|---|---|---|
| Courses | Courses | 4 | 1280 / 1280 |
| Scholarships | Scholarships | 4 | 1280 / 1280 |
| Jobs | Jobs | 4 | 1280 / 1280 |
| Accommodation | Accommodation | 4 | 1280 / 1280 |
| Support Services | Support Services | 4 | 1280 / 1280 |

Mobile, same five domains, `scrollWidth` vs `clientWidth` at each width (no domain overflows at any width):

| Width | Courses | Scholarships | Jobs | Accommodation | Support |
|---|---|---|---|---|---|
| 360 | 360/360 | 360/360 | 360/360 | 360/360 | 360/360 |
| 390 | 390/390 | 390/390 | 390/390 | 390/390 | 390/390 |
| 430 | 430/430 | 430/430 | 430/430 | 430/430 | 430/430 |

Touch targets at 360px: the smallest recommended-question card button on any of the five domains measured **101.4 px** tall (Courses' first card measured 121.4 px) — both well above the 44 px minimum.

Colour contrast (computed styles, not assumed), shared card component at 360px, so identical across all five domains: card title `rgb(42,33,24)` on `rgb(255,255,255)` = **15.8:1**; card description `rgb(92,81,66)` on white = **7.75:1**. Both clear WCAG AA (4.5:1) and AAA (7:1) for normal text.

## 4. Multi-turn flow — clarification → answer → sources, with reset in between

Automated in `tests/accommodationPage.test.tsx` and `tests/supportPage.test.tsx` ("renders clarification naturally and supports a session follow-up"): card click → `needs_clarification` fixture → read-only option list rendered in order → user answers "first" in the same composer → `ok` fixture → answer renders with its domain-tagged source card → both turns of the session still visible (nothing reset without an explicit Clear Chat).

`tests/navigation.test.tsx` separately proves the session survives a **round trip through both new domains and back to Home** (question asked → visit Accommodation → visit Support → return Home → original answer and its Sources region still present), and that **Clear Chat still works** after that same round trip.

## 5. Backend-unavailable / error handling — no invented fallback content

Both domains' `error` and `insufficient_evidence` flows are asserted to show the existing controlled `StatusNotice` (`role="alert"` for error) with **zero** sources rendered, and to add no residence/support-service text of their own. `tests/navigation.test.tsx` additionally proves that even after a Support `error` turn, the **Explore → Support Services** nav link is still present and unaffected — the one safe way back to the verified official pages, added without inventing a fallback link or contact detail inside the chat itself.

## 6. Automated tests and build

```
frontend npm run test    → 18 files, 243 passed
frontend npm run build   → tsc --noEmit OK · vite build ✓ 111 modules
         dist/assets/index-*.js  274.06 kB │ gzip 87.15 kB
```

Production bundle scan (`grep -c` on `dist/assets/index-*.js`): `Placeholder` 0 · `example.invalid` 0 · `Mock` 0 · `accommodation_anu_study` 0 · `support_anusa_student_assistance` 0 — the new fixtures in `mocks/askResponses.ts` and their registration in `dev/mockTransport.ts`, including the now-frozen identity strings, are dev-only and are dropped from the production bundle, same as every earlier domain's fixtures.

Existing Courses/Scholarships/Jobs suites (`coursesPage.test.tsx`, `jobsPage.test.tsx`, `scholarshipsPage.test.tsx`) remain green, unmodified.

## 7. Remaining gaps — reported, not worked around

1. **No list endpoint for either domain**, unlike Jobs (`/api/v1/jobs/current`) or Events (`/api/v1/events/upcoming`). This matches the V3/V6 product scope as understood today — Accommodation/Support are guided-question launchers into `/api/v1/ask` only — but if a future decision adds one (e.g. a "compare residences" structured result), it needs the same `DECISION_LOG.md` treatment Day 10/11 gave the jobs list shape.
2. **Costs/features and application-process facts are entirely backend-dependent.** The App has no field to render a residence's price or an application deadline even when the backend has one — whatever the RAG service returns in `answer`/`sources` is all a student sees. This is correct per "no hard-coded domain answers," but is worth flagging as a real functional gap until the RAG side has broad Accommodation/Support coverage (V6's stated ≥99% entity-coverage bar for "Domain Complete").
3. **Stored Support coverage today is the six top-level ANUSA Student Assistance categories only** (confirmed by Qasim in the PR #34 review), not the full set of ANU wellbeing pages linked as official resources. The launcher copy was corrected this pass to stop implying broader indexed coverage (§1); this line records the underlying data-coverage fact so a future UI change doesn't reintroduce an overclaim once the ANU wellbeing pages *are* indexed, without checking first.
4. **Screenshot PNGs are not committed to this evidence file.** Qasim's PR #34 review confirmed the DOM/mobile/contrast measurements in §3 are sufficient evidence and PNGs are not required unless easy to add. Desktop and mobile (360px) screenshots for Accommodation and Support were visually reviewed live in-browser during this work but not saved as files.

**Resolved this pass (was listed here before Qasim's PR #34 review):** the record-identity shape for Accommodation/Support is now the frozen production contract (§1), not a placeholder; PR #34 is open and this file no longer needs to say otherwise.

No hard-coded residence facts, prices, availability, hotlines, hours or emergency-coverage claims were added anywhere in production code.
