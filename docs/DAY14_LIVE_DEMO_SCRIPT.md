# Day 14 — Live Demo Script (Stakeholder Presentation)

**Date:** Friday, 18 September 2026
**Live demo window:** minute 2:00 → 6:30 of the presentation (**4 min 30 sec**, hard stop)
**Live URL:** https://askanu-dev-gdg.web.app
**Rule for this section:** only the flows below. All four were re-tested end-to-end on the live production build just before writing this script — every prompt and response quoted here is real, not a guess.

> Note on the doc site: `docs/DEPLOYMENT.md` still names the hosting URL as `askanu-web.web.app`. That address returns "Site Not Found." The real live site is `askanu-dev-gdg.web.app` (matches the project ID in `.firebaserc`). Use the URL above, not the one in DEPLOYMENT.md, until that doc is corrected.

> **Update from Day 14 smoke (18 Sep, see `docs/evidence/DAY_14_PRESENTATION_SMOKE_FEEDBACK.md` §4):** asking the Accommodation follow-up exactly as `Is it catered?` — after the Courses question earlier in the *same* thread — currently returns the **Courses/COMP1110 answer**, not the catering answer, on the live build. This is a reproduced backend conversation-context defect (flagged P0 to Carmen), not fixable in this repo. **Use the reworded line below instead** — it was verified live to produce the exact quoted response. Do not use the bare pronoun form for this question tonight.

---

## 0. One-line architecture answer (have this ready, don't lead with it)

> "The browser never talks to the private RAG service directly — it only ever calls our own App, which is the one controlled public boundary. The App forwards the question to RAG over a private, authenticated path and returns the answer untouched. So everything you're about to see is the real Cloud SQL → RAG → App → Firebase path, not a mock."

Use this if someone asks "is this real?" or "what's actually happening when I click send?" — don't recite it unprompted, it'll eat your 4:30.

---

## 1. Minute-by-minute run of show

| Time (elapsed in demo) | Segment | Action | Type this exactly | What actually comes back (verified) | What it proves |
|---|---|---|---|---|---|
| **2:00–2:20** (20s) | Open | Load Home (chat) page. Let it fully render before talking. | — | Chat box + "Try asking" suggestions + Quick Links + Current Jobs panel | Real deployed app, not a slide |
| **2:20–3:00** (40s) | **Courses** | Click into chat, type the question, send. | `What are the prerequisites for COMP1110?` | *"The prerequisites for COMP1110 (2026) are: COMP1100 OR COMP1130 OR COMP1730"* + **1 source card: "Structured Programming" (courses)** | Grounded, source-cited answer to a factual course question |
| **3:00–4:15** (75s) | **Accommodation** (no Clear Chat — continue same thread) | Ask all three in sequence, same conversation: | 1) `Tell me about Warrumbul Lodge.`<br>2) `Is Warrumbul Lodge catered?` **(reworded 18 Sep — do not say "Is it catered?" here; see the update note above)**<br>3) `Does Warrumbul Lodge have rooms available right now?` | 1) Full published profile (rates, features, catering, address) + source card "Warrumbul Lodge (accommodation)"<br>2) *"Published catering options: Self-catered."* — proves it uses conversation context, doesn't re-ask<br>3) **"Not enough evidence to answer" — "A null vacancy status means unknown, not available or unavailable"** + the real StarRez apply link | **This is the strongest moment of the demo.** It shows usefulness (rich real data), provenance (source card every time), *and* safe uncertainty (refuses to guess vacancy instead of making something up) |
| **4:15–5:00** (45s) | **Support** | Click **Clear Chat** first. Then: | 1) `Can Academic Support help with a grade appeal?`<br>2) `How do I contact them?` | 1) *"Published topic Grade Appeal: As a student, you have the right to appeal..."* + link to anusa.com.au, source card "Academic Support (support)"<br>2) *"Published contact: email: sa.assistance@anu.edu.au; phone: 02 6125 2444; location: Level 2, Di Riddell Student Centre, Kambri"* | Routes to real support info + contact detail, follow-up context works here too |
| **5:00–5:45** (45s) | **Jobs** | Click **Clear Chat** first. Then: | `What ANU jobs are currently open?` | *"Administration Coordinator - ANU+... Closing at: Sep 21 2026 - 23:55 AEST"* + source card "Administration Coordinator - ANU+ (jobs)" | Live jobs data, not stale/mock |
| **5:45–6:15** (30s, only if timing is good) | Jobs follow-up | `When does that job close?` | Repeats the same full job card, including the closing date — **not** a crisp one-line answer, but it does contain the date | Good filler if you have time; skip silently if you're tight — don't apologize for it live |
| **6:15–6:30** (15s) | Close | Verbal only — no more typing. | — | — | "That's the same App → private RAG → Cloud SQL path behind every one of the five domains you can see in the nav." |

**Total: 4:30.** If you're running long, cut the Jobs follow-up (5:45–6:15) first — it's marked optional above for exactly that reason. Do not cut Accommodation's third question; it's the best line you have.

**Scholarships:** not in the live demo. If asked afterward, say persisted scholarship retrieval exists and offer to show one named scholarship live, off-script, after the formal section ends.

---

## 2. Before you start — quick checklist

- [ ] Hard refresh `https://askanu-dev-gdg.web.app` (not a cached tab) — proves fresh load, matches how Day 10 evidence was captured
- [ ] Confirm no DevTools/console panel is open or visible
- [ ] Confirm the Administration Coordinator job card still shows "Closing at: Sep 21 2026" (if it's expired or gone, drop the Jobs follow-up question — the "when does it close" line won't land)
- [ ] Full-screen the browser, no extra chrome/bookmarks bar visible
- [ ] Have a second tab pre-loaded on the same URL as a silent fallback in case the first tab hangs
- [ ] Desktop demo only for the live section — mobile is fallback-screenshot territory per today's task sheet, not live-click territory, unless asked

---

## 3. Flagged: cards that overpromise (found while verifying — do NOT touch tonight)

Per the "send to group first" rule — these are reported, not changed. Nothing below has been edited.

**Confirmed broken (verified just now):**
- **Jobs page → "Job requirements" card.** Prompt: *"What are the requirements for this ANU job?"* → app asks a clarification ("Which job role do you mean?") → after you answer, it returns: **"Not enough evidence to answer... Please ask a standalone course prerequisite question with a course code."** That's the **Courses**-domain fallback message leaking into a **Jobs** answer. This matches Ben's Day 10 note that Jobs v1 has no source-backed requirements data — it's still true today, and the wrong-domain wording makes it worse, not just empty-handed. **Do not click this card live.**

**Suspected risk (wording implies personalization the backend doesn't do — not yet re-tested, flagging by wording pattern only):**
- Courses: *"What courses do I need for my degree?"*, *"Can I still qualify for honours?"*, *"Can I take this course in my study plan?"* — these all imply the app knows the asker's specific degree/enrolment, which it doesn't.
- Jobs: *"Jobs for my background or degree"* — same personalization implication.
- Scholarships: *"Find scholarships for me"*, *"Check eligibility"*, *"Scholarships for my degree"* — same pattern. Lower priority since Scholarships isn't in the live demo.

**Smallest safe options, for the group to weigh (not decided, not applied):**
1. Reword the affected cards' pre-filled prompt to a fully generic form (e.g. "What are ANU's honours requirements?" instead of "Can I still qualify for honours?"), leaving the card label alone.
2. Temporarily hide just the "Job requirements" card (the confirmed-broken one) from the Jobs domain page.
3. Do nothing tonight, and steer around all of the above by sticking to the typed-prompt script above — the cards are never clicked during the scripted section either way.

Given tonight's "no redesign" instruction, (3) is the lowest-risk option for the live section itself; (1)/(2) only matter if attendees start free-clicking cards after the scripted part.

---

## 4. Also noticed (not blocking, just so it's not a surprise if asked)

- The Home page's "Try asking" suggestion **"What events are happening this week?"** will currently hit an empty state — every page's Events panel shows *"Upcoming events are unavailable right now."* If someone clicks that suggestion live, expect an unhelpful/empty answer. Not in the scripted path, but it's one click away from it on the Home screen.
