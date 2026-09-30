"""R6-B / R6-C re-verification against a live RAG (PM matrix, 30 Sep).

Usage:  RAG_URL=http://127.0.0.1:8098/api/v1/ask python r6_reverify.py out.json [label]

App-faithful: each case is a fresh conversation, the request carries exactly
what the App sends (empty history/state on turn 1), and nothing here interprets
meaning — every check reads RAG's own `conversation_state.constraints` and
`items`. The App ownership rule stands: no location parser, no employment-type
parser, no stop-word list. This script only observes.
"""

import json
import os
import sys
import urllib.request

URL = os.environ.get("RAG_URL", "http://127.0.0.1:8098/api/v1/ask")


def ask(question):
    body = {"question": question, "history": [], "conversation_state": {}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def constraints(data):
    items = (data.get("conversation_state") or {}).get("constraints", {}).get("items", [])
    return [(c["semantic_type"], c["value"]) for c in items]


rows = []


def record(group, question, ok, why, data):
    rows.append(
        {
            "group": group,
            "question": question,
            "pass": ok,
            "why": why,
            "status": data.get("status"),
            "answer_state": data.get("answer_state"),
            "cards": len(data.get("items", [])),
            "constraints": constraints(data),
            "answer_head": data.get("answer", "")[:160],
        }
    )
    print(("PASS" if ok else "FAIL"), group, "|", question, "|", why, "|", constraints(data), "|", len(data.get("items", [])), "cards")


CANBERRA_JOBS = [
    "What jobs are available at ANU in Canberra?",
    "What jobs are available in Canberra?",
    "Any ANU jobs in Canberra?",
    "Show me jobs at ANU in Canberra",
    "Are there jobs around Canberra?",
]
for q in CANBERRA_JOBS:
    d = ask(q)
    loc = [v for t, v in constraints(d) if t == "location"]
    ok = d["status"] == "ok" and len(d["items"]) > 0 and loc == ["canberra"]
    why = "location=canberra, cards returned" if ok else f"location={loc}"
    record("R6-B", q, ok, why, d)
    text = json.dumps(constraints(d)).lower()
    record("R6-B", q + " [no 'anu in canberra']", "anu in canberra" not in text, "no institutional prefix in constraint", d)
    record("R6-B", q + " [caveat kept]", d.get("answer_state") == "PARTIAL" and "incomplete" in d.get("answer", ""), "population-incomplete caveat still present", d)

for q in ["What jobs are available at ANU?", "Show me any jobs at ANU"]:
    d = ask(q)
    ok = d["status"] == "ok" and len(d["items"]) > 0 and not any(t == "location" for t, _ in constraints(d))
    record("R6-B control", q, ok, "non-Canberra control: cards, no location constraint", d)

FILLER = [
    "Are there any jobs in Canberra?",
    "Tell me about jobs in Canberra",
    "Do you know about jobs in Canberra?",
    "What about jobs in Canberra?",
    "Show me any jobs at ANU",
    "Do you have jobs in Canberra?",
    "Show me jobs",
]
for q in FILLER:
    d = ask(q)
    emp = [v for t, v in constraints(d) if t == "employment_type"]
    ok = d["status"] == "ok" and len(d["items"]) > 0 and emp == []
    record("R6-C", q, ok, f"employment_type={emp}", d)

for q, want in [("Any casual jobs in Canberra?", "casual"), ("Are there any full-time jobs in Canberra?", "full-time")]:
    d = ask(q)
    emp = [v.lower() for t, v in constraints(d) if t == "employment_type"]
    honoured = emp == [want] or emp == [want.replace("-", " ")]
    stray = [v for v in emp if v in ("any", "about")]
    ok = honoured and not stray
    record("R6-C explicit", q, ok, f"employment_type={emp}; cards={len(d['items'])} (kept visible, not dropped)", d)

# Unsupported values must stay visible, not silently vanish.
for q in ["Any jobs in Antarctica?", "Are there any casual jobs in Sydney?"]:
    d = ask(q)
    visible = bool(constraints(d)) and d["status"] in ("ok", "insufficient_evidence")
    record("R6 unsupported stays visible", q, visible and len(d["items"]) == 0, "constraint kept, no unconstrained list returned", d)

passed = sum(r["pass"] for r in rows)
print(f"\n{passed}/{len(rows)} checks passed")
if len(sys.argv) > 1:
    json.dump({"rag_url": URL, "label": sys.argv[2] if len(sys.argv) > 2 else "", "passed": passed, "total": len(rows), "rows": rows}, open(sys.argv[1], "w"), indent=2)
