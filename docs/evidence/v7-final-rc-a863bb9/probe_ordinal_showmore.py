import sys, json
sys.path.insert(0, r"D:/ANU/2026-sem2/askanu-app/docs/evidence/v7-final-rc-a863bb9")
from title_flow_a863bb9 import Chat, ids, cons, sel, LIST_Q
for port in (8000, 8001):
    print("== port", port)
    for follow in ("Tell me about the third one", "Tell me about the first one", "Show more"):
        c = Chat(port); l = c.ask(LIST_Q); it = l["items"][1]
        c.ask(f"Tell me about {it['title']}", it)
        if follow == "Show more":
            pg = l["result_page"]; body = None
            import urllib.request
            req = urllib.request.Request(c.url, data=json.dumps({"question":"Show more","history":[],"conversation_state":c.state,"result_page":{"result_set_id":pg["result_set_id"],"start_ordinal":pg["next_ordinal"],"limit":5}}).encode(), headers={"Content-Type":"application/json"})
            try: r = json.loads(urllib.request.urlopen(req).read()); res = (r["status"], ids(r))
            except Exception as e: res = ("HTTP", str(e))
        else:
            r = c.ask(follow); res = (r["status"], r["answer_state"], ids(r), [i["ordinal"] for i in r["items"]])
        print(f"  own-title re-ask of #2 then {follow!r}:", res)
