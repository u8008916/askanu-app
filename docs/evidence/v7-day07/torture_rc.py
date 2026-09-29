"""V7 Day 7 live RC torture: App-faithful client against RAG ce0eb8f on :8000.

Mirrors exactly what the App sends: the opaque conversation_state echoed from
the last authoritative response, history of the last 10 turns, and structured
selected_result / result_page built from the rendered items. Records
expected vs actual per case.
"""

import json
import sys
import urllib.error
import urllib.request

URL = "http://127.0.0.1:8000/api/v1/ask"
SCHOLAR_Q = "I'm an international Bachelor of Computing student. What scholarships might suit me?"
results = []


class Chat:
    def __init__(self):
        self.state, self.history, self.last = {}, [], None

    def ask(self, question, **extra):
        body = {"question": question, "history": self.history[-10:], "conversation_state": self.state, **extra}
        req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as res:
                data = json.loads(res.read())
        except urllib.error.HTTPError as err:
            data = {"_http": err.code, "_body": err.read().decode()[:200], "items": [], "status": f"HTTP {err.code}"}
            self.last = data
            return data  # App: not an envelope -> transport error turn, state preserved
        self.state = data["conversation_state"]
        n = len(self.history)
        self.history += [
            {"turn_id": f"t{n+1}", "role": "user", "content": question},
            {"turn_id": f"t{n+2}", "role": "assistant", "content": data["answer"]},
        ]
        self.last = data
        return data

    def select(self, question, index, response=None):
        item = (response or self.last)["items"][index]
        return self.ask(question, selected_result={k: item[k] for k in ("result_set_id", "canonical_id", "ordinal")})

    def show_more(self, response=None):
        page = (response or self.last)["result_page"]
        return self.ask("Show more", result_page={"result_set_id": page["result_set_id"], "start_ordinal": page["next_ordinal"], "limit": 5})


def ids(r):
    return [(i.get("canonical_id"), i.get("ordinal")) for i in r.get("items", [])]


def check(case, response, ok, expected, owner="RAG"):
    actual = f"{response.get('status')} {response.get('answer_state')} {ids(response)}"
    results.append({"case": case, "pass": bool(ok), "expected": expected, "actual": actual, "owner": owner})


def only(r, cid):
    return [i.get("canonical_id") for i in r.get("items", [])] == [cid]


LISTS = {
    "accommodation": ("Show me accommodation options", None),
    "scholarships": (SCHOLAR_Q, None),
    "jobs": ("What jobs are available at ANU?", None),
    "events": ("What events are on at ANU today?", None),
}

# 1-2. structured selection + pronoun / title-bearing follow-ups (R1/R4)
FOLLOWUPS = {
    "accommodation": ["Tell me about it", "Tell me more about {t}", "What does it include?"],
    "scholarships": ["Tell me about it", "Tell me more about {t}", "When does it close?"],
    "jobs": ["Tell me about it", "Tell me more about {t}", "What are its requirements?"],
    "events": ["Tell me about it", "Tell me more about {t}", "Where is it?"],
}
for domain, (q, _) in LISTS.items():
    for text in FOLLOWUPS[domain]:
        c = Chat()
        listing = c.ask(q)
        target = listing["items"][1]
        r = c.select(text.format(t=target["title"]), 1, listing)
        check(f"R1/R4 {domain}: select #2 + {text!r}", r, r["status"] == "ok" and only(r, target["canonical_id"]),
              f"ok, exactly {target['canonical_id']}")

# 3. explicit override (R2 + cross-domain)
c = Chat(); c.ask(SCHOLAR_Q); c.ask("Tell me about the second one")
r = c.ask("Am I eligible for Day 5 International Computing Scholarship 8?")
check("R2 scholarship: selected #2 -> explicit 'eligible for Scholarship 8'", r, only(r, "day5-international-computing-8"),
      "Scholarship 8 (UNKNOWN), no Scholarship 2 evidence")
c = Chat(); l = c.ask("What jobs are available at ANU?"); c.select("Tell me about it", 1, l)
r = c.ask("Tell me about Software Engineer")
check("R2-x jobs: selected #2 -> explicit 'Software Engineer'", r, only(r, "700001"), "job 700001")
c = Chat(); l = c.ask("What events are on at ANU today?"); c.select("Tell me about it", 1, l)
r = c.ask("Tell me about Event 800005")
check("R2-x events: selected #2 -> explicit 'Event 800005'", r, only(r, "800005"), "event 800005")

# 4-5. ordinals 1 -> 2 -> 3, fresh 'third', and selection then different ordinal (R5)
for domain, (q, _) in LISTS.items():
    c = Chat(); l = c.ask(q)
    order = [i["canonical_id"] for i in l["items"]]
    for n, word in enumerate(["first", "second", "third"]):
        if n >= len(order):
            break
        r = c.ask(f"Tell me about the {word} one")
        check(f"R5 {domain}: ordinal chain -> the {word} one", r, only(r, order[n]), f"{order[n]}")
    c = Chat(); l = c.ask(q)
    if len(order) >= 3:
        r = c.ask("Tell me about the third one")
        check(f"R5 {domain}: fresh list -> the third one", r, only(r, order[2]), order[2])
        c = Chat(); l = c.ask(q); c.select("Tell me about it", 1, l)
        r = c.ask("Tell me about the third one")
        check(f"R5 {domain}: selected #2 -> the third one", r, only(r, order[2]), order[2])

# 6. paging -> continuation -> refinement -> comparison
c = Chat(); l = c.ask(SCHOLAR_Q)
p2 = c.show_more(l)
check("paging scholarships: Show more", p2, [o for _, o in ids(p2)] == [6, 7, 8], "ordinals 6,7,8", "RAG")
r = c.ask("Any more?")
check("paging scholarships: 'Any more?' after last page", r, r["status"] in ("ok", "insufficient_evidence") and not r.get("items"),
      "no further items, no restart at 1")
r = c.ask("Only show me ones I can still apply for")
check("paging scholarships: refinement after paging", r, r["status"] == "ok" and r.get("answer_state") == "PARTIAL" and [o for _, o in ids(r)][:1] == [1],
      "child set, ordinals restart at 1, PARTIAL")
r = c.ask("Compare the first two")
check("paging scholarships: comparison after refinement", r, r["items"] and r["items"][0]["type"] == "comparison",
      "comparison of the child set's first two")
c = Chat(); l = c.ask("What jobs are available at ANU?"); p2 = c.show_more(l)
r = c.ask("Which ones close this week?")
check("paging jobs: refinement after Show more", r, r["status"] == "ok" and r.get("answer_state") == "PARTIAL", "PARTIAL child set")

# 7. return topic
c = Chat(); c.ask("Tell me about COMP1110 in 2026"); c.ask(SCHOLAR_Q)
r = c.ask("Back to COMP1110")
check("return: Course -> Scholarship -> Course", r, only(r, "COMP1110") and r["items"][0]["record_id"].endswith("2026"), "COMP1110 2026")
c = Chat(); c.ask(SCHOLAR_Q); c.ask("Show me accommodation options")
r = c.ask("Back to scholarships. Tell me about the second one")
check("return: Scholarship -> Accommodation -> Scholarship #2", r, only(r, "day5-international-computing-2"), "scholarship #2")
c = Chat(); jobs = c.ask("What jobs are available at ANU?"); c.ask("What events are on at ANU today?")
r = c.ask("Back to jobs. Tell me about the second one")
check("return: Jobs -> Events -> Jobs #2", r, only(r, jobs["items"][1]["canonical_id"]), "job #2")

# 8. support interruption
c = Chat(); s = c.ask(SCHOLAR_Q); c.ask("I need academic help")
r = c.ask("Tell me about the second scholarship")
check("support interruption: Scholarship list -> Support -> 'the second scholarship'", r, only(r, "day5-international-computing-2"),
      "scholarship #2 (explicit domain word)")

# 9. stale page / stale selection after Clear Chat and after topic switch
c = Chat(); l = c.ask(SCHOLAR_Q)
stale = Chat()  # Clear Chat: App sends empty state
r = stale.show_more(l)
check("stale Show more after Clear Chat", r, r.get("_http") in (400, 422), "4xx (rejected); App shows error, keeps nothing", "RAG/App")
r = stale.select("Tell me about it", 1, l)
check("stale selected_result after Clear Chat", r, r.get("_http") in (400, 422), "4xx (rejected)", "RAG/App")
c = Chat(); l = c.ask(SCHOLAR_Q); c.ask("What jobs are available at ANU?")
r = c.show_more(l)
check("older turn's Show more after topic switch", r, r.get("_http") is None and r["status"] == "ok",
      "either continue the older ResultSet or a controlled envelope; NOT a raw 4xx", "RAG/App")
body = c.last.get("_body")
results[-1]["actual"] += f" body={body!r}"

# 10. INCOMPLETE population wording
c = Chat(); r = c.ask("What jobs are available at ANU in Antarctica?")
check("INCOMPLETE: jobs no-match wording", r, "does not establish" in r.get("answer", "") or r["status"] != "ok",
      "never 'there are no jobs'")

json.dump(results, open(sys.argv[1], "w"), indent=1)
for x in results:
    print("PASS" if x["pass"] else "FAIL", "|", x["case"], "|", x["actual"][:110])
print(sum(x["pass"] for x in results), "/", len(results))
