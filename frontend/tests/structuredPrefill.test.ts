import { describe, expect, it } from 'vitest';
import { resolveStructuredPayload } from '../src/chat/structuredPrefill';

describe('resolveStructuredPayload (V7 Day 4 prefill-pairing rule)', () => {
  it('attaches the structured payload when the sent text matches the prefill exactly', () => {
    const pending = {
      prefillText: 'Tell me more about Placeholder residence A',
      selectedResult: {
        result_set_id: 'rs:accommodation:1',
        canonical_id: 'placeholder-residence-a',
        ordinal: 1,
      },
    };
    expect(resolveStructuredPayload(pending, pending.prefillText)).toEqual({
      selectedResult: pending.selectedResult,
      clarificationSelection: undefined,
    });
  });

  it('drops the structured payload when the sent text was edited, falling back to a plain send', () => {
    const pending = {
      prefillText: 'Tell me more about Placeholder residence A',
      selectedResult: {
        result_set_id: 'rs:accommodation:1',
        canonical_id: 'placeholder-residence-a',
        ordinal: 1,
      },
    };
    expect(
      resolveStructuredPayload(pending, 'Tell me more about the cheapest one'),
    ).toBeUndefined();
  });

  it('returns undefined when nothing is pending (an ordinary free-text send)', () => {
    expect(resolveStructuredPayload(null, 'What are the prerequisites for COMP1110?')).toBeUndefined();
  });

  it('carries a clarification_selection payload the same way', () => {
    const pending = {
      prefillText: 'Both Placeholder residence A and Placeholder residence B',
      clarificationSelection: {
        clarification_id: 'clar-accommodation-selection',
        option_ids: [
          'accommodation:residence:placeholder-residence-a',
          'accommodation:residence:placeholder-residence-b',
        ],
      },
    };
    expect(resolveStructuredPayload(pending, pending.prefillText)).toEqual({
      selectedResult: undefined,
      clarificationSelection: pending.clarificationSelection,
    });
  });
});
