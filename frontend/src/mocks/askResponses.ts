import type { AskResponse } from '../types/api';

/**
 * Fixtures shaped to the frozen `/api/v1/ask` envelope in `docs/API_CONTRACT.md`.
 *
 * These stand in for the RAG service until Day 3 wires the real endpoint. They
 * are reached only through `chat/askTransport.ts`, never imported by a
 * component, so replacing the transport on Day 3 removes them from the render
 * path in one edit.
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
  answer: '<img src=x onerror=alert(1)><script>alert(2)</script><b>bold</b>',
  items: [],
  sources: [
    {
      record_id: 'course:hostile:1',
      source_id: 'programs-and-courses',
      title: '<img src=x onerror=alert(3)>Title that must render as text',
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
