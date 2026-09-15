import type { EventItem, JobItem, ListResponse } from '../types/api';

/**
 * Runtime validation of the two list envelopes.
 *
 * Same rule as `chat/askResponse.ts`: a network response is checked before it
 * reaches React state, a malformed item rejects the whole envelope rather than
 * being dropped (a silently shortened list would misrepresent the server's
 * deterministic order), and this is shape validation only — `isSafeHttpUrl`
 * still decides at render time whether a stored URL may become a link.
 *
 * `status` is not restricted here: the list contract returns `ok` on success
 * and the controlled `error` envelope on failure, and the caller decides what
 * each means for the panel.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function parseJobItem(value: unknown): JobItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    record_id,
    source_id,
    job_id,
    title,
    employment_types,
    location,
    classification,
    salary,
    closing_text,
    closing_date,
    closing_at,
    status,
    url,
    domain,
  } = value;

  if (
    !isString(record_id) ||
    !isString(source_id) ||
    !isString(job_id) ||
    !isString(title) ||
    !isStringArray(employment_types) ||
    !isNullableString(location) ||
    !isNullableString(classification) ||
    !isNullableString(salary) ||
    !isNullableString(closing_text) ||
    !isNullableString(closing_date) ||
    !isNullableString(closing_at) ||
    status !== 'current' ||
    !isString(url) ||
    domain !== 'jobs'
  ) {
    return null;
  }

  return {
    record_id,
    source_id,
    job_id,
    title,
    employment_types,
    location,
    classification,
    salary,
    closing_text,
    closing_date,
    closing_at,
    status,
    url,
    domain,
  };
}

export function parseEventItem(value: unknown): EventItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const { record_id, source_id, title, start_at, end_at, venue, organiser, url, domain } =
    value;

  if (
    !isString(record_id) ||
    !isString(source_id) ||
    !isString(title) ||
    !isString(start_at) ||
    !isNullableString(end_at) ||
    !isNullableString(venue) ||
    !isNullableString(organiser) ||
    !isString(url) ||
    domain !== 'events'
  ) {
    return null;
  }

  return { record_id, source_id, title, start_at, end_at, venue, organiser, url, domain };
}

/** Returns the validated envelope, or `null` when it does not match the contract. */
export function parseListResponse<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): ListResponse<T> | null {
  if (!isRecord(value)) {
    return null;
  }

  const { status, items, request_id } = value;

  if (!isString(status) || !Array.isArray(items) || !isString(request_id)) {
    return null;
  }

  const parsedItems: T[] = [];

  for (const item of items) {
    const parsed = parseItem(item);

    if (parsed === null) {
      return null;
    }

    parsedItems.push(parsed);
  }

  return { status: status as ListResponse<T>['status'], items: parsedItems, request_id };
}
