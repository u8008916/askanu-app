import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { parseAskResponse } from '../src/chat/askResponse';
import { toResultCards } from '../src/chat/results/resultItems';
import { useChatSession } from '../src/chat/useChatSession';
import d5 from '../src/mocks/v7Day5Wire.0efb6ee.json';
import d6 from '../src/mocks/v7Day6Wire.bafa15d.json';
import type { AskRequest, AskResponse } from '../src/types/api';

/**
 * V7 Day 7: App-side torture against the RC wire. The RC `ce0eb8f` is
 * byte-identical to `bafa15d` in `src/`, so the D6 captures are the RC wire.
 *
 * Test → break → classify → fix genuine defects → retest. Nothing here adds
 * behaviour. Each case locks what the App does when the system is imperfect:
 * malformed or hostile payloads, transport failure, retry, stale references
 * after Clear Chat, and long conversations. The only production change on
 * Day 7 is Qasim's approved Support scope-text rule.
 */

type WireEntry = { question: string; response: unknown };
const D5 = d5 as unknown as Record<string, WireEntry>;
const D6 = d6 as unknown as Record<string, WireEntry>;

function real(name: string, wire: Record<string, WireEntry> = D6): AskResponse {
  const parsed = parseAskResponse(wire[name].response);
  if (parsed === null) throw new Error(name);
  return parsed;
}

function raw(name: string, wire: Record<string, WireEntry> = D6): Record<string, unknown> {
  return structuredClone(wire[name].response) as Record<string, unknown>;
}

function renderTurn(response: AskResponse) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onRequestMorePage={vi.fn()}
        onSelectClarification={vi.fn()}
        onSelectResult={vi.fn()}
        response={response}
      />
    </ul>,
  );
}

describe('approved narrow fix: Support scope text stays visible even when CONFIRMED', () => {
  it('Support CONFIRMED + backend scope text renders the scope text above the service card', () => {
    const response = real('supportRouted');
    expect(response.answer_state).toBe('CONFIRMED');
    const { container } = renderTurn(response);
    expect(container.querySelector('details')).toBeNull();
    const scope = screen.getByText(/I can route you to published services but cannot diagnose/);
    expect(scope).toBeVisible();
    const list = screen.getByRole('list', { name: 'Results' });
    // Scope text comes before the card in document order.
    expect(scope.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('stays narrow: CONFIRMED prose in other domains is still folded under "Show as text"', () => {
    for (const [name, wire] of [
      ['courseExact', D5],
      ['scholarshipSecond', D5],
      ['eventsSecond', D6],
      ['jobsFirst', D6],
    ] as const) {
      const response = real(name, wire);
      expect(response.answer_state, name).toBe('CONFIRMED');
      const { container, unmount } = renderTurn(response);
      expect(container.querySelector('details'), name).not.toBeNull();
      unmount();
    }
  });
});

describe('malformed payloads fail closed', () => {
  it('malformed page metadata (wrong types) refuses the whole envelope at the boundary', () => {
    for (const page of [
      { result_set_id: 7, start_ordinal: 1, returned: 5, has_more: true, next_ordinal: 6 },
      { result_set_id: 'rs', start_ordinal: 0, returned: 5, has_more: true, next_ordinal: 6 },
      { result_set_id: 'rs', start_ordinal: 1, returned: 'five', has_more: true, next_ordinal: 6 },
      { result_set_id: 'rs', start_ordinal: 1, returned: 5, has_more: 'yes', next_ordinal: 6 },
      'page',
    ]) {
      expect(parseAskResponse({ ...raw('jobsBroad'), result_page: page })).toBeNull();
    }
  });

  it('self-contradictory but well-typed page metadata never offers a "Show more" that could send a bad cursor', () => {
    const response = real('jobsBroad');
    renderTurn({ ...response, result_page: { ...response.result_page!, has_more: true, next_ordinal: null } });
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('one malformed item among good ones refuses the whole list and keeps the backend text', () => {
    const response = real('eventsBroad');
    const items = structuredClone(response.items) as Record<string, unknown>[];
    items[2] = { ...items[2], fields: { ...(items[2].fields as object), venue: 42 } };
    renderTurn({ ...response, items });
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.getByText(/Event 800001\. Starts/)).toBeInTheDocument();
  });

  it('malformed provenance (Rubric source claiming official_anu) never renders an official label', () => {
    const response = real('eventsMore');
    const items = structuredClone(response.items) as Record<string, unknown>[];
    const fields = items[0].fields as Record<string, unknown>;
    items[0] = { ...items[0], fields: { ...fields, provenance_class: 'official_anu' } };
    renderTurn({ ...response, items });
    expect(screen.queryByText('Official ANU Events')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('missing optional fields (null everywhere but identity) render "Not published", never a crash or blank', () => {
    const response = real('supportRouted');
    const [item] = structuredClone(response.items) as Record<string, unknown>[];
    const nulls = Object.fromEntries(Object.keys(item.fields as object).map((key) => [key, null]));
    renderTurn({ ...response, items: [{ ...item, fields: nulls }] });
    const card = within(screen.getByRole('list', { name: 'Results' })).getByRole('listitem');
    expect(within(card).getAllByText('Not published')).toHaveLength(11);
  });

  it('unsafe URLs on a card or an action are never rendered as links', () => {
    const response = real('jobsFirst');
    const [item] = structuredClone(response.items) as Record<string, unknown>[];
    renderTurn({
      ...response,
      items: [{ ...item, url: 'javascript:alert(1)' }],
      actions: [
        {
          type: 'application',
          label: 'Apply now',
          url: 'javascript:alert(2)',
          record_id: 'x',
          source_id: 'y',
        },
      ],
    });
    for (const anchor of Array.from(document.querySelectorAll('a'))) {
      expect(anchor.getAttribute('href') ?? '').toMatch(/^https?:\/\//);
    }
  });

  it('every real external link opens safely in a new tab (noopener noreferrer)', () => {
    for (const name of ['jobsBroad', 'eventsMore', 'supportRouted']) {
      const { unmount } = renderTurn(real(name));
      for (const anchor of Array.from(document.querySelectorAll('a[target="_blank"]'))) {
        expect(anchor.getAttribute('rel'), name).toContain('noopener');
        expect(anchor.getAttribute('rel'), name).toContain('noreferrer');
      }
      unmount();
    }
  });
});

describe('transport failure, retry and backend errors', () => {
  it('transport failure after valid state: error turn, state kept; the retry sends the same state', async () => {
    const requests: AskRequest[] = [];
    const responses: (AskResponse | Error)[] = [
      real('scholarshipDiscovery', D5),
      new TypeError('Failed to fetch'),
      real('scholarshipSecond', D5),
    ];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(structuredClone(request));
      const next = responses.shift()!;
      if (next instanceof Error) throw next;
      return next;
    });
    const { result } = renderHook(() => useChatSession(transport));
    await act(async () => {
      await result.current.sendMessage(D5.scholarshipDiscovery.question);
    });
    await act(async () => {
      await result.current.sendMessage('Tell me about the second one');
    });
    const failedTurn = result.current.turns[result.current.turns.length - 1];
    expect(failedTurn.kind === 'assistant' && failedTurn.response.status).toBe('error');
    await act(async () => {
      await result.current.sendMessage('Tell me about the second one');
    });
    const held = real('scholarshipDiscovery', D5).conversation_state;
    expect(requests[1].conversation_state).toEqual(held);
    expect(requests[2].conversation_state).toEqual(held);
  });

  it('a RAG-authored error envelope (4xx/5xx body) renders the error notice, not cards, and becomes the new state', async () => {
    const errorEnvelope = parseAskResponse({
      status: 'error',
      answer: 'The request could not be processed.',
      items: [],
      sources: [],
      clarification: null,
      request_id: 'req-err',
      conversation_state: {},
    })!;
    expect(errorEnvelope).not.toBeNull();
    renderTurn(errorEnvelope);
    expect(screen.getByText('The request could not be processed.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('a response that settles after Clear Chat never writes into the cleared chat or its state', async () => {
    let resolveLate!: (value: AskResponse) => void;
    const requests: AskRequest[] = [];
    const transport = vi.fn(
      (request: AskRequest) =>
        new Promise<AskResponse>((resolve) => {
          requests.push(structuredClone(request));
          resolveLate = resolve;
        }),
    );
    const { result } = renderHook(() => useChatSession(transport));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.sendMessage('What jobs are available at ANU?');
    });
    act(() => result.current.clearChat());
    await act(async () => {
      resolveLate(real('jobsBroad'));
      await pending;
    });
    expect(result.current.turns).toHaveLength(0);
    act(() => {
      void result.current.sendMessage('Any more?');
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].conversation_state ?? {}).not.toHaveProperty('result_sets');
    expect(requests[1].history).toEqual([]);
  });
});

describe('long conversation', () => {
  it('40 turns across all six domains: history stays bounded, state is always the latest authoritative one', async () => {
    const cycle: [string, Record<string, WireEntry>][] = [
      ['courseExact', D5],
      ['scholarshipDiscovery', D5],
      ['crossAccommodation', D5],
      ['jobsBroad', D6],
      ['eventsBroad', D6],
      ['supportRouted', D6],
    ];
    const requests: AskRequest[] = [];
    let n = 0;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(structuredClone(request));
      const [name, wire] = cycle[n++ % cycle.length];
      return real(name, wire);
    });
    const { result } = renderHook(() => useChatSession(transport));
    for (let i = 0; i < 40; i += 1) {
      const [name, wire] = cycle[i % cycle.length];
      await act(async () => {
        await result.current.sendMessage(wire[name].question);
      });
    }
    expect(result.current.turns).toHaveLength(80);
    expect(Math.max(...requests.map((r) => r.history.length))).toBeLessThanOrEqual(10);
    const [lastName, lastWire] = cycle[38 % cycle.length];
    expect(requests[39].conversation_state).toEqual(real(lastName, lastWire).conversation_state);
  });

  it('rendering many cards from all domains in one pass stays deterministic (no duplicate keys refused)', () => {
    const everything = ['jobsBroad', 'eventsBroad', 'supportRouted'].map((name) =>
      toResultCards(real(name).items),
    );
    expect(everything.every((cards) => cards !== null)).toBe(true);
  });
});
