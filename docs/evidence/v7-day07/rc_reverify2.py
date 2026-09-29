"""V7 Day 7 RC re-verification, round 2 (PM matrix): R4 Accommodation/Jobs, full R5, R6 + state, A1.

Usage:  RAG_URL=http://127.0.0.1:8000/api/v1/ask python rc_reverify2.py out.json [label]

Companion to torture_rc.py (unchanged 45-case gate) and rc_reverify.py (284-check matrix).
App-faithful client: opaque conversation_state echoed from the last authoritative response,
history of the last 10 turns, selected_result / result_page built from rendered items.
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

    def ask(self, question, **extra):
        code, data = raw({"question": question, "history": self.history[-10:], "conversation_state": self.state, **extra})
        data["_http"] = code
        if code == 200 and "conversation_state" in data:
            self.state = data["conversation_state"]
            n = len(self.history)
            self.history += [{"turn_id": f"t{n+1}", "role": "user", "content": question}, {"turn_id": f"t{n+2}", "role": "assistant", "content": data["answer"]}]
        self.last = data
        return data

    def select(self, question, index, response=None):
        item = (response or self.last)["items"][index]
        return self.ask(question, selected_result={k: item[k] for k in ("result_set_id", "canonical_id", "ordinal")})

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


def constraints(r):
    st = r.get("conversation_state") or {}
    return [(c.get("semantic_type"), c.get("value"), c.get("hard")) for c in (st.get("constraints") or {}).get("items", [])]


# ------------------------------------------------------------ R4 Accommodation (three wordings, strict)
ACC = ["Tell me about {t}", "Tell me more about {t}", "Give me more information about {t}"]
for idx in (0, 1):
    for text in ACC:
        c = Chat(); l = c.ask(LISTS["accommodation"]); it = l["items"][idx]
        r = c.select(text.format(t=it["title"]), idx, l)
        got = r.get("items", [])
        src = [s.get("canonical_id") or s.get("record_id") for s in r.get("sources", [])]
        ok = (r["status"] == "ok" and cids(r) == [it["canonical_id"]] and got[0].get("record_id") == it["record_id"]
              and got[0].get("result_set_id") == it["result_set_id"] and got[0].get("ordinal") == it["ordinal"])
        rec("R4 Accommodation", f"#{idx+1} {it['title']!r}: {text.split('{')[0].strip()} <title>", ok,
            f"ok, {it['canonical_id']}/{it['record_id']}, same rs+ordinal, no other Accommodation", r, r["answer"][:60])

# ------------------------------------------------------------ R4 Jobs (digit titles + numeric control + explicit override)
JOBS = Chat(); JL = JOBS.ask(LISTS["jobs"]); titles = {i["ordinal"]: i for i in JL["items"]}
for n in (2, 3):
    for text in ("Tell me about {t}", "Tell me more about {t}"):
        c = Chat(); l = c.ask(LISTS["jobs"]); it = l["items"][n - 1]
        r = c.select(text.format(t=it["title"]), n - 1, l)
        ok = r["status"] == "ok" and cids(r) == [it["canonical_id"]] and r["items"][0].get("ordinal") == n
        rec("R4 Jobs digit titles", f"selected {it['title']!r}: {text.split('{')[0].strip()} <title>", ok, f"ok, {it['canonical_id']} ordinal {n}", r, r["answer"][:60])
# control: an explicit numeric Job reference still resolves (with no selection, and with a different selection)
for q, want in (("Tell me about job 700004", "700004"), ("Tell me about Job ID 700005", "700005"), ("Tell me about role 700003", "700003")):
    c = Chat(); r = c.ask(q)
    rec("R4 Jobs numeric control", f"no selection: {q!r}", cids(r) == [want], f"only {want}", r)
c = Chat(); l = c.ask(LISTS["jobs"]); c.select("Tell me about it", 1, l)
r = c.ask("Tell me about job 700004")
rec("R4 Jobs numeric control", "selected #2 -> explicit 'job 700004'", cids(r) == ["700004"], "only 700004", r)
# old selection -> explicit different exact title: the new exact title wins (incl. a digit-bearing one)
for q, want in (("Tell me about Software Engineer", "700001"), ("Tell me about Verified Role 5", "700005"), ("Tell me more about Verified Role 4", "700004")):
    c = Chat(); l = c.ask(LISTS["jobs"]); c.select("Tell me about it", 1, l)
    r = c.ask(q)
    rec("R4 Jobs override", f"selected #2 -> {q!r}", cids(r) == [want], f"only {want}", r)
    c = Chat(); l = c.ask(LISTS["jobs"]); c.select("Tell me about Verified Role 3", 2, l)
    r = c.ask(q)
    rec("R4 Jobs override", f"selected #3 (digit title) -> {q!r}", cids(r) == [want], f"only {want}", r)

# ------------------------------------------------------------ R5 full ordinal matrix, strict
WORDS = [("first", 1), ("second", 2), ("third", 3), ("fourth", 4), ("1st", 1), ("2nd", 2), ("3rd", 3), ("4th", 4),
         ("number 1", 1), ("number 2", 2), ("number 3", 3), ("number 4", 4)]
CONTEXTS = {
    "fresh": lambda c, d: c.ask(LISTS[d]),
    "selection": lambda c, d: (lambda l: (c.select("Tell me about it", 1, l), l)[1])(c.ask(LISTS[d])),
    "continuation": lambda c, d: (lambda l: (c.ask("Tell me about the first one"), c.ask("Tell me about the second one"), l)[2])(c.ask(LISTS[d])),
    "Show More": lambda c, d: (lambda l: (c.show_more(l), l)[1])(c.ask(LISTS[d])),
}
matrix = {}
for d in ("scholarships", "jobs", "events", "accommodation"):
    for word, n in WORDS:
        for cname, prep in CONTEXTS.items():
            for wrap in ("bare", "the"):
                c = Chat(); l = prep(c, d)
                order = l["items"]
                text = word if wrap == "bare" else ("Tell me about the " + word + " one" if word[0].isalpha() and not word.startswith("number") else "Tell me about " + word)
                r = c.ask(text)
                if n <= len(order):
                    want = order[n - 1]
                    ok = (r.get("status") == "ok" and cids(r) == [want["canonical_id"]] and r["items"][0].get("ordinal") == n
                          and r["items"][0].get("result_set_id") == want["result_set_id"])
                else:  # beyond the list (accommodation has 2): must not return a wrong item
                    ok = not cids(r)
                key = (word, cname)
                cell = matrix.setdefault(key, {})
                cell.setdefault(d, []).append(ok)
                rec("R5", f"{d}: {wrap} {word!r} [{cname}]", ok, f"item {n} of the ORIGINAL ResultSet" if n <= len(order) else "no wrong item (list shorter)", r, text)
# explicit numbered entity must still win over the broader ordinal parser (R2 regression)
def keep(case, setup, q, want, forbid):
    c = Chat(); setup(c); r = c.ask(q)
    rec("R5/R2 regression", case, cids(r) == [want] and forbid not in json.dumps(r.get("items", [])), f"only {want}, no {forbid}", r)

keep("Scholarship: 'number 3' then explicit 'Scholarship 8'", lambda c: (c.ask(SCHOLAR_Q), c.ask("number 3")), "Am I eligible for Day 5 International Computing Scholarship 8?", "day5-international-computing-8", "computing-3")
keep("Scholarship: fresh list -> 'Tell me about Scholarship 8' by full title", lambda c: c.ask(SCHOLAR_Q), "Tell me about Day 5 International Computing Scholarship 8", "day5-international-computing-8", "computing-3")
keep("Scholarship: selected #2 -> 'Day 5 International Computing Scholarship 4'", lambda c: (lambda l: c.select("Tell me about it", 1, l))(c.ask(SCHOLAR_Q)), "Tell me about Day 5 International Computing Scholarship 4", "day5-international-computing-4", "computing-2")
keep("Scholarship: 'the 3rd one' then explicit 'Scholarship 8'", lambda c: (c.ask(SCHOLAR_Q), c.ask("the 3rd one")), "When does Day 5 International Computing Scholarship 8 close?", "day5-international-computing-8", "computing-3")
keep("Events: 'number 3' then explicit 'Event 800005'", lambda c: (c.ask(LISTS["events"]), c.ask("number 3")), "Tell me about Event 800005", "800005", "800003")
keep("Jobs: 'number 3' then explicit 'job 700004'", lambda c: (c.ask(LISTS["jobs"]), c.ask("number 3")), "Tell me about job 700004", "700004", "700003")

# ------------------------------------------------------------ R6 hard constraints + state
def r6(group, case, q, expect):
    c = Chat(); r = c.ask(q); cons = constraints(r)
    a = r.get("answer", "").lower()
    overclaim = any(p in a for p in ("no jobs", "there are no", "no anu jobs", "does not exist")) and "does not establish" not in a
    caveat = "incomplete" in a
    if expect == "match":
        ok = r["status"] == "ok" and len(r["items"]) >= 1
    elif expect == "no-match-jobs":
        ok = not r.get("items") and caveat and not overclaim
    else:
        ok = not r.get("items") and not overclaim
    survives = bool(cons) if expect != "match" else True
    rec(group, case, ok and survives, {"match": "matching results only", "no-match-jobs": "no cards, incompleteness caveat, no 'no jobs exist' claim, constraint kept in state",
                                       "no-match": "no cards, no overclaim, constraint kept in state"}[expect], r,
        f"state.constraints={cons} caveat={caveat} overclaim={overclaim}")


for loc in ("Antarctica", "Sydney", "Melbourne"):
    r6("R6 Jobs", f"'at ANU in {loc}' (PM phrasing)", f"What jobs are available at ANU in {loc}?", "no-match-jobs")
    r6("R6 Jobs", f"'jobs in {loc}'", f"Any ANU jobs in {loc}?", "no-match-jobs")
r6("R6 Jobs", "casual (known positive control)", "What casual jobs are available at ANU?", "no-match-jobs")
r6("R6 Jobs", "full-time", "What full-time jobs are available at ANU?", "no-match-jobs")
r6("R6 Jobs", "remote", "What remote jobs are available at ANU?", "no-match-jobs")
r6("R6 Jobs", "ANU99", "What ANU99 jobs are available?", "no-match-jobs")
r6("R6 Accommodation", "Antarctica", "Show me accommodation options in Antarctica", "no-match")
r6("R6 Events", "Antarctica", "What events are on at ANU in Antarctica?", "no-match")
# false-negative control: a VALID stored location must return the matching jobs, in every natural phrasing
for q in ("What jobs are available at ANU in Canberra?", "Any ANU jobs in Canberra?", "jobs in Canberra", "What jobs are available in ACT?",
          "What jobs are available at ANU in Canberra / ACT?", "Are there any jobs in Canberra?"):
    r6("R6 valid-location control (false negatives)", q, q, "match")
r6("R6 valid-location control (false negatives)", "fixed-term (valid type)", "What fixed-term jobs are available at ANU?", "match")
r6("R6 valid-location control (false negatives)", "ANU08 (valid classification)", "What ANU08 jobs are available?", "match")

# ------------------------------------------------------------ D7-A1 controlled-error family
def facts(st):
    return {"turn_index": st.get("turn_index"), "result_sets": [x["result_set_id"] for x in st.get("result_sets", [])],
            "selected": (st.get("selected_result") or {}).get("canonical_id"), "focus": (st.get("focus") or {}).get("domain")}


def fresh():
    c = Chat(); s = c.ask(SCHOLAR_Q); c.show_more(s); j = c.ask(LISTS["jobs"])
    return c, s, j


A1 = [
    ("stale cursor (start_ordinal wrong)", lambda c, s, j: ("Show more", {"result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": 99, "limit": 5}})),
    ("older ResultSet's Show more", lambda c, s, j: ("Show more", {"result_page": {"result_set_id": s["result_page"]["result_set_id"], "start_ordinal": s["result_page"]["next_ordinal"], "limit": 5}})),
    ("invalid ResultSet id", lambda c, s, j: ("Show more", {"result_page": {"result_set_id": "rs:nope:9", "start_ordinal": 6, "limit": 5}})),
    ("mismatched ordinal", lambda c, s, j: ("Tell me about it", {"selected_result": {"result_set_id": j["items"][0]["result_set_id"], "canonical_id": j["items"][0]["canonical_id"], "ordinal": 4}})),
    ("tampered selected canonical_id", lambda c, s, j: ("Tell me about it", {"selected_result": {"result_set_id": j["items"][0]["result_set_id"], "canonical_id": "999999", "ordinal": 1}})),
    ("tampered selected result_set_id", lambda c, s, j: ("Tell me about it", {"selected_result": {"result_set_id": "rs:jobs:77", "canonical_id": j["items"][0]["canonical_id"], "ordinal": 1}})),
    ("page past end", lambda c, s, j: ("Show more", {"result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": 50, "limit": 5}})),
    ("replayed/invalid page start (start_ordinal 0)", lambda c, s, j: ("Show more", {"result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": 0, "limit": 5}})),
    ("malformed page (limit 0)", lambda c, s, j: ("Show more", {"result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": 6, "limit": 0}})),
    ("malformed page (string ordinal)", lambda c, s, j: ("Show more", {"result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": "six", "limit": 5}})),
]
for case, build in A1:
    c, s, j = fresh(); inbound = copy.deepcopy(c.state)
    q, extra = build(c, s, j)
    code, data = raw({"question": q, "history": c.history[-10:], "conversation_state": inbound, **extra})
    ret = data.get("conversation_state")
    preserved = code == 200 or (ret is not None and ret == inbound) or ret is None
    adopted = ret if ret is not None else inbound  # the App adopts a RAG-authored envelope's state (PR #40)
    code2, nxt = raw({"question": "Tell me about the second one", "history": c.history[-10:], "conversation_state": adopted})
    ok2 = code2 == 200 and nxt.get("status") == "ok" and cids(nxt) == ["700002"]
    rows.append({"group": "D7-A1 state preserved", "case": case, "pass": bool(preserved and code in (200, 400, 422)),
                 "expected": "controlled rejection: returned state == inbound (byte/semantic equal)",
                 "actual": f"{code} {data.get('status')} equal={ret == inbound if ret is not None else 'OMITTED'} inbound={facts(inbound)} returned={facts(ret) if ret is not None else 'OMITTED'}", "answer": ""})
    rows.append({"group": "D7-A1 next 'second one'", "case": case, "pass": bool(ok2), "expected": "still resolves ordinal 2 of the retained Jobs set (700002), not off_topic",
                 "actual": f"{code2} {nxt.get('status')} {cids(nxt)}", "answer": (nxt.get("answer") or "")[:100]})

# validation control: a genuinely INVALID inbound state must not be echoed as authoritative
c, s, j = fresh()
for label, mutate in (("schema_version 99", lambda st: st.update(schema_version=99)),
                      ("turn_index -5", lambda st: st.update(turn_index=-5)),
                      ("result set with foreign domain shape", lambda st: st["result_sets"][0].update(ordered_canonical_ids="not-a-list"))):
    bad = copy.deepcopy(c.state); mutate(bad)
    code, data = raw({"question": "Show more", "history": [], "conversation_state": bad})
    ret = data.get("conversation_state")
    ok = code in (400, 422) and (ret is None or ret != bad)
    rows.append({"group": "A1 validation control", "case": f"invalid inbound state: {label}", "pass": bool(ok),
                 "expected": "rejected; the invalid state is NOT echoed back as authoritative",
                 "actual": f"{code} {data.get('status')} returned={'OMITTED' if ret is None else ('ECHOED-INVALID' if ret == bad else facts(ret))}", "answer": ""})

# Clear Chat still resets: empty state + stale replay -> 400 with the empty state; then a new topic starts clean
c, s, j = fresh()
code, data = raw({"question": "Show more", "history": [], "conversation_state": {}, "result_page": {"result_set_id": j["result_page"]["result_set_id"], "start_ordinal": 6, "limit": 5}})
ret = data.get("conversation_state") or {}
rows.append({"group": "Clear Chat reset", "case": "stale replay with empty state (App after Clear Chat)", "pass": code in (400, 422) and ret.get("turn_index") == 0 and not ret.get("result_sets"),
             "expected": "rejected; turn_index 0, result_sets []", "actual": f"{code} {facts(ret)}", "answer": ""})
n = Chat(); r = n.ask(LISTS["accommodation"])
st = r["conversation_state"]
rows.append({"group": "Clear Chat reset", "case": "new question after Clear Chat starts clean (no earlier Scholarship/Jobs sets)", "pass": st["turn_index"] == 1 and [x["result_set_id"] for x in st["result_sets"]] == ["rs:accommodation:1"] and st.get("selected_result") is None,
             "expected": "turn_index 1, only the new ResultSet", "actual": str(facts(st)), "answer": ""})

out = sys.argv[1] if len(sys.argv) > 1 else "rc_reverify2.json"
json.dump({"url": URL, "label": sys.argv[2] if len(sys.argv) > 2 else "", "rows": rows}, open(out, "w"), indent=1)
groups = {}
for x in rows:
    g = groups.setdefault(x["group"], [0, 0]); g[0] += x["pass"]; g[1] += 1
for g, (p, n_) in groups.items():
    print(f"{g:44} {p}/{n_}")
print("TOTAL", sum(x["pass"] for x in rows), "/", len(rows))
# R5 pivot: wording x context, count of passing (domain, wrapper) cells
print("\nR5 matrix (cells passing / cells; 4 domains x 2 wrappers = 8)")
print(f"{'wording':10}" + "".join(f"{c:>14}" for c in CONTEXTS))
for word, _ in WORDS:
    print(f"{word:10}" + "".join(f"{sum(sum(v) for v in matrix[(word, c)].values())}/{sum(len(v) for v in matrix[(word, c)].values()):>12}" for c in CONTEXTS))
