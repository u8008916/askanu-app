"""V7 Day 7 RC re-verification: the full PM matrix, App-faithful, against a live RAG.

Usage:  RAG_URL=http://127.0.0.1:8000/api/v1/ask python rc_reverify.py out.json [label]

Companion to torture_rc.py (which is unchanged and is the 45-case gate). This adds the
broader per-defect matrix the PM asked for: every R1/R4 wording x domain x item, the full
R5 ordinal language x scenarios, R2 explicit overrides (ordinal-selected AND structured-
selected), R6 hard constraints, D7-A1 state preservation and the controlled-error family.

Same client contract as torture_rc.py: the opaque conversation_state is echoed from the last
authoritative response, history is the last 10 turns, and selected_result / result_page are
built from the rendered items. A controlled 4xx is *not* adopted by this client; the App does
adopt a RAG-authored envelope's state (PR #40), so A1 also reports what the App would hold.
"""

import copy
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("RAG_URL", "http://127.0.0.1:8000/api/v1/ask")
SCHOLAR_Q = "I'm an international Bachelor of Computing student. What scholarships might suit me?"
LISTS = {
    "accommodation": "Show me accommodation options",
    "scholarships": SCHOLAR_Q,
    "jobs": "What jobs are available at ANU?",
    "events": "What events are on at ANU today?",
}
rows = []


def raw(body):
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as err:
        text = err.read().decode()
        try:
            return err.code, json.loads(text)
        except ValueError:
            return err.code, {"_raw": text[:300]}


class Chat:
    def __init__(self):
        self.state, self.history, self.last = {}, [], None

    def ask(self, question, adopt_error=False, **extra):
        code, data = raw({"question": question, "history": self.history[-10:], "conversation_state": self.state, **extra})
        data["_http"] = code
        if code == 200 or adopt_error:
            if "conversation_state" in data:
                self.state = data["conversation_state"]
        if code == 200:
            n = len(self.history)
            self.history += [
                {"turn_id": f"t{n+1}", "role": "user", "content": question},
                {"turn_id": f"t{n+2}", "role": "assistant", "content": data["answer"]},
            ]
        self.last = data
        return data

    def select(self, question, index, response=None, **kw):
        item = (response or self.last)["items"][index]
        return self.ask(question, selected_result={k: item[k] for k in ("result_set_id", "canonical_id", "ordinal")}, **kw)

    def show_more(self, response=None):
        page = (response or self.last)["result_page"]
        return self.ask("Show more", result_page={"result_set_id": page["result_set_id"], "start_ordinal": page["next_ordinal"], "limit": 5})


def cids(r):
    return [i.get("canonical_id") for i in r.get("items", []) if i.get("canonical_id")]


def brief(r):
    return f"{r.get('_http')} {r.get('status')} {r.get('answer_state')} {[(i.get('canonical_id'), i.get('ordinal')) for i in r.get('items', [])]}"


def rec(group, case, ok, expected, r, note=""):
    rows.append({"group": group, "case": case, "pass": bool(ok), "expected": expected, "actual": brief(r) + (f" | {note}" if note else ""),
                 "answer": (r.get("answer") or r.get("_raw") or "")[:240]})


# ---------------------------------------------------------------- R1 / R4 (strict)
# Strict = status ok, exactly the selected record, result_set_id + ordinal retained on the item,
# state.selected_result unchanged, answer_state CONFIRMED (not PARTIAL/UNKNOWN).
FOLLOW = ["Tell me about it", "Tell me more about {t}", "Tell me about {t}"]
for domain, q in LISTS.items():
    for idx in range(min(3, 2 if domain == "accommodation" else 3)):
        for text in FOLLOW:
            c = Chat(); l = c.ask(q)
            it = l["items"][idx]
            r = c.select(text.format(t=it["title"]), idx, l)
            got = r.get("items", [])
            ok = (r["status"] == "ok" and cids(r) == [it["canonical_id"]] and got[0].get("result_set_id") == it["result_set_id"]
                  and got[0].get("ordinal") == it["ordinal"] and r.get("answer_state") == "CONFIRMED"
                  and (r["conversation_state"].get("selected_result") or {}).get("canonical_id") == it["canonical_id"])
            rec("R1/R4", f"{domain} #{idx+1} {it['title']!r}: select + {text.split('{')[0].strip() or text!r}{'<title>' if '{t}' in text else ''}", ok,
                f"ok/CONFIRMED, exactly {it['canonical_id']}, rs+ordinal retained", r, r["answer"][:70])

# ---------------------------------------------------------------- R2 explicit override
def override(group, case, setup, question, expect_id, forbid_ids, domain_note=""):
    c = Chat(); setup(c)
    r = c.ask(question)
    ids_ = cids(r)
    src_text = json.dumps(r.get("sources", []))
    leak = [f for f in forbid_ids if f in src_text or f in json.dumps(r.get("items", []))]
    rec(group, case, ids_ == [expect_id] and not leak, f"only {expect_id}; no {forbid_ids} in items/sources", r, f"leak={leak}" if leak else "")


def sel_by_ordinal(c):
    c.ask(SCHOLAR_Q); c.ask("Tell me about the second one")


def sel_structured(q, idx):
    def f(c):
        l = c.ask(q); c.select("Tell me about it", idx, l)
    return f


override("R2", "scholarship: ordinal-selected #2 -> 'Am I eligible for <Scholarship 8>?'", sel_by_ordinal,
         "Am I eligible for Day 5 International Computing Scholarship 8?", "day5-international-computing-8", ["day5-international-computing-2"])
override("R2", "scholarship: structured-selected #2 -> 'Am I eligible for <Scholarship 8>?'", sel_structured(SCHOLAR_Q, 1),
         "Am I eligible for Day 5 International Computing Scholarship 8?", "day5-international-computing-8", ["day5-international-computing-2"])
override("R2", "scholarship: structured-selected #2 -> 'Tell me about <Scholarship 8>'", sel_structured(SCHOLAR_Q, 1),
         "Tell me about Day 5 International Computing Scholarship 8", "day5-international-computing-8", ["day5-international-computing-2"])
override("R2", "scholarship: structured-selected #2 -> 'When does <Scholarship 3> close?'", sel_structured(SCHOLAR_Q, 1),
         "When does Day 5 International Computing Scholarship 3 close?", "day5-international-computing-3", ["day5-international-computing-2"])
override("R2", "events: structured-selected -> 'Tell me about Event 800005'", sel_structured(LISTS["events"], 1),
         "Tell me about Event 800005", "800005", ["800002"])
override("R2", "events: ordinal-selected #2 -> 'Tell me about Event 800005'", lambda c: (c.ask(LISTS["events"]), c.ask("Tell me about the second one")),
         "Tell me about Event 800005", "800005", ["800002"])
override("R2 ctrl", "jobs: structured-selected #2 -> 'Tell me about Software Engineer'", sel_structured(LISTS["jobs"], 1),
         "Tell me about Software Engineer", "700001", ["700002"])
override("R2", "accommodation: structured-selected Lodge -> 'Tell me about Day 6 Hall'", sel_structured(LISTS["accommodation"], 1),
         "Tell me about Day 6 Hall", "day6-hall", ["day6-lodge"])
# Carmen's cross-domain case: an explicit Course identity overriding a Scholarship click
c = Chat(); l = c.ask(SCHOLAR_Q); c.select("Tell me about it", 1, l)
r = c.ask("Tell me about COMP1110 in 2026")
rec("R2", "course: Scholarship click -> 'Tell me about COMP1110 in 2026'", cids(r) == ["COMP1110"], "only COMP1110", r)

# ---------------------------------------------------------------- R5 ordinal language
REFS = [("first", 1), ("the first one", 1), ("second", 2), ("the second one", 2), ("third", 3), ("the third one", 3), ("3rd", 3), ("fourth", 4), ("number 3", 3)]
WRAP = [("{}", "bare"), ("Tell me about {}", "tell-me-about")]


def ordinal_matrix(scenario, prep):
    for domain in ("scholarships", "jobs", "events"):
        for ref, n in REFS:
            for wrap, wname in WRAP:
                c = Chat(); order = prep(c, domain)
                r = c.ask(wrap.format(ref if wname == "bare" else ("the " + ref if not ref.startswith(("the", "number", "3")) else ref)))
                rec(f"R5 {scenario}", f"{domain}: {wname} {ref!r}", cids(r) == [order[n - 1]] and r.get("status") == "ok",
                    f"original ResultSet item {n} = {order[n-1]}", r)


def prep_fresh(c, domain):
    l = c.ask(LISTS[domain]); return [i["canonical_id"] for i in l["items"]]


def prep_after_select(c, domain):
    l = c.ask(LISTS[domain]); c.select("Tell me about it", 1, l); return [i["canonical_id"] for i in l["items"]]


def prep_after_chain(c, domain):
    l = c.ask(LISTS[domain]); c.ask("Tell me about the first one"); c.ask("Tell me about the second one"); return [i["canonical_id"] for i in l["items"]]


def prep_after_show_more(c, domain):
    l = c.ask(LISTS[domain]); c.show_more(l); return [i["canonical_id"] for i in l["items"]]


ordinal_matrix("fresh", prep_fresh)
ordinal_matrix("after prior selection", prep_after_select)
ordinal_matrix("after continuation (ordinal chain)", prep_after_chain)
ordinal_matrix("after Show more", prep_after_show_more)

# ---------------------------------------------------------------- R6 hard constraints (Jobs, then generic)
def jobs_constraint(case, question, ok_fn, expected):
    c = Chat(); r = c.ask(question)
    rec("R6", case, ok_fn(r), expected, r, r["answer"][:110].replace("\n", " "))


def unmatched_ok(r):
    a = r.get("answer", "").lower()
    return (r.get("status") != "ok" or not r.get("items")) or ("cannot" in a or "could not apply" in a or "not able to apply" in a or "no matching" in a)


jobs_constraint("Antarctica (the PM case)", "What jobs are available at ANU in Antarctica?", unmatched_ok,
                "no matching supported Jobs (+ incomplete-population caveat) OR an explicit 'location cannot be applied'; NOT all jobs as matches")
jobs_constraint("unsupported location: Sydney", "What jobs are available at ANU in Sydney?", unmatched_ok, "not all jobs")
jobs_constraint("unsupported location: Melbourne", "Any ANU jobs in Melbourne?", unmatched_ok, "not all jobs")
jobs_constraint("valid location: Canberra", "What jobs are available at ANU in Canberra?", lambda r: r["status"] == "ok" and len(r["items"]) >= 1, "Canberra jobs listed")
jobs_constraint("unsupported employment type: casual", "What casual jobs are available at ANU?", unmatched_ok, "not all jobs")
jobs_constraint("unsupported employment type: full-time", "What full-time jobs are available at ANU?", unmatched_ok, "not all jobs (fixtures are Fixed-term only)")
jobs_constraint("valid employment type: fixed-term", "What fixed-term jobs are available at ANU?", lambda r: r["status"] == "ok" and len(r["items"]) >= 1, "fixed-term jobs listed")
jobs_constraint("unsupported classification: ANU99", "What ANU99 jobs are available?", unmatched_ok, "not all jobs")
jobs_constraint("valid classification: ANU08", "What ANU08 jobs are available?", lambda r: r["status"] == "ok" and len(r["items"]) >= 1, "ANU08 jobs listed")
jobs_constraint("unsupported keyword: chef", "Are there any chef jobs at ANU?", unmatched_ok, "not all jobs")
jobs_constraint("unsupported: remote", "What remote jobs are available at ANU?", unmatched_ok, "not all jobs")
# generic loss of hard constraints outside Jobs (extra findings)
for case, q in [("events: Antarctica", "What events are on at ANU in Antarctica?"),
                ("accommodation: Antarctica", "Show me accommodation options in Antarctica"),
                ("scholarships: Antarctic student", "What scholarships are there for students in Antarctica?")]:
    c = Chat(); r = c.ask(q)
    rec("R6 generic (extra)", case, unmatched_ok(r), "not everything returned as a match", r, r["answer"][:110].replace("\n", " "))

# ---------------------------------------------------------------- D7-A1 + controlled-error family
def two_lists():
    c = Chat(); s = c.ask(SCHOLAR_Q); s2 = c.show_more(s); j = c.ask(LISTS["jobs"])
    return c, s, s2, j


def state_facts(st):
    return {"turn_index": st.get("turn_index"), "result_sets": [x["result_set_id"] for x in st.get("result_sets", [])],
            "selected": (st.get("selected_result") or {}).get("canonical_id"), "focus": (st.get("focus") or {}).get("domain")}


c, s, s2, j = two_lists()
before = copy.deepcopy(c.state)
old_page = s["result_page"]
r = c.ask("Show more", adopt_error=True, result_page={"result_set_id": old_page["result_set_id"], "start_ordinal": old_page["next_ordinal"], "limit": 5})
after = r.get("conversation_state", {})
preserved = r["_http"] == 200 or after == before
rec("D7-A1", "older Scholarship 'Show more' after switching to Jobs", preserved,
    "continue older set OR controlled error whose conversation_state == inbound", r, f"inbound={state_facts(before)} returned={state_facts(after)}")
follow = c.ask("Tell me about the second one")  # App adopted whatever RAG returned
rec("D7-A1", "next 'Tell me about the second one' after that rejection (App adopts RAG's state)", follow.get("status") == "ok" and len(cids(follow)) == 1,
    "resolves against the retained Jobs set (#2)", follow)

# error family: each from a healthy mid-conversation state; pass iff returned state == inbound (or omitted)
def err_case(case, build):
    c, s, s2, j = two_lists()
    inbound = copy.deepcopy(c.state)
    extra = build(c, s, s2, j)
    code, data = raw({"question": extra.pop("_q", "Tell me more"), "history": c.history[-10:], "conversation_state": inbound, **extra})
    st = data.get("conversation_state")
    ok = code == 200 or st is None or st == inbound
    rows.append({"group": "error family", "case": case, "pass": bool(ok), "expected": "controlled rejection must not reset state: returned conversation_state == inbound (or omitted)",
                 "actual": f"{code} {data.get('status')} inbound={state_facts(inbound)} returned={state_facts(st) if st is not None else 'OMITTED'}", "answer": (data.get('answer') or '')[:120]})


err_case("stale result-page cursor (start_ordinal wrong)", lambda c, s, s2, j: {"_q": "Show more", "result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": 99, "limit": 5}})
err_case("older set's Show more (not the current focus)", lambda c, s, s2, j: {"_q": "Show more", "result_page": {"result_set_id": s["result_page"]["result_set_id"], "start_ordinal": s["result_page"]["next_ordinal"], "limit": 5}})
err_case("invalid result-set id", lambda c, s, s2, j: {"_q": "Show more", "result_page": {"result_set_id": "rs:nope:9", "start_ordinal": 6, "limit": 5}})
err_case("mismatched ordinal in selected_result", lambda c, s, s2, j: {"_q": "Tell me about it", "selected_result": {"result_set_id": j["items"][0]["result_set_id"], "canonical_id": j["items"][0]["canonical_id"], "ordinal": 4}})
err_case("tampered selected_result canonical_id", lambda c, s, s2, j: {"_q": "Tell me about it", "selected_result": {"result_set_id": j["items"][0]["result_set_id"], "canonical_id": "999999", "ordinal": 1}})
err_case("tampered selected_result result_set_id", lambda c, s, s2, j: {"_q": "Tell me about it", "selected_result": {"result_set_id": "rs:jobs:77", "canonical_id": j["items"][0]["canonical_id"], "ordinal": 1}})
err_case("malformed page request (limit 0)", lambda c, s, s2, j: {"_q": "Show more", "result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": 6, "limit": 0}})
err_case("malformed page request (string ordinal)", lambda c, s, s2, j: {"_q": "Show more", "result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": "six", "limit": 5}})

# ---------------------------------------------------------------- R3 / Jobs duplicate prose (observations)
c = Chat(); r = c.ask(SCHOLAR_Q)
first_line = r["answer"].split("\n")[0]
rec("R3", "Scholarship discovery PARTIAL carries a human-readable reason", r.get("answer_state") != "PARTIAL" or any(
    w in r["answer"].lower() for w in ("because", "could not", "cannot", "not published", "unable", "does not", "no published")),
    "a concise RAG-authored reason when PARTIAL", r, "first line: " + first_line[:120])
c = Chat(); r = c.ask(LISTS["jobs"])
dup = sum(1 for i in r["items"] if i["title"] in r["answer"])
rec("Jobs duplicate prose", "Jobs listing prose vs cards", dup == 0, "short caveat + count only; details in cards", r, f"{dup}/{len(r['items'])} card titles repeated in prose; answer_state={r.get('answer_state')}")

out = sys.argv[1] if len(sys.argv) > 1 else "rc_reverify.json"
json.dump({"url": URL, "label": sys.argv[2] if len(sys.argv) > 2 else "", "rows": rows}, open(out, "w"), indent=1)
groups = {}
for x in rows:
    g = groups.setdefault(x["group"], [0, 0]); g[0] += x["pass"]; g[1] += 1
for g, (p, n) in groups.items():
    print(f"{g:40} {p}/{n}")
print("TOTAL", sum(x["pass"] for x in rows), "/", len(rows))
