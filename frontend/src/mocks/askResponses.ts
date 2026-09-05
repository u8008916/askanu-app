import type { AskResponse } from '../types/api';

/**
 * Fixtures shaped to the frozen `/api/v1/ask` envelope in `docs/API_CONTRACT.md`.
 *
 * These are NOT in the Day 1 render path — nothing in `src/` imports them. They
 * exist so Day 2 has contract-shaped data to build source cards and response
 * states against without hardcoding answers into the production path.
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
    'There is not enough approved evidence to answer that. Placeholder copy pending Day 2.',
  items: [],
  sources: [],
  clarification: null,
  request_id: 'req_mock_insufficient',
};

export const errorResponse: AskResponse = {
  status: 'error',
  answer: 'The request could not be completed.',
  items: [],
  sources: [],
  clarification: null,
  request_id: 'req_mock_error',
};
