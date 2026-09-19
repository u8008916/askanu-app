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

### HTTP error behaviour — frozen

| Failure | HTTP status |
|---|---|
| Malformed JSON | 400 |
| Request validation failure other than oversized input | 400 |
| Oversized input, including question/history exceeding the documented limits | 413 |
| Rate limit exceeded | 429 |
| DB, model or internal dependency failure | Controlled 5xx |

Error responses use controlled JSON with the existing `error` status and response envelope:

```json
{
  "status":"error",
  "answer":"The request could not be completed.",
  "items":[],
  "sources":[],
  "clarification":null,
  "request_id":"req_..."
}
```

The answer may provide a safe, user-facing explanation. Never return stack traces, credentials, secrets, prompts or internal dependency diagnostics. The exact 5xx code depends on the failure; this contract does not prescribe a separate code for each dependency.

### Response
```json
{
  "status":"ok",
  "answer":"...",
  "items":[],
  "sources":[
    {
      "record_id":"course:COMP1110:2026",
      "source_id":"programs-and-courses",
      "title":"...",
      "url":"https://...",
      "domain":"courses"
    }
  ],
  "clarification":null,
  "request_id":"req_..."
}
```

### Source object identifiers

Every source object contains `record_id`, `source_id`, `title`, `url`, and `domain`.

- `record_id` identifies the retrieved evidence record, for example `course:COMP1110:2026`.
- `source_id` identifies the authoritative source in the source registry. `programs-and-courses` above is illustrative; use the actual stored registry identifier.
- `title` and `domain` come from the stored record; `url` comes programmatically from its stored `canonical_url`, never Gemini.

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

### Pending clarification in the next request

`conversation_state.pending_clarification` is either `null` or the existing clarification object. A non-null object requires `id`, `type`, `options`, and `allow_multiple`; each option contains `id` and `label`.

```json
{
  "conversation_state":{
    "pending_clarification":{
      "id":"clar-42",
      "type":"entity_selection",
      "options":[
        {"id":"course:COMP1110","label":"COMP1110"},
        {"id":"course:COMP1600","label":"COMP1600"}
      ],
      "allow_multiple":true
    }
  }
}
```

The client carries the response's `clarification` object into this field on the next request, alongside the user's answer in `question` and bounded history. Preserve option order for `first`/`second`; `allow_multiple` supports `both`. Clear pending clarification when resolved, corrected, switched to a new topic, or cleared with Clear Chat. This is untrusted current-session context, not factual evidence.

## GET /api/v1/events/upcoming?limit=5
Deterministic; `Australia/Canberra`; upcoming only; ascending start time; default 5. The accepted range is 1–20.

Synced on 2026-09-19 to the shape the RAG service ships (askanu-rag `docs/API_CONTRACT.md`, Day 15 branch `carmen/day15-events-rag-api`); see `DECISION_LOG.md`.

Minimal successful response (HTTP 200):

```json
{
  "status":"ok",
  "items":[
    {
      "record_id":"<stored event record ID>",
      "source_id":"events_anu_official",
      "title":"<stored event title>",
      "start_at":"<stored event start time>",
      "end_at":"<stored event end time>",
      "venue":"<stored event venue>",
      "organiser":"<stored event organiser>",
      "status":"<stored source-backed status or null>",
      "url":"<stored canonical URL>",
      "domain":"events"
    }
  ],
  "request_id":"req_..."
}
```

`items` is an ordered array of event objects containing exactly the fields shown above, with at most the requested limit. `record_id` identifies the evidence record (`events:event:<entity_id>`) and `source_id` identifies its source registry entry. This dedicated endpoint reads the official ANU Events source (`events_anu_official`) only — approved Rubric records never appear on the Upcoming Events surface; Events conversation retrieval through `/api/v1/ask` may cite both sources while preserving each record's provenance, and that split is enforced by the RAG service, not the browser. Include upcoming events only; exclude past events and order by ascending `start_at`, then stable `record_id`, in `Australia/Canberra`. `end_at`, `venue`, `organiser` and `status` are nullable and remain JSON `null` when the source did not publish them. `status` is the stored cancellation wording when the source published one, otherwise the stored source status (for example `"published"`). No qualifying records returns `status: "ok"` with `items: []`.

The App displays `status` as stored, next to the start time, venue and organiser, and never derives an upcoming/cancelled verdict, hides a record because of its status, or filters records by source itself.

## GET /api/v1/jobs/current?limit=5
Deterministic; current only; nearest known closing date first; undated current roles after dated roles. The default is 5 and the accepted range is 1–20.

Synced on 2026-09-15 to the shape the RAG service ships (askanu-rag `docs/API_CONTRACT.md`, Day 10 PR #22); see `DECISION_LOG.md`.

Minimal successful response (HTTP 200):

```json
{
  "status":"ok",
  "items":[
    {
      "record_id":"<stored job record ID>",
      "source_id":"<stored source-registry ID>",
      "job_id":"<stored numeric requisition ID>",
      "title":"<stored job title>",
      "employment_types":["<stored employment type>"],
      "location":"<stored job location>",
      "classification":"<stored classification>",
      "salary":"<stored source salary wording>",
      "closing_text":"<stored closing wording>",
      "closing_date":"<stored Canberra-local YYYY-MM-DD date>",
      "closing_at":"<stored closing time>",
      "status":"current",
      "url":"<stored canonical URL>",
      "domain":"jobs"
    }
  ],
  "request_id":"req_..."
}
```

`items` is an ordered array of job objects containing exactly the fields shown above, with at most the requested limit. Nullable stored scalar fields remain JSON `null`; missing `employment_types` is `[]`. Include only records whose normalized Jobs status is `current` and whose `closing_date` is null or is on/after the current `Australia/Canberra` calendar date. Order dated roles by `closing_date` ascending then numeric `job_id` ascending; order undated roles afterward by numeric `job_id`. `closing_at` is returned only when stored and does not determine currentness. No qualifying records returns `status: "ok"` with `items: []`.

The App displays `closing_text` as stored and never derives a date or an open/closed verdict of its own; `status` is the server's verdict.

Both list endpoints use the controlled error behaviour above. URLs come programmatically from stored canonical URLs, never Gemini. Angle-bracket values are illustrative placeholders. The App service forwards both `GET` routes to the RAG service unchanged, carrying only a numeric `limit`; a RAG revision that does not yet serve an endpoint answers 404, which the browser renders as an "unavailable" panel state, never as invented items.

## GET /health
Must not expose secrets, prompts, credentials or stack traces.

## Provenance invariant
Source URLs come programmatically from retrieved stored records. The model must never invent source URLs.
