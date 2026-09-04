# API_CONTRACT.md

Version `v1`.

## POST /api/v1/ask

Request:
```json
{
  "question": "Does it have prerequisites?",
  "history": [
    {"turn_id":"t1","role":"user","content":"Tell me about COMP1110"},
    {"turn_id":"t2","role":"assistant","content":"..."}
  ],
  "conversation_state":{"pending_clarification":null}
}
```

Initial V3 limits:
- question max 2,000 characters
- history max 10 prior turns
- output target about 800 model tokens
- backend timeout target about 30 seconds

### Status enum — frozen
- `ok`
- `partial`
- `needs_clarification`
- `insufficient_evidence`
- `off_topic`
- `error`

No Relief Mate confidence labels.

### Response
```json
{
  "status":"ok",
  "answer":"...",
  "items":[],
  "sources":[
    {
      "source_id":"course:COMP1110:2026",
      "title":"...",
      "url":"https://...",
      "domain":"courses"
    }
  ],
  "clarification":null,
  "request_id":"req_..."
}
```

### Clarification
```json
{
  "status":"needs_clarification",
  "answer":"Do you mean COMP1110 or COMP1600?",
  "items":[],
  "sources":[],
  "clarification":{
    "id":"clar-42",
    "type":"entity_selection",
    "options":[
      {"id":"course:COMP1110","label":"COMP1110"},
      {"id":"course:COMP1600","label":"COMP1600"}
    ],
    "allow_multiple":true
  },
  "request_id":"req_..."
}
```

## GET /api/v1/events/upcoming?limit=5
Deterministic; `Australia/Canberra`; upcoming only; ascending start time; default 5.

## GET /api/v1/jobs/current?limit=5
Deterministic; current/open only; nearest known closing date first; undated open roles after dated roles; default 5.

## GET /health
Must not expose secrets, prompts, credentials or stack traces.

## Provenance invariant
Source URLs come programmatically from retrieved stored records. The model must never invent source URLs.
