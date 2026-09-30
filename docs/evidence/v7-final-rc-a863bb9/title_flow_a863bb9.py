"""Job title-flow cases (PM checklist, 30 Sep) against a live RAG. Observes only.

Usage: python title_flow_a863bb9.py PORT [PORT ...]   (one column of output per port)
App-faithful: opaque conversation_state echoed, selected_result as the App builds it.
"""
import json, sys, urllib.request

LIST_Q = "What jobs are available at ANU?"


class Chat:
    def __init__(self, port):
        self.url = f"http://127.0.0.1:{port}/api/v1/ask"
        self.state, self.last = {}, None

    def ask(self, q, sel=None):
        body = {"question": q, "history": [], "conversation_state": self.state}
        if sel is not None:
            body["selected_result"] = {k: sel[k] for k in ("result_set_id", "canonical_id", "ordinal")}
        req = urllib.request.Request(self.url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        self.last = json.loads(urllib.request.urlopen(req).read())
        self.state = self.last.get("conversation_state", self.state)
        return self.last


def ids(r): return [i["canonical_id"] for i in r["items"]]
def cons(r): return [(c["semantic_type"], c["value"]) for c in r["conversation_state"]["constraints"]["items"]]
def sel(r): return (r["conversation_state"].get("selected_result") or {}).get("canonical_id")
def brief(r): return f"{r['answer_state']} cards={ids(r)} cons={cons(r)} state.selected={sel(r)}"


def cases(port):
    out = []
    c = Chat(port); r = c.ask("Tell me about Verified Role 5")
    out.append(("fresh exact digit title", ids(r) == ["700005"] and not cons(r), brief(r)))
    c = Chat(port); r = c.ask("Tell me about Software Engineer")
    out.append(("fresh exact title", ids(r) == ["700001"] and not cons(r), brief(r)))
    c = Chat(port); l = c.ask(LIST_Q); r = c.ask("Tell me about Verified Role 4")
    out.append(("title after a ResultSet exists", ids(r) == ["700004"] and not cons(r), brief(r)))
    c = Chat(port); l = c.ask(LIST_Q); c.ask("Tell me about it", l["items"][1]); r = c.ask("Tell me about Verified Role 5")
    out.append(("title after another Job is selected (override)", ids(r) == ["700005"] and not cons(r) and sel(r) in (None, "700005"), brief(r)))
    c = Chat(port); l = c.ask(LIST_Q); c.ask("Tell me about it", l["items"][1]); r = c.ask("Tell me more about Verified Role 4")
    out.append(("digit title, 'Tell me more about', after selection", ids(r) == ["700004"] and not cons(r), brief(r)))
    c = Chat(port); l = c.ask(LIST_Q); c.ask("Tell me about it", l["items"][2]); r = c.ask("Tell me about Software Engineer")
    out.append(("explicit different title (non-digit) after selection", ids(r) == ["700001"] and not cons(r), brief(r)))
    c = Chat(port); l = c.ask(LIST_Q); it = l["items"][1]; r = c.ask(f"Tell me about {it['title']}", it)
    out.append(("selected job asked by its OWN title (state kept?)", ids(r) == [it["canonical_id"]] and sel(r) == it["canonical_id"], brief(r)))
    c = Chat(port); l = c.ask(LIST_Q); it = l["items"][1]; c.ask(f"Tell me about {it['title']}", it); r = c.ask("What is its closing date?")
    out.append(("follow-up 'closing date' after own-title select", "700002" in ids(r) or "2026-09-16" in r["answer"], f"{brief(r)} | {r['answer'][:70]}"))
    c = Chat(port); l = c.ask(LIST_Q); c.ask("Tell me about it", l["items"][1]); c.ask("Tell me about Verified Role 5"); r = c.ask("What is its closing date?")
    out.append(("follow-up 'closing date' after override", "2026-09-19" in r["answer"], f"{brief(r)} | {r['answer'][:70]}"))
    c = Chat(port); l = c.ask(LIST_Q); c.ask("Tell me about it", l["items"][1]); c.ask("Tell me about Verified Role 5"); r = c.ask("Show me jobs")
    out.append(("next generic 'Show me jobs' clean + unfiltered", len(ids(r)) >= 5 and not cons(r), brief(r)))
    c = Chat(port); c.ask("Tell me about Verified Role 5"); r = c.ask("Show me jobs")
    out.append(("'Show me jobs' after fresh digit title", len(ids(r)) >= 5 and not cons(r), brief(r)))
    return out


if __name__ == "__main__":
    for port in map(int, sys.argv[1:]):
        print(f"===== port {port}")
        results = cases(port)
        for name, ok, info in results:
            print(f"{'PASS' if ok else 'FAIL'} | {name} | {info}")
        print(f"{sum(o for _, o, _ in results)}/{len(results)}")
