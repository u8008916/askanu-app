import type { AskResponse } from '../types/api';

/**
 * Fixtures shaped to the frozen `/api/v1/ask` envelope in `docs/API_CONTRACT.md`.
 *
 * The real `/api/v1/ask` client is the production path. These fixtures back the
 * UI test suite and the opt-in dev mock transport, so every response state can
 * be exercised without the RAG service running. They are reached only through
 * `dev/mockTransport.ts` and never imported by a component, which is why a
 * production build drops them entirely.
 *
 * Answer text is deliberately placeholder copy. The App never authors answer
 * content, and inventing ANU facts here would breach the "do not invent backend
 * behaviour" rule. Source URLs use `example.invalid` for the same reason: no ANU
 * URL is guessed before real records exist.
 */

export const okResponse: AskResponse = {
  status: 'ok',
  answer:
    'Placeholder answer text. Real answers come from the RAG service; the App never authors answer content.',
  items: [],
  sources: [
    {
      record_id: 'course:COMP1110:2026',
      source_id: 'programs-and-courses',
      title: 'Placeholder course record title',
      url: 'https://example.invalid/placeholder-course',
      domain: 'courses',
    },
  ],
  clarification: null,
  request_id: 'req_mock_ok',
  /*
   * V7 (`askanu-rag` PR #34, merged `a7e9ed4`): an arbitrary, unrealistic
   * shape on purpose — `chat/sessionState.ts` never inspects it, so a
   * fixture that looked like Carmen's real schema would suggest a coupling
   * that does not exist. Exercises that the mock transport, `askResponse.ts`
   * parsing and `useChatSession`'s echo-on-next-request all carry an opaque
   * object through untouched.
   */
  conversation_state: { schema_version: 1, turn_index: 1, mock: true },
};

/** Several sources exercise the numbering and the wrapping of long titles. */
export const okMultiSourceResponse: AskResponse = {
  status: 'ok',
  answer:
    'Placeholder answer text drawing on more than one evidence record.\n\nA second placeholder paragraph, so the blank-line handling in the answer body is visible.',
  items: [],
  sources: [
    {
      record_id: 'course:COMP1110:2026',
      source_id: 'programs-and-courses',
      title: 'Placeholder course record title',
      url: 'https://example.invalid/placeholder-course',
      domain: 'courses',
    },
    {
      record_id: 'scholarship:placeholder-1',
      source_id: 'anu-scholarships',
      title:
        'Placeholder scholarship record with a deliberately long title, so that wrapping inside a narrow source card is visible at 360px',
      url: 'https://example.invalid/placeholder-scholarship',
      domain: 'scholarships',
    },
    {
      record_id: 'support:placeholder-1',
      source_id: 'anusa-student-assistance',
      title: 'Placeholder support record title',
      url: 'https://example.invalid/placeholder-support',
      domain: 'support',
    },
  ],
  clarification: null,
  request_id: 'req_mock_ok_multi',
};

/**
 * Day 11 V6 breadth check: a broad scholarship search grounded in many
 * records, not the one-or-two-source shape every earlier fixture used. The
 * App must render every source the service sends — no cap, no local
 * re-sorting — now that the data layer is expanding toward the full
 * approved scholarship set rather than the bounded V5 sample.
 */
export const okManySourcesResponse: AskResponse = {
  status: 'ok',
  answer:
    'Placeholder answer drawing on a broad set of scholarship records, the shape a 99%-coverage search returns rather than a one-record demo.',
  items: [],
  // Annotated pure so a production build can still drop this module entirely.
  sources: /* @__PURE__ */ Array.from({ length: 14 }, (_, index) => ({
    record_id: `scholarships:scholarship:placeholder-${index + 1}`,
    source_id: 'scholarships_anu_finder',
    title: `Placeholder scholarship record ${index + 1}`,
    url: `https://example.invalid/placeholder-scholarship-${index + 1}`,
    domain: 'scholarships',
  })),
  clarification: null,
  request_id: 'req_mock_many_sources',
};

/**
 * Day 11 V6 breadth check: a source record missing optional-looking text.
 * The contract types every `Source` field as a non-nullable string, but a
 * broadly-scraped record can still arrive with an empty title before the
 * data layer backfills it. The App must show the record rather than crash
 * or invent replacement text.
 */
export const okMissingFieldSourceResponse: AskResponse = {
  status: 'ok',
  answer: 'Placeholder answer for a record with an incomplete stored title.',
  items: [],
  sources: [
    {
      record_id: 'jobs:job:900099',
      source_id: 'jobs_anu_search',
      title: '',
      url: 'https://example.invalid/placeholder-job-missing-title',
      domain: 'jobs',
    },
  ],
  clarification: null,
  request_id: 'req_mock_missing_field',
};

/**
 * Day 11 V6 breadth check: an ambiguous-entity clarification with more than
 * the two-option shape every earlier fixture used. A broad course catalogue
 * search can plausibly match many similarly-named courses; the read-only
 * option list must show every option in order, not a truncated sample.
 */
export const needsClarificationManyOptionsResponse: AskResponse = {
  status: 'needs_clarification',
  answer: 'Which course do you mean?',
  items: [],
  sources: [],
  clarification: {
    id: 'clar-many-courses',
    type: 'entity_selection',
    options: [
      { id: 'courses:course:COMP1100_2026', label: 'COMP1100' },
      { id: 'courses:course:COMP1110_2026', label: 'COMP1110' },
      { id: 'courses:course:COMP1130_2026', label: 'COMP1130' },
      { id: 'courses:course:COMP1600_2026', label: 'COMP1600' },
      { id: 'courses:course:COMP1710_2026', label: 'COMP1710' },
      { id: 'courses:course:COMP2100_2026', label: 'COMP2100' },
      { id: 'courses:course:COMP2600_2026', label: 'COMP2600' },
    ],
    allow_multiple: false,
  },
  request_id: 'req_mock_clarification_many',
};

/**
 * `partial` is in the frozen status enum but carries no separate presentation
 * rule in V3. It renders exactly like `ok`: the backend's own answer text
 * carries the meaning, and the App must not invent a "partial" semantic.
 */
export const partialResponse: AskResponse = {
  status: 'partial',
  answer:
    'Placeholder answer covering part of the question. The remaining detail is not in the approved evidence.',
  items: [],
  sources: [
    {
      record_id: 'course:COMP1110:2026',
      source_id: 'programs-and-courses',
      title: 'Placeholder course record title',
      url: 'https://example.invalid/placeholder-course',
      domain: 'courses',
    },
  ],
  clarification: null,
  request_id: 'req_mock_partial',
};

/**
 * A grounded answer with the structure a synthesised response actually carries:
 * paragraphs, a bulleted list, a numbered list and `**label**` emphasis.
 *
 * The copy is still placeholder text and the URLs are still `example.invalid`.
 * The App never authors answer content and never guesses an ANU URL, so this
 * fixture proves the *shape* renders, not any ANU fact.
 */
export const groundedResponse: AskResponse = {
  status: 'ok',
  answer: [
    'Placeholder opening paragraph of a grounded answer, long enough to wrap onto a second line inside the chat column at a narrow width.',
    '',
    '**Placeholder label:** a short paragraph following an emphasised lead-in.',
    '',
    '- First placeholder list item.',
    '- Second placeholder list item, written long enough that it wraps and the hanging indent under the marker is visible.',
    '- Third placeholder list item.',
    '',
    'A closing paragraph before a numbered sequence:',
    '',
    '1. First placeholder step.',
    '2. Second placeholder step.',
  ].join('\n'),
  items: [],
  sources: [
    {
      record_id: 'course:COMP1110:2026',
      source_id: 'programs-and-courses',
      title: 'Placeholder course record title',
      url: 'https://example.invalid/placeholder-course',
      domain: 'courses',
    },
  ],
  clarification: null,
  request_id: 'req_mock_grounded',
};

export const needsClarificationResponse: AskResponse = {
  status: 'needs_clarification',
  answer: 'Do you mean COMP1110 or COMP1600?',
  items: [],
  sources: [],
  clarification: {
    id: 'clar-42',
    type: 'entity_selection',
    options: [
      { id: 'course:COMP1110', label: 'COMP1110' },
      { id: 'course:COMP1600', label: 'COMP1600' },
    ],
    allow_multiple: true,
  },
  request_id: 'req_mock_clarification',
};

/**
 * `DAY_02.md`'s do-not-cross line: "No empty clarification options." An
 * envelope can in principle carry `needs_clarification` with no options —
 * the App must fall back to the answer text and the free-text composer, not
 * render an empty list or a "Select an option" prompt for nothing to select.
 */
export const needsClarificationNoOptionsResponse: AskResponse = {
  status: 'needs_clarification',
  answer:
    'Placeholder clarifying question with no selectable options in this response — reply in the message box.',
  items: [],
  sources: [],
  clarification: {
    id: 'clar-empty-options',
    type: 'entity_selection',
    options: [],
    allow_multiple: false,
  },
  request_id: 'req_mock_clarification_no_options',
};

/**
 * A Scholarships-shaped clarification: the ambiguous entity is a scholarship,
 * not a course. Option ids follow the frozen Day 9 record identity
 * (`scholarships:scholarship:<canonical-URL-slug>`) so the fixture has the
 * shape the RAG service will send; the slugs and labels are placeholders,
 * not real ANU scholarships.
 */
export const needsScholarshipClarificationResponse: AskResponse = {
  status: 'needs_clarification',
  answer: 'Which scholarship do you mean?',
  items: [],
  sources: [],
  clarification: {
    id: 'clar-scholarship-1',
    type: 'entity_selection',
    options: [
      {
        id: 'scholarships:scholarship:placeholder-scholarship-a',
        label: 'Placeholder scholarship A',
      },
      {
        id: 'scholarships:scholarship:placeholder-scholarship-b',
        label: 'Placeholder scholarship B',
      },
    ],
    allow_multiple: false,
  },
  request_id: 'req_mock_scholarship_clarification',
};

/**
 * A current-jobs answer: the list-oriented, status-heavy shape the Jobs
 * domain produces. Order is the server's deterministic order
 * (`API_CONTRACT.md` `/api/v1/jobs/current`: nearest closing date first,
 * undated open roles after dated ones) and the App renders it as sent.
 *
 * Every role, type, location and date is a placeholder — the years are
 * deliberately 2099 so nothing here can be mistaken for a real ANU closing
 * date. Whether a role is open is a server fact carried in the text; the
 * App does not compute it.
 *
 * Jobs v1 uses numeric requisition identity, frozen cross-repo on Day 10:
 * `source_id = jobs_anu_search`, `record_id = jobs:job:<numeric requisition
 * id>`. Mock ids below are synthetic numeric values only, not real ANU
 * requisition numbers. The App treats both as opaque backend data — it does
 * not derive, parse or validate them.
 */
export const okCurrentJobsResponse: AskResponse = {
  status: 'ok',
  answer: [
    'Placeholder list of roles the service reports as currently open, nearest closing date first. Undated open roles are listed last.',
    '',
    '1. **Placeholder role A** — closes 1 January 2099 · Placeholder employment type · Placeholder location',
    '2. **Placeholder role B** — closes 8 January 2099 · Placeholder employment type · Placeholder location',
    '3. **Placeholder role C with a deliberately long title so that wrapping inside the chat column is visible at narrow widths** — closes 15 January 2099 · Placeholder employment type · Placeholder location',
    '4. **Placeholder role D** — closes 22 January 2099 · Placeholder employment type',
    '5. **Placeholder role E** — no closing date listed · Placeholder employment type · Placeholder location',
    '',
    'Closing dates are as published by the source at the time of the last collection.',
  ].join('\n'),
  items: [],
  sources: [
    {
      record_id: 'jobs:job:900001',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role A',
      url: 'https://example.invalid/placeholder-job-a',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900002',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role B',
      url: 'https://example.invalid/placeholder-job-b',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900003',
      source_id: 'jobs_anu_search',
      title:
        'Placeholder role C with a deliberately long title so that wrapping inside the chat column is visible at narrow widths',
      url: 'https://example.invalid/placeholder-job-c-with-a-deliberately-long-path-segment-that-does-not-break-on-spaces',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900004',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role D',
      url: 'https://example.invalid/placeholder-job-d',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900005',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role E',
      url: 'https://example.invalid/placeholder-job-e',
      domain: 'jobs',
    },
  ],
  clarification: null,
  request_id: 'req_mock_jobs_current',
};

/**
 * A closing-soon answer the service could only partly ground: the roles it
 * can date are listed, and its own text says what it could not confirm. As
 * with `partialResponse`, the App adds no "partial" semantic of its own.
 */
export const partialClosingSoonResponse: AskResponse = {
  status: 'partial',
  answer: [
    'Placeholder roles with the nearest published closing dates:',
    '',
    '1. **Placeholder role A** — closes 1 January 2099',
    '2. **Placeholder role B** — closes 8 January 2099',
    '',
    'One further open role lists no closing date, so it cannot be placed in this order. Check the source page for the latest closing information.',
  ].join('\n'),
  items: [],
  sources: [
    {
      record_id: 'jobs:job:900001',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role A',
      url: 'https://example.invalid/placeholder-job-a',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900002',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role B',
      url: 'https://example.invalid/placeholder-job-b',
      domain: 'jobs',
    },
  ],
  clarification: null,
  request_id: 'req_mock_jobs_closing_partial',
};

export const insufficientEvidenceResponse: AskResponse = {
  status: 'insufficient_evidence',
  answer:
    'There is not enough approved evidence to answer that. Placeholder copy pending the real service.',
  items: [],
  sources: [],
  clarification: null,
  request_id: 'req_mock_insufficient',
};

export const offTopicResponse: AskResponse = {
  status: 'off_topic',
  answer:
    'That falls outside what AskANU covers. Placeholder copy pending the real service.',
  items: [],
  sources: [],
  clarification: null,
  request_id: 'req_mock_off_topic',
};

/**
 * An Accommodation-shaped answer. The copy names no residence, price,
 * feature or availability result — the App never authors that content, and a
 * card must never suggest AskANU has a live room-availability check (V6 Day
 * 12).
 *
 * Record identity is the production shape frozen cross-repo on Day 12:
 * `source_id = accommodation_anu_study`, `entity_type = residence`,
 * `record_id = accommodation:residence:<slug>`. The slug and title below are
 * obvious placeholders — `example.invalid` is deliberate for bundle-safety
 * testing — but the structural shape matches what production sends, so this
 * fixture never drifts from the real contract.
 */
export const okAccommodationResponse: AskResponse = {
  status: 'ok',
  answer:
    'Placeholder answer about ANU accommodation. Real answers, including any cost or feature detail, come from the RAG service; the App never authors or hard-codes accommodation facts.',
  items: [],
  sources: [
    {
      record_id: 'accommodation:residence:placeholder-residence-a',
      source_id: 'accommodation_anu_study',
      title: 'Placeholder residence record title',
      url: 'https://example.invalid/placeholder-residence',
      domain: 'accommodation',
    },
  ],
  clarification: null,
  request_id: 'req_mock_accommodation_ok',
};

/** An ambiguous-residence clarification, read-only, in the CONVERSATION_CONTRACT shape. */
export const needsAccommodationClarificationResponse: AskResponse = {
  status: 'needs_clarification',
  answer: 'Which residence do you mean?',
  items: [],
  sources: [],
  clarification: {
    id: 'clar-residence-1',
    type: 'entity_selection',
    options: [
      {
        id: 'accommodation:residence:placeholder-residence-a',
        label: 'Placeholder residence A',
      },
      {
        id: 'accommodation:residence:placeholder-residence-b',
        label: 'Placeholder residence B',
      },
    ],
    allow_multiple: false,
  },
  request_id: 'req_mock_accommodation_clarification',
};

/** `partial` renders like `ok`; the service's own caveat carries the meaning. */
export const partialAccommodationResponse: AskResponse = {
  status: 'partial',
  answer:
    'Placeholder answer covering part of the accommodation question. The remaining detail, such as current availability, is not in the approved evidence.',
  items: [],
  sources: [
    {
      record_id: 'accommodation:residence:placeholder-residence-a',
      source_id: 'accommodation_anu_study',
      title: 'Placeholder residence record title',
      url: 'https://example.invalid/placeholder-residence',
      domain: 'accommodation',
    },
  ],
  clarification: null,
  request_id: 'req_mock_accommodation_partial',
};

/**
 * A Support-shaped answer. The copy names no hotline, opening hours, "24/7"
 * claim, guaranteed response time or personal/medical/legal advice — the App
 * never authors or hard-codes that content (V6 Day 12).
 *
 * Record identity is the production shape frozen cross-repo on Day 12:
 * `source_id = support_anusa_student_assistance`, `entity_type =
 * support_service`, `record_id = support:support_service:<slug>`. As with
 * Accommodation above, the slug/title/URL stay obvious placeholders; only the
 * structural shape needs to match production.
 */
export const okSupportResponse: AskResponse = {
  status: 'ok',
  answer:
    'Placeholder answer about an ANU support service. Real answers, including any hours or contact detail, come from the RAG service; the App never authors or hard-codes support facts.',
  items: [],
  sources: [
    {
      record_id: 'support:support_service:placeholder-service-a',
      source_id: 'support_anusa_student_assistance',
      title: 'Placeholder support service record title',
      url: 'https://example.invalid/placeholder-support-service',
      domain: 'support',
    },
  ],
  clarification: null,
  request_id: 'req_mock_support_ok',
};

/** An ambiguous support-service clarification, read-only. */
export const needsSupportClarificationResponse: AskResponse = {
  status: 'needs_clarification',
  answer: 'Which support service do you mean?',
  items: [],
  sources: [],
  clarification: {
    id: 'clar-support-1',
    type: 'entity_selection',
    options: [
      {
        id: 'support:support_service:placeholder-service-a',
        label: 'Placeholder support service A',
      },
      {
        id: 'support:support_service:placeholder-service-b',
        label: 'Placeholder support service B',
      },
    ],
    allow_multiple: false,
  },
  request_id: 'req_mock_support_clarification',
};

/** `partial` renders like `ok`; the service's own caveat carries the meaning. */
export const partialSupportResponse: AskResponse = {
  status: 'partial',
  answer:
    'Placeholder answer covering part of the support question. The remaining detail, such as current opening hours, is not in the approved evidence.',
  items: [],
  sources: [
    {
      record_id: 'support:support_service:placeholder-service-a',
      source_id: 'support_anusa_student_assistance',
      title: 'Placeholder support service record title',
      url: 'https://example.invalid/placeholder-support-service',
      domain: 'support',
    },
  ],
  clarification: null,
  request_id: 'req_mock_support_partial',
};

/**
 * Events (V6 Day 15).
 *
 * The RAG service answers event questions deterministically from persisted
 * records: one paragraph per event in the source's own wording, with the
 * stored ISO-8601 start/end, venue, address, organiser and source/cancellation
 * status only when the record has them, and an explicit "not published in the
 * stored source record" line when the question asked for a missing venue or
 * organiser. The App renders that text as sent — it never reformats a
 * timestamp, adds a field or hides one. Chat discovery may cite both the
 * official ANU record (`source_id = events_anu_official`) and an approved
 * Rubric record (`source_id = rubric_unified_search`); the split is the
 * backend's, and the fixture keeps both so the source cards are exercised.
 *
 * Record identity is the production shape frozen cross-repo on Day 15:
 * `record_id = events:event:<entity_id>`; the entity id, titles and URLs stay
 * obvious placeholders (2099 dates, `example.invalid`).
 */
export const okEventsResponse: AskResponse = {
  status: 'ok',
  answer:
    'Placeholder event A. Starts: 2099-03-02T10:00:00+11:00. Ends: 2099-03-02T11:00:00+11:00. Venue: Placeholder venue. Organiser: Placeholder organiser. Source status: published.\n\nPlaceholder event B. Starts: 2099-03-03T18:30:00+11:00. Venue: not published in the stored source record. Organiser: not published in the stored source record.',
  items: [],
  sources: [
    {
      record_id: 'events:event:placeholder-event-a',
      source_id: 'events_anu_official',
      title: 'Placeholder event A',
      url: 'https://example.invalid/events/placeholder-event-a',
      domain: 'events',
    },
    {
      record_id: 'events:event:placeholder-rubric-b',
      source_id: 'rubric_unified_search',
      title: 'Placeholder event B',
      url: 'https://example.invalid/?eid=placeholder-b',
      domain: 'events',
    },
  ],
  clarification: null,
  request_id: 'req_mock_events_ok',
};

/** `partial` renders like `ok`; the service's own caveat carries the meaning. */
export const partialEventsResponse: AskResponse = {
  status: 'partial',
  answer:
    'Placeholder event A. Starts: 2099-03-02T10:00:00+11:00. Venue: Placeholder venue.\n\nOnly one stored record matched that period; the remaining detail is not in the approved evidence.',
  items: [],
  sources: [
    {
      record_id: 'events:event:placeholder-event-a',
      source_id: 'events_anu_official',
      title: 'Placeholder event A',
      url: 'https://example.invalid/events/placeholder-event-a',
      domain: 'events',
    },
  ],
  clarification: null,
  request_id: 'req_mock_events_partial',
};

/**
 * V7 Day 3: a Jobs chat answer in the exact wire shape RAG's
 * `job_queries.py` sends today — `answer` is one line per record, and `items`
 * carries the same records as `CurrentJobItem` DTOs in the server's order.
 * Seven records, so the shared `ResultList`'s "Show more" is exercised; role C
 * has no `closing_text` (the card falls back to the stored date-only
 * `closing_date`), role F has neither, and several roles have null location,
 * classification or salary. All values are placeholders (2099,
 * `example.invalid`, synthetic numeric ids).
 */
export const okJobsResultSetResponse: AskResponse = {
  status: 'ok',
  answer: [
    'Placeholder role A. Job ID: 900101. Stored status: current. Employment types: Full time. Location: Acton campus. Classification: Level 6. Salary: Placeholder salary band. Closing information: Closes 1 January 2099.',
    'Placeholder role B. Job ID: 900102. Stored status: current. Employment types: Part time, Fixed term. Location: Acton campus. Closing information: Closes 8 January 2099.',
    'Placeholder role C with a deliberately long title so that wrapping inside the chat column is visible at narrow widths. Job ID: 900103. Stored status: current. Employment types: Casual. Classification: Level 4. Closing date: 2099-01-15.',
    'Placeholder role D. Job ID: 900104. Stored status: current. Location: Placeholder location. Closing information: Closes 22 January 2099.',
    'Placeholder role E. Job ID: 900105. Stored status: current. Employment types: Full time. Location: Placeholder location. Salary: Placeholder salary band. Closing information: Closes 29 January 2099.',
    'Placeholder role F. Job ID: 900106. Stored status: current. Employment types: Full time. Location: Placeholder location. Classification: Level 7.',
    'Placeholder role G. Job ID: 900107. Stored status: current. Employment types: Continuing. Closing information: Closes 5 February 2099.',
  ].join('\n'),
  items: [
    {
      record_id: 'jobs:job:900101',
      source_id: 'jobs_anu_search',
      job_id: '900101',
      title: 'Placeholder role A',
      employment_types: ['Full time'],
      location: 'Acton campus',
      classification: 'Level 6',
      salary: 'Placeholder salary band',
      closing_text: 'Closes 1 January 2099',
      closing_date: '2099-01-01',
      closing_at: null,
      status: 'current',
      url: 'https://example.invalid/placeholder-job-900101',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900102',
      source_id: 'jobs_anu_search',
      job_id: '900102',
      title: 'Placeholder role B',
      employment_types: ['Part time', 'Fixed term'],
      location: 'Acton campus',
      classification: null,
      salary: null,
      closing_text: 'Closes 8 January 2099',
      closing_date: '2099-01-08',
      closing_at: null,
      status: 'current',
      url: 'https://example.invalid/placeholder-job-900102',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900103',
      source_id: 'jobs_anu_search',
      job_id: '900103',
      title: 'Placeholder role C with a deliberately long title so that wrapping inside the chat column is visible at narrow widths',
      employment_types: ['Casual'],
      location: null,
      classification: 'Level 4',
      salary: null,
      closing_text: null,
      closing_date: '2099-01-15',
      closing_at: null,
      status: 'current',
      url: 'https://example.invalid/placeholder-job-900103',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900104',
      source_id: 'jobs_anu_search',
      job_id: '900104',
      title: 'Placeholder role D',
      employment_types: [],
      location: 'Placeholder location',
      classification: null,
      salary: null,
      closing_text: 'Closes 22 January 2099',
      closing_date: '2099-01-22',
      closing_at: null,
      status: 'current',
      url: 'https://example.invalid/placeholder-job-900104',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900105',
      source_id: 'jobs_anu_search',
      job_id: '900105',
      title: 'Placeholder role E',
      employment_types: ['Full time'],
      location: 'Placeholder location',
      classification: null,
      salary: 'Placeholder salary band',
      closing_text: 'Closes 29 January 2099',
      closing_date: '2099-01-29',
      closing_at: null,
      status: 'current',
      url: 'https://example.invalid/placeholder-job-900105',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900106',
      source_id: 'jobs_anu_search',
      job_id: '900106',
      title: 'Placeholder role F',
      employment_types: ['Full time'],
      location: 'Placeholder location',
      classification: 'Level 7',
      salary: null,
      closing_text: null,
      closing_date: null,
      closing_at: null,
      status: 'current',
      url: 'https://example.invalid/placeholder-job-900106',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900107',
      source_id: 'jobs_anu_search',
      job_id: '900107',
      title: 'Placeholder role G',
      employment_types: ['Continuing'],
      location: null,
      classification: null,
      salary: null,
      closing_text: 'Closes 5 February 2099',
      closing_date: '2099-02-05',
      closing_at: null,
      status: 'current',
      url: 'https://example.invalid/placeholder-job-900107',
      domain: 'jobs',
    },
  ],
  sources: [
    {
      record_id: 'jobs:job:900101',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role A',
      url: 'https://example.invalid/placeholder-job-900101',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900102',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role B',
      url: 'https://example.invalid/placeholder-job-900102',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900103',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role C with a deliberately long title so that wrapping inside the chat column is visible at narrow widths',
      url: 'https://example.invalid/placeholder-job-900103',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900104',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role D',
      url: 'https://example.invalid/placeholder-job-900104',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900105',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role E',
      url: 'https://example.invalid/placeholder-job-900105',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900106',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role F',
      url: 'https://example.invalid/placeholder-job-900106',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:900107',
      source_id: 'jobs_anu_search',
      title: 'Placeholder role G',
      url: 'https://example.invalid/placeholder-job-900107',
      domain: 'jobs',
    },
  ],
  clarification: null,
  request_id: 'req_mock_jobs_result_set',
};

/**
 * V7 Day 3 FORWARD fixture — not a shape RAG's chat path sends today. Chat
 * Events answers currently carry `items: []`; this uses the Upcoming Events
 * list DTO (`EventItem`) to prove the same shared `ResultList` renders an
 * Events list with distinct official/community provenance, a missing venue
 * and organiser, and no end time, if and when RAG attaches items to chat
 * Events answers. Placeholder values only.
 */
export const okEventsResultSetForwardResponse: AskResponse = {
  status: 'ok',
  answer:
    'Placeholder event A. Starts: 2099-03-02T10:00:00+11:00. Ends: 2099-03-02T11:00:00+11:00. Venue: Placeholder venue. Organiser: Placeholder organiser.\n\nPlaceholder event B. Starts: 2099-03-03T18:30:00+11:00. Venue: not published in the stored source record. Organiser: not published in the stored source record.',
  items: [
    {
      record_id: 'events:event:placeholder-event-a',
      source_id: 'events_anu_official',
      title: 'Placeholder event A',
      start_at: '2099-03-02T10:00:00+11:00',
      end_at: '2099-03-02T11:00:00+11:00',
      venue: 'Placeholder venue',
      organiser: 'Placeholder organiser',
      status: 'published',
      url: 'https://example.invalid/events/placeholder-event-a',
      domain: 'events',
    },
    {
      record_id: 'events:event:placeholder-rubric-b',
      source_id: 'rubric_unified_search',
      title: 'Placeholder event B',
      start_at: '2099-03-03T18:30:00+11:00',
      end_at: null,
      venue: null,
      organiser: null,
      status: null,
      url: 'https://example.invalid/?eid=placeholder-b',
      domain: 'events',
    },
  ],
  sources: [
    {
      record_id: 'events:event:placeholder-event-a',
      source_id: 'events_anu_official',
      title: 'Placeholder event A',
      url: 'https://example.invalid/events/placeholder-event-a',
      domain: 'events',
    },
    {
      record_id: 'events:event:placeholder-rubric-b',
      source_id: 'rubric_unified_search',
      title: 'Placeholder event B',
      url: 'https://example.invalid/?eid=placeholder-b',
      domain: 'events',
    },
  ],
  clarification: null,
  request_id: 'req_mock_events_result_set_forward',
};

/** The controlled error envelope from `docs/API_CONTRACT.md`. */
export const errorResponse: AskResponse = {
  status: 'error',
  answer: 'The request could not be completed.',
  items: [],
  sources: [],
  clarification: null,
  request_id: 'req_mock_error',
};

/**
 * SECURITY_BASELINE.md: model output and stored source text are untrusted. This
 * fixture puts HTML-like and `javascript:` content in every field the UI
 * renders, so safe rendering and link handling can be checked in the browser as
 * well as in `tests/safeRendering.test.tsx`.
 */
export const hostileStringsResponse: AskResponse = {
  status: 'ok',
  answer: [
    '<img src=x onerror=alert(1)><script>alert(2)</script><b>bold</b>',
    '',
    // The block formatter must not turn any of these into markup either.
    '- <img src=x onerror=alert(5)> hostile list item',
    '- **<script>alert(6)</script>** hostile emphasis inside a list item',
    '',
    '1. <b>hostile numbered item</b>',
    '',
    // The literal string named by the Day 4 grounding/security gate (G6).
    "<script>alert('x')</script>",
  ].join('\n'),
  items: [],
  sources: [
    {
      record_id: 'course:hostile:1',
      source_id: 'programs-and-courses',
      title: "<img src=x onerror=alert(3)><script>alert('x')</script>Title that must render as text",
      url: 'https://example.invalid/placeholder-course',
      domain: 'courses',
    },
    {
      record_id: 'course:hostile:2',
      source_id: 'programs-and-courses',
      title: 'Record whose stored URL is not a web address',
      // Deliberate: this must be refused as a link, not rendered as one.
      url: 'javascript:alert(4)',
      domain: 'courses',
    },
  ],
  clarification: null,
  request_id: 'req_mock_hostile',
};
