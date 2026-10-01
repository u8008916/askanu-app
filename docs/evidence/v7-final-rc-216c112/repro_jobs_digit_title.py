import json, urllib.request
def post(port, body):
    r = urllib.request.Request(f"http://127.0.0.1:{port}/api/v1/ask", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(r).read())
def run(port, q):
    l = post(port, {"question": "What jobs are available at ANU?", "history": [], "conversation_state": {}})
    it = l["items"][1]
    t2 = post(port, {"question": "Tell me about it", "history": [], "conversation_state": l["conversation_state"],
                     "selected_result": {k: it[k] for k in ("result_set_id", "canonical_id", "ordinal")}})
    r = post(port, {"question": q, "history": [], "conversation_state": t2["conversation_state"]})
    return r["status"], r["answer_state"], [i["canonical_id"] for i in r["items"]], (r.get("conversation_state") or {}).get("constraints", {}).get("items"), r["answer"][:70]
for q in ("Tell me about Software Engineer", "Tell me about Verified Role 5", "Tell me more about Verified Role 4", "Tell me about job 700004"):
    print(repr(q))
    for name, port in (("e88a0d7", 8001), ("216c112", 8000)):
        print("   ", name, run(port, q))
