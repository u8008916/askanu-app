import type { AskResponse } from '../types/api';
import type { AskTransport } from '../chat/askTransport';
import {
  errorResponse,
  hostileStringsResponse,
  insufficientEvidenceResponse,
  needsClarificationResponse,
  offTopicResponse,
  okMultiSourceResponse,
  okResponse,
  partialResponse,
} from '../mocks/askResponses';

/**
 * Development-only transport.
 *
 * Day 3 made `askApi` the production path. This module survives so that every
 * response state can still be exercised in a browser without the RAG service,
 * and so the UI test suite has deterministic fixtures. It is reached only when
 * `VITE_USE_MOCK_TRANSPORT=1` in a dev build; `chat/askTransport.ts` selects it,
 * and a production build drops the branch and this module with it.
 *
 * The mock never inspects the question. Routing answers off question text would
 * be hardcoding answer content into the send path, which Day 3 forbids; the
 * scenario is chosen by an explicit dev control instead.
 */

export interface MockScenario {
  id: string;
  label: string;
  response: AskResponse;
}

export const MOCK_SCENARIOS: MockScenario[] = [
  { id: 'ok', label: 'ok — one source', response: okResponse },
  {
    id: 'ok-multi',
    label: 'ok — several sources',
    response: okMultiSourceResponse,
  },
  { id: 'partial', label: 'partial', response: partialResponse },
  {
    id: 'needs-clarification',
    label: 'needs_clarification',
    response: needsClarificationResponse,
  },
  {
    id: 'insufficient',
    label: 'insufficient_evidence',
    response: insufficientEvidenceResponse,
  },
  { id: 'off-topic', label: 'off_topic', response: offTopicResponse },
  { id: 'error', label: 'error', response: errorResponse },
  {
    id: 'hostile',
    label: 'ok — hostile strings',
    response: hostileStringsResponse,
  },
  { id: 'reject', label: 'transport failure', response: errorResponse },
];

const DEFAULT_SCENARIO_ID = 'ok';

let selectedScenarioId = DEFAULT_SCENARIO_ID;

export function getMockScenarioId(): string {
  return selectedScenarioId;
}

/** Set by the dev fixture picker and by tests. No production caller exists. */
export function setMockScenarioId(id: string): void {
  selectedScenarioId = id;
}

export function resetMockScenario(): void {
  selectedScenarioId = DEFAULT_SCENARIO_ID;
}

/** Long enough for the loading state to be real, short enough not to drag. */
export const MOCK_LATENCY_MS = 350;

class AbortError extends Error {
  constructor() {
    super('The request was aborted.');
    this.name = 'AbortError';
  }
}

/**
 * Resolves the selected fixture after a short delay so the pending state is
 * genuinely exercised rather than skipped in a single tick.
 *
 * `request` is accepted and ignored on purpose: the App builds a real contract
 * request, and the mock stands in for the service, not for the request.
 */
export const askMock: AskTransport = (_request, signal) =>
  new Promise<AskResponse>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      const scenario = MOCK_SCENARIOS.find(
        (candidate) => candidate.id === selectedScenarioId,
      );
      // `transport failure` models a network/timeout error, where no envelope
      // ever arrives. The session turns that into an `error` turn itself.
      if (scenario?.id === 'reject') {
        reject(new Error('Mock transport failure.'));
        return;
      }
      resolve(scenario?.response ?? okResponse);
    }, MOCK_LATENCY_MS);

    function onAbort() {
      clearTimeout(timer);
      reject(new AbortError());
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
