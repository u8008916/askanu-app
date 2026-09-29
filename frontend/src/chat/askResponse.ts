import type {
  AnswerState,
  AskResponse,
  AskStatus,
  Clarification,
  ClarificationOption,
  ResponseAction,
  ResultPage,
  Source,
} from '../types/api';

/**
 * Runtime validation of the `/api/v1/ask` envelope.
 *
 * SECURITY_BASELINE.md requires request/response schema validation. TypeScript
 * types vanish at runtime, so a real response from the network has to be
 * checked before it reaches React state and the renderer.
 *
 * The frozen v1 response envelope requires `status`, `answer`, `items`,
 * `sources`, `clarification` and `request_id`. Missing required fields are a
 * contract mismatch, not something the App boundary should silently repair.
 *
 * A malformed source rejects the whole envelope rather than being dropped.
 * Quietly discarding evidence would leave a grounded-looking answer with
 * missing provenance, which the provenance invariant does not allow.
 *
 * This is shape validation only. `isSafeHttpUrl` in `util/safeUrl.ts` still
 * decides at render time whether a stored URL may become a link.
 */

const STATUSES: readonly string[] = [
  'ok',
  'partial',
  'needs_clarification',
  'insufficient_evidence',
  'off_topic',
  'error',
];

const ANSWER_STATES: readonly string[] = [
  'CONFIRMED',
  'DERIVED',
  'PARTIAL',
  'UNKNOWN',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** A stable ResultSet position (`start_ordinal`/`next_ordinal`): a finite integer >= 1. */
function isOrdinal(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** A count of items actually returned on a page: a finite integer >= 0. */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseSource(value: unknown): Source | null {
  if (!isRecord(value)) {
    return null;
  }

  const { record_id, source_id, title, url, domain } = value;

  if (
    !isString(record_id) ||
    !isString(source_id) ||
    !isString(title) ||
    !isString(url) ||
    !isString(domain)
  ) {
    return null;
  }

  return { record_id, source_id, title, url, domain };
}

function parseOption(value: unknown): ClarificationOption | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, label } = value;

  return isString(id) && isString(label) ? { id, label } : null;
}

function parseClarification(
  value: unknown,
): Clarification | null | undefined {
  if (value === null) {
    return null;
  }

  // `undefined` means the required contract field was omitted or malformed.
  if (value === undefined || !isRecord(value)) {
    return undefined;
  }

  const { id, type, options, allow_multiple } = value;

  if (!isString(id) || !isString(type) || !Array.isArray(options)) {
    return undefined;
  }

  if (typeof allow_multiple !== 'boolean') {
    return undefined;
  }

  const parsedOptions: ClarificationOption[] = [];

  for (const option of options) {
    const parsed = parseOption(option);

    if (parsed === null) {
      return undefined;
    }

    parsedOptions.push(parsed);
  }

  // Order is significant: it is what `first` and `second` refer to.
  return { id, type, options: parsedOptions, allow_multiple };
}

/** Distinguishes "the key was absent" from a legitimate parsed `null`. */
const ABSENT = Symbol('absent');

function parseAction(value: unknown): ResponseAction | null {
  if (!isRecord(value)) {
    return null;
  }

  const { type, label, url, record_id, source_id } = value;

  if (
    type !== 'application' ||
    !isString(label) ||
    !isString(url) ||
    !isString(record_id) ||
    !isString(source_id)
  ) {
    return null;
  }

  return { type, label, url, record_id, source_id };
}

/**
 * `actions` is a required contract field going forward (V7 Day 4), but a
 * pre-#38 backend or a controlled App-boundary error envelope omits it
 * entirely — that degrades to `[]` rather than a parse failure, exactly like
 * `conversation_state` degrading to "no state held" above. A *present but
 * malformed* entry rejects the whole envelope, the same rule `sources` uses:
 * an action renders as a clickable call-to-action, so a partly-trusted one
 * would misrepresent what the backend actually validated.
 */
function parseActions(value: unknown): ResponseAction[] | undefined {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed: ResponseAction[] = [];

  for (const action of value) {
    const item = parseAction(action);

    if (item === null) {
      return undefined;
    }

    parsed.push(item);
  }

  return parsed;
}

function parseAnswerState(
  value: unknown,
): AnswerState | null | undefined | typeof ABSENT {
  if (value === undefined) {
    return ABSENT;
  }

  if (value === null) {
    return null;
  }

  return isString(value) && ANSWER_STATES.includes(value)
    ? (value as AnswerState)
    : undefined;
}

function parseResultPage(
  value: unknown,
): ResultPage | null | undefined | typeof ABSENT {
  if (value === undefined) {
    return ABSENT;
  }

  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const { result_set_id, start_ordinal, returned, has_more, next_ordinal } =
    value;

  if (
    !isString(result_set_id) ||
    !isOrdinal(start_ordinal) ||
    !isCount(returned) ||
    typeof has_more !== 'boolean' ||
    !(next_ordinal === null || isOrdinal(next_ordinal))
  ) {
    return undefined;
  }

  return { result_set_id, start_ordinal, returned, has_more, next_ordinal };
}

/** Returns the validated envelope, or `null` when it does not match the contract. */
export function parseAskResponse(value: unknown): AskResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    status,
    answer,
    items,
    sources,
    clarification,
    request_id,
    conversation_state,
    answer_state,
    actions,
    result_page,
  } = value;

  if (!isString(status) || !STATUSES.includes(status)) {
    return null;
  }

  if (!isString(answer)) {
    return null;
  }

  if (!Array.isArray(items)) {
    return null;
  }

  if (!Array.isArray(sources)) {
    return null;
  }

  if (!isString(request_id)) {
    return null;
  }

  const parsedSources: Source[] = [];

  for (const source of sources) {
    const parsed = parseSource(source);

    if (parsed === null) {
      return null;
    }

    parsedSources.push(parsed);
  }

  const parsedClarification = parseClarification(clarification);

  if (parsedClarification === undefined) {
    return null;
  }

  /*
   * V7: `conversation_state` is opaque (`chat/sessionState.ts`) — this never
   * inspects its internal shape, only whether the field is present at all.
   * Absent or explicit `null` (a pre-V7 backend, or a controlled error
   * envelope built before RAG is reached) degrades to "no state carried":
   * the key is left off the parsed result entirely, matching the optional
   * field in `types/api.ts`. Present but not a JSON object (a string,
   * number, array, boolean) is off-contract — RAG's schema-v1 state is
   * always an object — and rejects the whole envelope, the same strictness
   * every other field here uses.
   */
  let stateField: { conversation_state?: AskResponse['conversation_state'] } = {};
  if (conversation_state !== undefined && conversation_state !== null) {
    if (!isRecord(conversation_state)) {
      return null;
    }
    stateField = { conversation_state };
  }

  const parsedActions = parseActions(actions);

  if (parsedActions === undefined) {
    return null;
  }

  const parsedAnswerState = parseAnswerState(answer_state);

  if (parsedAnswerState === undefined) {
    return null;
  }

  const answerStateField: { answer_state?: AskResponse['answer_state'] } =
    parsedAnswerState === ABSENT ? {} : { answer_state: parsedAnswerState };

  const parsedResultPage = parseResultPage(result_page);

  if (parsedResultPage === undefined) {
    return null;
  }

  const resultPageField: { result_page?: AskResponse['result_page'] } =
    parsedResultPage === ABSENT ? {} : { result_page: parsedResultPage };

  return {
    status: status as AskStatus,
    answer,
    items,
    sources: parsedSources,
    clarification: parsedClarification,
    request_id,
    actions: parsedActions,
    ...stateField,
    ...answerStateField,
    ...resultPageField,
  };
}
