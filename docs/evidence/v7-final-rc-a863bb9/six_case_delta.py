"""Exact six broader-matrix cases lost at a863bb9, replayed live at three RAG SHAs.

Usage: python six_case_delta.py OUT.json  (ports: 8000=a863bb9, 8001=216c112, 8002=e88a0d7)
Same construction as rc_reverify.py R1/R4: fresh chat, list "What jobs are available at ANU?",
select card idx (App-style selected_result on the request), send the follow-up text.
Records only what RAG returns; no interpretation of meaning.
"""
import json, sys, urllib.error, urllib.request

SHAS = {8000: "a863bb9", 8001: "216c112", 8002: "e88a0d7"}
LIST_Q = "What jobs are available at ANU?"
CASES = [(idx, tmpl) for idx in (0, 1, 2) for tmpl in ("Tell me more about {t}", "Tell me about {t}")]


def post(port, body):
    req = urllib.request.Request(f"http://127.0.0.1:{port}/api/v1/ask", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try:
        return 200, json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def view(code, r):
    st = r.get("conversation_state") or {}
    sel = st.get("selected_result") or {}
    foc = st.get("focus") or {}
    return {
        "http": code, "status": r.get("status"), "answer_state": r.get("answer_state"),
        "cards": [{"id": i["canonical_id"], "ordinal": i.get("ordinal"), "result_set_id": i.get("result_set_id")} for i in r.get("items", [])],
        "selected_result": {"canonical_id": sel.get("canonical_id"), "result_set_id": sel.get("result_set_id"), "ordinal": sel.get("ordinal")} if sel else None,
        "focus": {"id": foc.get("canonical_entity_id"), "result_set_id": foc.get("result_set_id")},
        "constraints": [(c["semantic_type"], c["value"]) for c in (st.get("constraints") or {}).get("items", [])],
        "result_sets": [x["result_set_id"] for x in st.get("result_sets", [])],
        "result_page": st.get("result_page"),
    }


def run(port, idx, tmpl):
    _, l = post(port, {"question": LIST_Q, "history": [], "conversation_state": {}})
    it = l["items"][idx]
    sel = {k: it[k] for k in ("result_set_id", "canonical_id", "ordinal")}
    q = tmpl.format(t=it["title"])
    code, r = post(port, {"question": q, "history": [], "conversation_state": l["conversation_state"], "selected_result": sel})
    out = {"case": f"jobs #{idx+1} {it['title']!r}: {tmpl.split('{')[0].strip()} <title>", "question": q, "request_selected_result": sel,
           "turn2": view(code, r), "expected_id": it["canonical_id"], "expected_ordinal": it["ordinal"], "expected_result_set": it["result_set_id"]}
    st = r["conversation_state"]
    # follow-ups from turn-2 state, exactly what the App would do next
    code, f = post(port, {"question": "Tell me about it", "history": [], "conversation_state": st})
    out["f_tell_me_about_it_no_selection"] = view(code, f)
    code, f = post(port, {"question": "What is its closing date?", "history": [], "conversation_state": st})
    out["f_closing_date"] = dict(view(code, f), answer=f.get("answer", "")[:80])
    code, f = post(port, {"question": "Tell me about the third one", "history": [], "conversation_state": st})
    out["f_ordinal_third"] = view(code, f)
    pg = l["result_page"]
    code, f = post(port, {"question": "Show more", "history": [], "conversation_state": st,
                          "result_page": {"result_set_id": pg["result_set_id"], "start_ordinal": pg["next_ordinal"], "limit": 5}})
    out["f_show_more_old_list"] = dict(view(code, f), answer=f.get("answer", "")[:50] if code != 200 else None)
    return out


if __name__ == "__main__":
    res = {SHAS[p]: [run(p, i, t) for i, t in CASES] for p in SHAS}
    json.dump(res, open(sys.argv[1], "w"), indent=1)
    for n in range(len(CASES)):
        print("\n###", res["a863bb9"][n]["case"], "|", res["a863bb9"][n]["question"])
        for sha in ("e88a0d7", "216c112", "a863bb9"):
            c = res[sha][n]; t = c["turn2"]
            ok_card = [x["id"] for x in t["cards"]] == [c["expected_id"]] and t["cards"][0]["ordinal"] == c["expected_ordinal"] and t["cards"][0]["result_set_id"] == c["expected_result_set"]
            print(f"  {sha}: {t['status']}/{t['answer_state']} card_ok={ok_card} selected={(t['selected_result'] or {}).get('canonical_id')} focus={t['focus']['id']} cons={t['constraints']} "
                  f"| 'about it'(no sel)={[x['id'] for x in c['f_tell_me_about_it_no_selection']['cards']]} closing={c['f_closing_date']['http']} third={[x['id'] for x in c['f_ordinal_third']['cards']]} showmore={c['f_show_more_old_list']['http']}")
