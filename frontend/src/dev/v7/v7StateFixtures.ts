import type { AskResponse } from '../../types/api';
import type {
  ComparisonField,
  NextAction,
  ResultItem,
  ResultSet,
  SelectedResultAction,
} from './proposedContract';

/**
 * Fixtures for the three Day 1 target mock states (`docs/V7_UI_CONTRACT.md`
 * §3). Same placeholder-copy rule as `mocks/askResponses.ts`: no real ANU
 * cost, vacancy, catering or eligibility fact appears here, and every URL is
 * `example.invalid`. These fixtures render only inside the dev-only
 * `/dev/v7-states` gallery; they are not reachable from — and do not affect —
 * any production path.
 *
 * `response` is a real, contract-valid `AskResponse` so the existing
 * `AssistantTurn` chrome (`AnswerBody`, `SourceCards`) can render the parts of
 * each state that already have a home in the frozen v1 envelope. The
 * `resultSet` / `comparison` / `nextAction` / `selectedResult` fields are the
 * *proposed* V7 additions the gallery renders with its own dev-only blocks.
 */

export interface V7StateFixture {
  id: string;
  title: string;
  question: string;
  response: AskResponse;
  resultSet?: ResultSet;
  comparison?: { entities: ResultItem[]; fields: ComparisonField[] };
  selectedResult?: SelectedResultAction;
  nextAction?: NextAction;
}

const RESIDENCE_A: ResultItem = {
  entity_id: 'accommodation:residence:placeholder-residence-a',
  domain: 'accommodation',
  entity_type: 'residence',
  title: 'Placeholder residence A',
  url: 'https://example.invalid/placeholder-residence-a',
  source_id: 'accommodation_anu_study',
  fields: [
    { label: 'Weekly cost', value: 'Placeholder weekly cost wording' },
    { label: 'Catering', value: 'Placeholder catering wording' },
    { label: 'Room type', value: null },
  ],
};

const RESIDENCE_B: ResultItem = {
  entity_id: 'accommodation:residence:placeholder-residence-b',
  domain: 'accommodation',
  entity_type: 'residence',
  title: 'Placeholder residence B',
  url: 'https://example.invalid/placeholder-residence-b',
  source_id: 'accommodation_anu_study',
  fields: [
    { label: 'Weekly cost', value: 'Placeholder weekly cost wording' },
    { label: 'Catering', value: null },
    { label: 'Room type', value: 'Placeholder room type wording' },
  ],
};

const RESIDENCE_C: ResultItem = {
  entity_id: 'accommodation:residence:placeholder-residence-c',
  domain: 'accommodation',
  entity_type: 'residence',
  title: 'Placeholder residence C',
  url: 'https://example.invalid/placeholder-residence-c',
  source_id: 'accommodation_anu_study',
  fields: [
    { label: 'Weekly cost', value: null },
    { label: 'Catering', value: 'Placeholder catering wording' },
    { label: 'Room type', value: 'Placeholder room type wording' },
  ],
};

/** State 1 — Accommodation discovery result set. */
export const discoveryResultSetFixture: V7StateFixture = {
  id: 'discovery-result-set',
  title: '1. Accommodation discovery result set',
  question: 'What residences are there near campus?',
  response: {
    status: 'ok',
    answer:
      'Placeholder answer naming three residence records the service found. Real answers, including any cost or feature detail, come from the RAG service; the App never authors or hard-codes accommodation facts.',
    items: [],
    sources: [
      {
        record_id: RESIDENCE_A.entity_id,
        source_id: RESIDENCE_A.source_id,
        title: RESIDENCE_A.title,
        url: RESIDENCE_A.url,
        domain: 'accommodation',
      },
    ],
    clarification: null,
    request_id: 'req_mock_v7_discovery',
  },
  resultSet: {
    result_set_id: 'rs_mock_accommodation_1',
    status: 'RESULTS',
    items: [RESIDENCE_A, RESIDENCE_B, RESIDENCE_C],
  },
};

/** State 2 — Comparison + selected result. */
export const comparisonSelectedResultFixture: V7StateFixture = {
  id: 'comparison-selected-result',
  title: '2. Comparison + selected result',
  question: 'How do Placeholder residence A and Placeholder residence B compare?',
  response: {
    status: 'ok',
    answer:
      'Placeholder answer comparing two residence records on the evidence that is actually stored for each. Placeholder residence B has no stored catering wording, so that dimension is shown as unknown rather than assumed equal or dropped.',
    items: [],
    sources: [
      {
        record_id: RESIDENCE_A.entity_id,
        source_id: RESIDENCE_A.source_id,
        title: RESIDENCE_A.title,
        url: RESIDENCE_A.url,
        domain: 'accommodation',
      },
      {
        record_id: RESIDENCE_B.entity_id,
        source_id: RESIDENCE_B.source_id,
        title: RESIDENCE_B.title,
        url: RESIDENCE_B.url,
        domain: 'accommodation',
      },
    ],
    clarification: null,
    request_id: 'req_mock_v7_comparison',
  },
  comparison: {
    entities: [RESIDENCE_A, RESIDENCE_B],
    fields: [
      { label: 'Weekly cost', values: ['Placeholder weekly cost wording', 'Placeholder weekly cost wording'] },
      { label: 'Catering', values: ['Placeholder catering wording', null] },
      { label: 'Room type', values: [null, 'Placeholder room type wording'] },
    ],
  },
  selectedResult: {
    result_set_id: 'rs_mock_accommodation_1',
    entity_id: RESIDENCE_B.entity_id,
    position: 2,
  },
};

/** State 3 — Useful unknown + next action. */
export const usefulUnknownFixture: V7StateFixture = {
  id: 'useful-unknown',
  title: '3. Useful unknown + next action',
  question: 'Is there a room available at Placeholder residence A right now?',
  response: {
    status: 'insufficient_evidence',
    answer:
      'AskANU cannot confirm current room availability from approved evidence — the stored Placeholder residence A record does not include a live vacancy figure. Placeholder copy pending the real service.',
    items: [],
    sources: [
      {
        record_id: RESIDENCE_A.entity_id,
        source_id: RESIDENCE_A.source_id,
        title: RESIDENCE_A.title,
        url: RESIDENCE_A.url,
        domain: 'accommodation',
      },
    ],
    clarification: null,
    request_id: 'req_mock_v7_unknown',
  },
  nextAction: {
    label: 'Check current availability on the official residence page',
    url: RESIDENCE_A.url,
  },
};

/**
 * Also exercised by the safe-rendering test: a hostile-strings variant of the
 * useful-unknown state, and a `javascript:` next-action URL that must be
 * refused as a link. Not part of the three acceptance-reference screenshots.
 */
export const hostileUsefulUnknownFixture: V7StateFixture = {
  id: 'useful-unknown-hostile',
  title: '3b. Useful unknown — hostile strings (test-only)',
  question: '<script>alert(1)</script>',
  response: {
    status: 'insufficient_evidence',
    answer: '<img src=x onerror=alert(2)><script>alert(3)</script>Placeholder unknown answer.',
    items: [],
    sources: [
      {
        record_id: 'accommodation:residence:hostile',
        source_id: 'accommodation_anu_study',
        title: '<script>alert(6)</script>Hostile title',
        url: 'https://example.invalid/hostile',
        domain: 'accommodation',
      },
    ],
    clarification: null,
    request_id: 'req_mock_v7_unknown_hostile',
  },
  nextAction: {
    label: 'Hostile next action label <script>alert(4)</script>',
    // Deliberate: must be refused as a link, not rendered as one.
    url: 'javascript:alert(5)',
  },
};

export const V7_STATE_FIXTURES: V7StateFixture[] = [
  discoveryResultSetFixture,
  comparisonSelectedResultFixture,
  usefulUnknownFixture,
];
