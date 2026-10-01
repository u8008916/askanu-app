import sys, json, urllib.request
sys.path.insert(0, r"D:/ANU/2026-sem2/askanu-app/docs/evidence/v7-final-rc-a863bb9")
from title_flow_a863bb9 import Chat, ids, LIST_Q
def more(c, l):
    pg = l["result_page"]
    req = urllib.request.Request(c.url, data=json.dumps({"question":"Show more","history":[],"conversation_state":c.state,"result_page":{"result_set_id":pg["result_set_id"],"start_ordinal":pg["next_ordinal"],"limit":5}}).encode(), headers={"Content-Type":"application/json"})
    try:
        r = json.loads(urllib.request.urlopen(req).read()); return ("200", ids(r))
    except urllib.error.HTTPError as e: return (str(e.code), json.loads(e.read()).get("answer","")[:60])
flows = {
 "list -> 'Tell me about it' (select #2) -> Show more": lambda c,l: c.ask("Tell me about it", l["items"][1]),
 "list -> 'Tell me about <#2 own title>' (with select) -> Show more": lambda c,l: c.ask(f"Tell me about {l['items'][1]['title']}", l["items"][1]),
 "list -> 'Tell me about Software Engineer' (typed, no select) -> Show more": lambda c,l: c.ask("Tell me about Software Engineer"),
 "list -> 'Tell me about Verified Role 5' (typed, no select) -> Show more": lambda c,l: c.ask("Tell me about Verified Role 5"),
}
for port in (8000, 8001):
    print("== port", port)
    for name, f in flows.items():
        c = Chat(port); l = c.ask(LIST_Q); f(c, l); print("  ", name, "->", more(c, l))
