import { act, render, renderHook, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { resultCardNumber, showAsTextDetails } from './helpers';
import userEvent from '@testing-library/user-event';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { parseAskResponse } from '../src/chat/askResponse';
import { toResultCards } from '../src/chat/results/resultItems';
import { useChatSession } from '../src/chat/useChatSession';
import d5 from '../src/mocks/v7Day5Wire.0efb6ee.json';
import d6 from '../src/mocks/v7Day6Wire.bafa15d.json';
import type {
  AskRequest,
  AskResponse,
  ResultPageRequest,
  SelectedResultRequest,
} from '../src/types/api';

/**
 * V7 Day 6: Jobs, Events and Support, integrated against Carmen's published
 * Day 6 RAG `bafa15ded1afd6f2eecdf8781a5e4eb12cefffe4`.
 *
 * `v7Day6Wire.bafa15d.json` holds verbatim `/api/v1/ask` bodies captured with
 * Carmen's own `tests/test_v7_day6_journeys.py` fixtures (synthetic, clock
 * fixed to 14 Sep 2026). Every test pushes those bytes through
 * `parseAskResponse` first.
 *
 * The contract delta from D5 `0efb6ee`:
 * - `PublicJobItem` gains `canonical_id`/`result_set_id`/`ordinal`.
 * - Events and Support now emit `type:"result"` items, with frozen key sets
 *   and no labels.
 * - Jobs listings are `PARTIAL`, and their prose states the population is
 *   incomplete.
 * - `selected_result`/`result_page` are accepted for Jobs and Events.
 */

type WireEntry = { question: string; request_extra: Record<string, unknown>; response: unknown };
const D6 = d6 as unknown as Record<string, WireEntry>;
const D5 = d5 as unknown as Record<string, WireEntry>;

function real(name: string, wire: Record<string, WireEntry> = D6): AskResponse {
  const parsed = parseAskResponse(wire[name].response);
  if (parsed === null) {
    throw new Error(`real wire "${name}" was refused by parseAskResponse`);
  }
  return parsed;
}

function renderTurn(
  response: AskResponse,
  {
    onSelectResult = vi.fn(),
    onRequestMorePage = vi.fn(),
  }: {
    onSelectResult?: (payload: { prefillText: string; selectedResult: SelectedResultRequest }) => void;
    onRequestMorePage?: (page: ResultPageRequest) => void;
  } = {},
) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onRequestMorePage={onRequestMorePage}
        onSelectClarification={vi.fn()}
        onSelectResult={onSelectResult}
        response={response}
      />
    </ul>,
  );
}

function cards(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem');
}

function cardNumber(card: HTMLElement): string {
  return resultCardNumber(card);
}

function cardFields(card: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    Array.from(card.querySelectorAll('dt')).map((dt) => [
      dt.textContent ?? '',
      dt.nextElementSibling?.textContent ?? '',
    ]),
  );
}

const ADJUDICATION = /\b(you have a valid|valid appeal|you will win|appeal will succeed|marker was wrong|you are eligible|you qualify|best (job|match|fit)|most suitable|recommended for you)\b/i;

describe('the real bafa15d wire passes the App response boundary', () => {
  it.each(Object.keys(D6).filter((key) => !key.startsWith('_')))('%s parses and renders', (name) => {
    const response = real(name);
    if (response.items.length > 0) {
      expect(toResultCards(response.items), name).not.toBeNull();
    }
  });
});

describe('Jobs (real bafa15d wire)', () => {
  it('a listing keeps backend order and ordinals 1–5, and carries each card’s selection triple', () => {
    const response = real('jobsBroad');
    const models = toResultCards(response.items)!;
    expect(models.map((m) => m.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(models.every((m) => m.resultSetId === response.result_page!.result_set_id)).toBe(true);
    expect(models[0].canonicalId).toBe('700001');
  });

  it('the listing is PARTIAL: RAG’s "population is incomplete" sentence stays in view', () => {
    const response = real('jobsBroad');
    expect(response.answer_state).toBe('PARTIAL');
    const { container } = renderTurn(response);
    expect(showAsTextDetails(container)).toBeNull();
    expect(screen.getByText(/population is incomplete/)).toBeVisible();
    expect(document.body.textContent ?? '').not.toMatch(ADJUDICATION);
  });

  it('zero matches is the backend’s own "does not establish that no such ANU jobs exist", never "There are no jobs"', () => {
    const response = real('jobsEmpty');
    renderTurn(response);
    expect(screen.getByText(/does not establish that no such ANU jobs exist/)).toBeInTheDocument();
    expect(screen.queryByText(/there are no jobs|no jobs (found|available)/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('"Ask about this" sends the exact Jobs triple with the neutral prefill', async () => {
    const user = userEvent.setup();
    const onSelectResult = vi.fn();
    const response = real('jobsBroad');
    renderTurn(response, { onSelectResult });
    await user.click(within(cards()[1]).getByRole('button', { name: /Ask about this/ }));
    expect(onSelectResult).toHaveBeenCalledWith({
      prefillText: 'Tell me about it',
      selectedResult: {
        result_set_id: response.result_page!.result_set_id,
        canonical_id: '700002',
        ordinal: 2,
      },
    });
  });

  it('"Show more" requests the server cursor; continuation keeps ordinals 6–7', async () => {
    const user = userEvent.setup();
    const onRequestMorePage = vi.fn();
    const broad = real('jobsBroad');
    renderTurn(broad, { onRequestMorePage });
    await user.click(screen.getByRole('button', { name: /^Show more/ }));
    expect(onRequestMorePage).toHaveBeenCalledWith({
      result_set_id: broad.result_page!.result_set_id,
      start_ordinal: 6,
      limit: 5,
    });
    const more = toResultCards(real('jobsMore').items)!;
    expect(more.map((m) => m.ordinal)).toEqual([6, 7]);
  });

  it('"the first one" shows backend ordinal 1; closing-this-week is the backend’s one record', () => {
    renderTurn(real('jobsFirst'));
    expect(cards().map(cardNumber)).toEqual(['1']);
    expect(toResultCards(real('jobsClosingWeek').items)!.map((m) => m.title)).toEqual([
      'Closes this week',
    ]);
  });

  it('a malformed Jobs ordinal or result_set_id refuses the whole list', () => {
    const [first, second] = real('jobsBroad').items as Record<string, unknown>[];
    expect(toResultCards([first, { ...second, ordinal: 0 }])).toBeNull();
    expect(toResultCards([first, { ...second, result_set_id: 7 }])).toBeNull();
    expect(toResultCards([first, { ...second, canonical_id: null }])).toBeNull();
  });
});

describe('Events (real bafa15d wire)', () => {
  it('official and Rubric community events keep distinct, visible provenance', () => {
    renderTurn(real('eventsMore'));
    const [community, official] = cards();
    expect(within(community).getByText('ANU community · via Rubric')).toBeInTheDocument();
    expect(within(community).queryByText('Official ANU Events')).not.toBeInTheDocument();
    expect(within(official).getByText('Official ANU Events')).toBeInTheDocument();
  });

  it('refuses an event whose provenance_class disagrees with its source, or whose source has no label', () => {
    const [community] = real('eventsMore').items as Record<string, unknown>[];
    const fields = community.fields as Record<string, unknown>;
    expect(
      toResultCards([{ ...community, fields: { ...fields, provenance_class: 'official_anu' } }]),
    ).toBeNull();
    expect(toResultCards([{ ...community, source_id: 'some_new_feed' }])).toBeNull();
  });

  it('missing venue/end/address stay "Not published" (never "Online"); timezone/status/provenance are not rows', () => {
    renderTurn(real('eventsBroad'));
    const third = cardFields(cards()[2]);
    expect(third.Venue).toBe('Not published');
    expect(third.Ends).toBe('Not published');
    expect(third.Address).toBe('Not published');
    // Every stored field is still on the card; DOM order is a presentation choice.
    expect(Object.keys(third).sort()).toEqual(
      ['Starts', 'Ends', 'Venue', 'Address', 'Organiser', 'Category', 'Tags', 'Audience'].sort(),
    );
    expect(document.body.textContent ?? '').not.toMatch(/\bonline\b|cancelled|ticket/i);
  });

  it('start times render in Canberra time with no invented date or zone', () => {
    renderTurn(real('eventsAfter5'));
    expect(cardFields(cards()[0]).Starts).toMatch(/^Mon,? 14 Sept?,? 6:00\s?pm$/i);
  });

  it('DATE_WINDOW and TIME_OF_DAY_WINDOW refinements render the backend’s own result each time', () => {
    const titles = (name: string) => toResultCards(real(name).items)!.map((m) => m.title);
    expect(titles('eventsToday')).toEqual(['Event today-early', 'Event today-late']);
    expect(titles('eventsAfter5')).toEqual(['Event today-late']);
    expect(titles('eventsTomorrow')).toEqual(['Event tomorrow-late']);
    expect(titles('eventsBefore2')).toEqual(['Event tomorrow-early']);
  });

  it('"the second one" and its organiser follow-up show backend ordinal 2; "Any more?" shows 6–7', () => {
    renderTurn(real('eventsSecond'));
    expect(cards().map(cardNumber)).toEqual(['2']);
    expect(toResultCards(real('eventsOrganiser').items)![0].ordinal).toBe(2);
    expect(toResultCards(real('eventsMore').items)!.map((m) => m.ordinal)).toEqual([6, 7]);
  });
});

describe('Support (real bafa15d wire)', () => {
  it('a natural-language grading concern renders the routed service, its source and fields, with no adjudication', () => {
    const response = real('supportRouted');
    renderTurn(response);
    const [card] = cards();
    expect(within(card).getByRole('link').textContent).toContain('ANUSA Student Assistance');
    const fields = cardFields(card);
    expect(fields.Email).toBe('student.assistance@anusa.com.au');
    expect(fields.Phone).toBe('Not published');
    expect(fields.Hours).toBe('Not published');
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(ADJUDICATION);
  });

  it('a contact the source does not publish is a neutral UNKNOWN, not "no contact"', () => {
    const response = real('supportMissingContact');
    expect(response.answer_state).toBe('UNKNOWN');
    renderTurn(response);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/does not publish the requested fact/)).toBeInTheDocument();
    expect(screen.queryByText(/no contact|cannot be contacted/i)).not.toBeInTheDocument();
  });
});

describe('six-domain conversation: state stays opaque, Clear Chat invalidates everything', () => {
  const JOURNEY: [string, Record<string, WireEntry>][] = [
    ['courseExact', D5],
    ['courseFollowUp', D5],
    ['scholarshipDiscovery', D5],
    ['scholarshipSecond', D5],
    ['crossAccommodation', D5],
    ['jobsBroad', D6],
    ['eventsBroad', D6],
    ['supportRouted', D6],
    ['courseReturn', D5],
  ];

  it('each request echoes the previous authoritative state byte-for-byte across all six domains', async () => {
    const requests: AskRequest[] = [];
    let next = 0;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(structuredClone(request));
      const [name, wire] = JOURNEY[next++];
      return real(name, wire);
    });
    const { result } = renderHook(() => useChatSession(transport));
    for (const [name, wire] of JOURNEY) {
      await act(async () => {
        await result.current.sendMessage(wire[name].question);
      });
    }
    for (let i = 1; i < JOURNEY.length; i += 1) {
      const [name, wire] = JOURNEY[i - 1];
      expect(requests[i].conversation_state).toEqual(real(name, wire).conversation_state);
    }
    expect(result.current.turns).toHaveLength(JOURNEY.length * 2);

    act(() => result.current.clearChat());
    await act(async () => {
      await result.current.sendMessage('How do I contact them?');
    });
    const after = requests[requests.length - 1];
    expect(after.conversation_state ?? {}).not.toHaveProperty('result_sets');
    expect(after.history).toEqual([]);
    expect(after.selected_result).toBeUndefined();
  });
});
