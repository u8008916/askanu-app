import type {
  AskResponse,
  AskStatus,
  Clarification,
  ClarificationOption,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
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

  return {
    status: status as AskStatus,
    answer,
    items,
    sources: parsedSources,
    clarification: parsedClarification,
    request_id,
  };
}
