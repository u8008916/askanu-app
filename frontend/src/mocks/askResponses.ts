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
 * App does not compute it. Record ids follow the Scholarships pattern
 * (`<domain>:<kind>:<slug>`) as a stand-in only: the Jobs identity shape is
 * not frozen yet and the App never parses it.
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
      record_id: 'jobs:job:placeholder-role-a',
      source_id: 'anu-jobs',
      title: 'Placeholder role A',
      url: 'https://example.invalid/placeholder-job-a',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:placeholder-role-b',
      source_id: 'anu-jobs',
      title: 'Placeholder role B',
      url: 'https://example.invalid/placeholder-job-b',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:placeholder-role-c',
      source_id: 'anu-jobs',
      title:
        'Placeholder role C with a deliberately long title so that wrapping inside the chat column is visible at narrow widths',
      url: 'https://example.invalid/placeholder-job-c-with-a-deliberately-long-path-segment-that-does-not-break-on-spaces',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:placeholder-role-d',
      source_id: 'anu-jobs',
      title: 'Placeholder role D',
      url: 'https://example.invalid/placeholder-job-d',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:placeholder-role-e',
      source_id: 'anu-jobs',
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
      record_id: 'jobs:job:placeholder-role-a',
      source_id: 'anu-jobs',
      title: 'Placeholder role A',
      url: 'https://example.invalid/placeholder-job-a',
      domain: 'jobs',
    },
    {
      record_id: 'jobs:job:placeholder-role-b',
      source_id: 'anu-jobs',
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
