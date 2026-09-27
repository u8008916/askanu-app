import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { toResultCards } from '../src/chat/results/resultItems';
import { resolveStructuredPayload } from '../src/chat/structuredPrefill';
import { useChatSession } from '../src/chat/useChatSession';
import { setMockScenarioId } from '../src/dev/mockTransport';
import {
  insufficientAccommodationVacancyResponse,
  insufficientAccommodationVacancyWithActionResponse,
  needsAccommodationClarificationManyOptionsResponse,
  needsAccommodationClarificationResponse,
  okAccommodationCompareItemsResponse,
  okAccommodationCompareResponse,
  okAccommodationResponse,
  okAccommodationResultsResponse,
} from '../src/mocks/askResponses';
import type {
  AskRequest,
  AskResponse,
  ClarificationSelectionRequest,
} from '../src/types/api';

/**
 * V7 Day 4 — Accommodation vertical.
 *
 * 26 Sep 2026: `askanu-rag` `main` @ `54d75f4` sent no Accommodation `items`,
 * comparison payload, `answer_state` or selected-result field, so this suite
 * only verified-and-locked the (then-current) wire and recorded gaps G1–G9.
 *
 * 27 Sep 2026: `askanu-rag` PR #38 (`carmen/v7-day4-accommodation-vertical`,
 * tip `3c8e35e` — still open, **not yet merged**) closes G1/G2/G3/G5/G7. This
 * suite now proves the App *consumes* that real, typed contract correctly —
 * discovery cards, qualifying_evidence, a real comparison table, a real
 * "Apply now" action, structured `selected_result`/`clarification_selection`/
 * `result_page` requests — rather than only proving why cards could not
 * safely be built yet. The blocks that still describe the *empty*-`items`/
 * no-`actions` fallback path (a pre-#38 backend, or any other reason a real
 * response comes back without them) are kept, correctly re-scoped, as
 * regression coverage for that fallback — not as the production expectation.
 * Full contract/gap detail: `docs/evidence/V7_DAY_04_ACCOMMODATION_INTEGRATION.md`.
 */

function renderTurn(
  response: AskResponse,
  callbacks: {
    onSelectClarification?: (text: string, selection: ClarificationSelectionRequest) => void;
    onSelectResult?: Parameters<typeof AssistantTurn>[0]['onSelectResult'];
    onRequestMorePage?: Parameters<typeof AssistantTurn>[0]['onRequestMorePage'];
  } = {},
) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onSelectClarification={callbacks.onSelectClarification ?? vi.fn()}
        onRequestMorePage={callbacks.onRequestMorePage}
        onSelectResult={callbacks.onSelectResult}
        response={response}
      />
    </ul>,
  );
}

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(screen.getByLabelText('Ask AskANU a question'), question);
  await user.click(screen.getByRole('button', { name: 'Send' }));
}

function buildResponse(overrides: Partial<AskResponse> = {}): AskResponse {
  return {
    status: 'ok',
    answer: 'Placeholder answer.',
    items: [],
    sources: [],
    clarification: null,
    request_id: 'req_test',
    ...overrides,
  };
}

describe('Accommodation discovery clarification (real wire shape)', () => {
  it('renders checkboxes, not a single-select button, matching allow_multiple: true', () => {
    renderTurn(needsAccommodationClarificationResponse);
    expect(
      screen.getByRole('checkbox', { name: /Placeholder residence A/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Placeholder residence B/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Placeholder residence A/ }),
    ).not.toBeInTheDocument();
  });

  it('shows all 20 options in backend order, never trimmed or reordered', () => {
    renderTurn(needsAccommodationClarificationManyOptionsResponse);
    const options = within(
      screen.getByRole('list', { name: 'Clarification options' }),
    ).getAllByRole('checkbox');
    expect(options).toHaveLength(20);
    expect(options[0]).toHaveAccessibleName(/Placeholder residence 1$/);
    expect(options[19]).toHaveAccessibleName(/Placeholder residence 20$/);
  });

  it('a single checked option prefills the composer with exactly the backend label, on Use selection (not auto-sent)', async () => {
    const user = userEvent.setup();
    render(<App />);
    setMockScenarioId('needs-clarification-accommodation');
    await ask(user, 'Tell me about accommodation');

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: /Placeholder residence A/ }),
      ).toBeInTheDocument(),
    );
    const repliesBefore = screen.getAllByText('AskANU').length;
    await user.click(
      screen.getByRole('checkbox', { name: /Placeholder residence A/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Use selection' }));

    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(
      'Placeholder residence A',
    );
    // Prefill only — no second message was sent for this selection.
    expect(screen.getAllByText('AskANU')).toHaveLength(repliesBefore);
    expect(
      screen.queryByRole('button', { name: 'Send' }),
    ).toBeEnabled();
  });

  it('is keyboard-operable: Tab reaches a checkbox, Space toggles it, Tab reaches Use selection', async () => {
    const user = userEvent.setup();
    renderTurn(needsAccommodationClarificationResponse);

    await user.tab();
    const first = screen.getByRole('checkbox', { name: /Placeholder residence A/ });
    expect(first).toHaveFocus();
    await user.keyboard(' ');
    expect(first).toBeChecked();

    await user.tab();
    expect(
      screen.getByRole('checkbox', { name: /Placeholder residence B/ }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Use selection' })).toHaveFocus();
  });

  it('never shows the backend record_id as visible text', () => {
    renderTurn(needsAccommodationClarificationResponse);
    expect(
      screen.queryByText('accommodation:residence:placeholder-residence-a'),
    ).not.toBeInTheDocument();
  });

  /*
   * V7 Day 4 (PR #38): the structured `clarification_selection` RAG now
   * accepts. Ids come from `clarification.options` in backend order — proven
   * here by checking B before A and still getting `[A, B]` back.
   */
  it('passes the exact backend option ids in backend order, regardless of click order', async () => {
    const user = userEvent.setup();
    const onSelectClarification = vi.fn();
    renderTurn(needsAccommodationClarificationResponse, { onSelectClarification });

    await user.click(screen.getByRole('checkbox', { name: /Placeholder residence B/ }));
    await user.click(screen.getByRole('checkbox', { name: /Placeholder residence A/ }));
    await user.click(screen.getByRole('button', { name: 'Use selection' }));

    expect(onSelectClarification).toHaveBeenCalledExactlyOnceWith(
      'Both Placeholder residence A and Placeholder residence B',
      {
        clarification_id: 'clar-accommodation-selection',
        option_ids: [
          'accommodation:residence:placeholder-residence-a',
          'accommodation:residence:placeholder-residence-b',
        ],
      },
    );
  });
});

describe('Accommodation compare', () => {
  it('a real PublicComparisonItem renders a table in backend order, with a not_published cell shown neutrally', () => {
    renderTurn(okAccommodationCompareItemsResponse);

    const table = screen.getByRole('table');
    const columnHeaders = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(columnHeaders).toEqual([
      'Detail',
      'Placeholder residence record title A',
      'Placeholder residence record title B',
    ]);
    expect(within(table).getByRole('row', { name: /Location/ })).toHaveTextContent(
      'Not published',
    );
    // No card path, no duplicate "Ask about this" — this is the comparison
    // path, mutually exclusive with `toResultCards` by construction.
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ask about this/ }),
    ).not.toBeInTheDocument();
  });

  it('the backend prose stays collapsed under "Show as text" alongside the table', () => {
    const { container } = renderTurn(okAccommodationCompareItemsResponse);
    const details = container.querySelector('details') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(within(details).getByText('Show as text')).toBeInTheDocument();
    expect(details).toHaveTextContent('Placeholder comparison answer');
  });

  /*
   * The narrower fallback: `items: []` (a pre-#38 backend, or any other
   * reason the wire sends no comparison payload). The App still shows the
   * backend's own prose and both sources; it never fabricates a table.
   */
  it('falls back to prose and sources when items is empty', () => {
    renderTurn(okAccommodationCompareResponse);

    expect(screen.getByText(/Placeholder comparison answer/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();

    const sources = screen.getByRole('region', { name: 'Sources' });
    const titles = within(sources)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(titles[0]).toContain('Placeholder residence record title A');
    expect(titles[1]).toContain('Placeholder residence record title B');
  });
});

describe('Accommodation vacancy unknown (insufficient_evidence)', () => {
  it('is not styled or announced as an error', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the backend text verbatim, including the application link as plain text when no action is supplied', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    expect(
      screen.getByText(/A null vacancy status means unknown, not available or unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Published application link: https:\/\/example\.invalid\/placeholder-apply/),
    ).toBeInTheDocument();
    // No App-authored link was built by scraping that sentence — a link
    // appears only when the backend supplies a real `actions` entry (below).
    expect(
      screen.queryByRole('link', { name: /placeholder-apply/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps the source evidence and renders no result cards', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('the App never authors its own vacancy verdict wording', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    // No `answer_state`-driven UI beyond `actions` was built (confirmed
    // scope decision, 27 Sep 2026) — this still reads as the generic
    // "Not enough evidence" abstention heading, deliberately, not a silent
    // drift: a future change to this heading is now a visible diff here.
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByText(/no vacanc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rooms? available/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fully booked|sold out/i)).not.toBeInTheDocument();
  });

  /*
   * V7 Day 4 (PR #38): a real, validated `actions` entry — gap G7 closed.
   * `test_current_availability_is_partial_unknown_with_official_next_action`
   * confirms an application action can accompany an UNKNOWN vacancy answer.
   */
  it('renders a real "Apply now" action from actions[0].url, alongside the same neutral non-error notice', () => {
    renderTurn(insufficientAccommodationVacancyWithActionResponse);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Apply now/ });
    expect(link).toHaveAttribute('href', 'https://example.invalid/placeholder-apply');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // Exactly one "Apply now" link, and exactly one other (the Sources
    // entry) — the App never additionally scrapes a second action link out
    // of the answer prose that also names the URL in words.
    expect(screen.getAllByRole('link', { name: /Apply now/ })).toHaveLength(1);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});

/**
 * Interruption/return, Clear Chat and the new structured request fields,
 * driven directly against `useChatSession` with a scripted transport (same
 * pattern as `tests/conversationState.test.tsx`), because `conversation_state`
 * is opaque by contract and the mock fixtures don't set it, and because the
 * structured payload's exact wire shape is what matters here, not DOM
 * rendering (already covered above and in `tests/v7Day3Results.test.tsx`).
 */
describe('Accommodation session: interruption/return, Clear Chat, and structured requests', () => {
  it('echoes state byte-for-byte across an accommodation -> course -> accommodation interruption', async () => {
    const requests: AskRequest[] = [];
    const accommodationState = { schema_version: 1, focus: { domain: 'accommodation' } };
    const courseState = { schema_version: 1, focus: { domain: 'courses' } };
    const backToAccommodationState = {
      schema_version: 1,
      focus: { domain: 'accommodation' },
      recent_entities: ['courses'],
    };
    const scripted = [
      buildResponse({ conversation_state: accommodationState, request_id: 'r1' }),
      buildResponse({ conversation_state: courseState, request_id: 'r2' }),
      buildResponse({ conversation_state: backToAccommodationState, request_id: 'r3' }),
    ];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return scripted.shift() as AskResponse;
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('Which residences are self-catered?');
    });
    expect(requests[0].conversation_state).toEqual({ pending_clarification: null });

    await act(async () => {
      await result.current.sendMessage('Actually, what are the prerequisites for COMP1110?');
    });
    // The course interruption still echoes the accommodation state that was
    // held — the App never drops or swaps state based on what the question
    // is about; only RAG's own response changes what is held.
    expect(requests[1].conversation_state).toBe(accommodationState);

    await act(async () => {
      await result.current.sendMessage('Back to accommodation — what about cost?');
    });
    expect(requests[2].conversation_state).toBe(courseState);

    // The turn history itself also survived the interruption unclipped.
    const userTurns = result.current.turns.filter(
      (turn): turn is Extract<typeof turn, { kind: 'user' }> => turn.kind === 'user',
    );
    expect(userTurns.map((turn) => turn.content)).toEqual([
      'Which residences are self-catered?',
      'Actually, what are the prerequisites for COMP1110?',
      'Back to accommodation — what about cost?',
    ]);
  });

  it('Clear Chat mid-accommodation-journey sends empty history and no state on the next turn', async () => {
    const requests: AskRequest[] = [];
    const heldState = { schema_version: 1, focus: { domain: 'accommodation' } };
    const scripted = [buildResponse({ conversation_state: heldState, request_id: 'r1' })];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return scripted.shift() as AskResponse;
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('Which residences allow pets?');
    });
    expect(result.current.turns.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.turns).toEqual([]);

    scripted.push(buildResponse({ conversation_state: { schema_version: 1 }, request_id: 'r2' }));
    await act(async () => {
      await result.current.sendMessage('What is the application process?');
    });

    expect(requests[1].history).toEqual([]);
    expect(requests[1].conversation_state).toEqual({ pending_clarification: null });
  });

  it('Clear Chat through the UI mid-accommodation-journey resets visible turns and announces it', async () => {
    const user = userEvent.setup();
    render(<App />);
    setMockScenarioId('ok-accommodation');
    await ask(user, 'Tell me about Accommodation options');
    expect(screen.getByText('Tell me about Accommodation options')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    expect(
      screen.queryByText('Tell me about Accommodation options'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Try asking' }),
    ).toBeInTheDocument();
  });

  it('sending none of the three new request fields is exactly today’s request shape', async () => {
    const requests: AskRequest[] = [];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return buildResponse({ request_id: 'r1' });
    });
    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('Which residences are self-catered?');
    });

    expect(requests[0].selected_result).toBeUndefined();
    expect(requests[0].clarification_selection).toBeUndefined();
    expect(requests[0].result_page).toBeUndefined();
  });

  /*
   * V7 Day 4 (PR #38): `AssistantTurn`'s `handleCardSelect` (via `App.tsx`'s
   * `handleSelectResult`) and `structuredPrefill.ts`'s pairing rule together
   * decide what reaches `sendMessage`. This proves the two compose correctly:
   * sending the prefill unchanged attaches `selected_result`; sending
   * something else does not.
   */
  it('sending the unedited "Ask about this" prefill attaches selected_result; an edit drops it', async () => {
    const requests: AskRequest[] = [];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return buildResponse({ request_id: 'r' });
    });
    const { result } = renderHook(() => useChatSession(transport));
    const pending = {
      prefillText: 'Tell me more about Placeholder residence record title A',
      selectedResult: {
        result_set_id: 'rs:accommodation:mock-1',
        canonical_id: 'placeholder-residence-a',
        ordinal: 1,
      },
    };

    await act(async () => {
      await result.current.sendMessage(
        pending.prefillText,
        resolveStructuredPayload(pending, pending.prefillText),
      );
    });
    expect(requests[0].selected_result).toEqual(pending.selectedResult);

    await act(async () => {
      const edited = 'What about the cost instead?';
      await result.current.sendMessage(edited, resolveStructuredPayload(pending, edited));
    });
    expect(requests[1].selected_result).toBeUndefined();
  });

  it('requesting more pages sends the exact server cursor as result_page', async () => {
    const requests: AskRequest[] = [];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return buildResponse({ request_id: 'r' });
    });
    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('Show more results', {
        resultPage: {
          result_set_id: 'rs:accommodation:mock-1',
          start_ordinal: 3,
          limit: 5,
        },
      });
    });

    expect(requests[0].result_page).toEqual({
      result_set_id: 'rs:accommodation:mock-1',
      start_ordinal: 3,
      limit: 5,
    });
  });
});

describe('Accommodation result cards and pagination (real PublicResultItem wire shape)', () => {
  it('renders cards with the 7-field mapping, qualifying_evidence, and an enabled "Ask about this" per card', () => {
    renderTurn(okAccommodationResultsResponse, { onSelectResult: vi.fn() });

    expect(screen.getByRole('heading', { level: 3, name: '2 results' })).toBeInTheDocument();
    expect(screen.getByText(/Matched room: Standard/)).toBeInTheDocument();
    const askAboutButtons = screen.getAllByRole('button', { name: /Ask about this/ });
    expect(askAboutButtons).toHaveLength(2);
  });

  it('clicking "Ask about this" prefills the composer, only, with the card’s title', async () => {
    const user = userEvent.setup();
    render(<App />);
    setMockScenarioId('ok-accommodation-results');
    await ask(user, 'Show me accommodation options');

    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Results' })).toBeInTheDocument(),
    );
    const repliesBefore = screen.getAllByText('AskANU').length;
    await user.click(
      screen.getAllByRole('button', { name: /Ask about this/ })[0],
    );

    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(
      'Tell me more about Placeholder residence record title A',
    );
    expect(screen.getAllByText('AskANU')).toHaveLength(repliesBefore);
  });

  it('"Show more" on a paged result list sends result_page and renders the next page as a new turn', async () => {
    const user = userEvent.setup();
    render(<App />);
    setMockScenarioId('ok-accommodation-results');
    await ask(user, 'Show me accommodation options');

    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Results' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();

    setMockScenarioId('ok-accommodation-results-page-2');
    await user.click(screen.getByRole('button', { name: 'Show more' }));

    let lists: HTMLElement[] = [];
    await waitFor(() => {
      lists = screen.getAllByRole('list', { name: 'Results' });
      expect(lists).toHaveLength(2);
    });
    // Scoped to each results list: the same titles also appear once each in
    // the "Sources" section, so an unscoped lookup would be ambiguous.
    expect(
      within(lists[0]).getByText('Placeholder residence record title A'),
    ).toBeInTheDocument();
    expect(
      within(lists[1]).getByText('Placeholder residence record title C'),
    ).toBeInTheDocument();
    // Page 1's own button is consumed once clicked (its retained cursor has
    // already advanced server-side); page 2 is separately terminal
    // (`has_more: false`). Either reason is enough — together, no button
    // remains that could resend a stale cursor and 400.
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    // A direct action, not a prefill: the composer was never touched.
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue('');
  });

  it('displays the backend ordinal on a paged list, not the visual index — page 2 shows "3", not "1"', async () => {
    const user = userEvent.setup();
    render(<App />);
    setMockScenarioId('ok-accommodation-results');
    await ask(user, 'Show me accommodation options');

    let firstList: HTMLElement;
    await waitFor(() => {
      firstList = screen.getByRole('list', { name: 'Results' });
      expect(firstList).toBeInTheDocument();
    });
    // Page 1: two cards, backend ordinals 1 and 2 — same as the visual index here.
    expect(within(firstList!).getByText('1')).toBeInTheDocument();
    expect(within(firstList!).getByText('2')).toBeInTheDocument();

    setMockScenarioId('ok-accommodation-results-page-2');
    await user.click(screen.getByRole('button', { name: 'Show more' }));

    let lists: HTMLElement[] = [];
    await waitFor(() => {
      lists = screen.getAllByRole('list', { name: 'Results' });
      expect(lists).toHaveLength(2);
    });
    // Page 2's one card is backend ordinal 3 (this ResultSet's third result,
    // continuing from page 1) — it must not renumber back to "1".
    expect(within(lists[1]).getByText('3')).toBeInTheDocument();
    expect(within(lists[1]).queryByText('1')).not.toBeInTheDocument();
  });

  /*
   * The narrower fallback: `items: []` (a pre-#38 backend, or any other
   * reason a real response comes back without result items).
   */
  it('falls back to text-only rendering when items is empty', () => {
    expect(toResultCards(okAccommodationResponse.items)).toBeNull();
    renderTurn(okAccommodationResponse);
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  /*
   * Qasim (PR #42, 27 Sep): `AskResponse.items` stays `unknown[]` at the
   * response boundary, with `resultItems.ts` as the deep-validation
   * boundary (documented in `types/api.ts`). This proves that boundary
   * actually holds for Day 4's own new fields — a malformed `ordinal` or
   * `qualifying_evidence` on one item refuses the *whole* list (never a
   * partially-trusted card), and consequently that item can never produce a
   * "selected_result"/"clarification_selection" structured action either,
   * since no card and no "Ask about this" button ever exist for it.
   */
  it('a malformed Day 4 item (bad ordinal/qualifying_evidence type) refuses the whole list and renders no card or select action', () => {
    const validItem = (okAccommodationResultsResponse.items as unknown[])[0];
    const malformedOrdinalItem = {
      ...(validItem as Record<string, unknown>),
      record_id: 'accommodation:residence:malformed-ordinal',
      canonical_id: 'malformed-ordinal',
      ordinal: 'six', // contract requires number | null
    };
    expect(toResultCards([validItem, malformedOrdinalItem])).toBeNull();

    const malformedEvidenceItem = {
      ...(validItem as Record<string, unknown>),
      record_id: 'accommodation:residence:malformed-evidence',
      canonical_id: 'malformed-evidence',
      qualifying_evidence: { type: 'room_rate', room_name: 'Standard' }, // missing required rate/cost_period
    };
    expect(toResultCards([validItem, malformedEvidenceItem])).toBeNull();

    const onSelectResult = vi.fn();
    renderTurn(
      buildResponse({
        items: [validItem, malformedOrdinalItem],
        answer: 'Placeholder discovery answer with one malformed item.',
      }),
      { onSelectResult },
    );
    // The whole card path is refused, so the App falls back to text-only —
    // never a list with the one well-formed card and the bad one dropped.
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ask about this/ })).not.toBeInTheDocument();
    expect(onSelectResult).not.toHaveBeenCalled();
  });

  // Qasim's follow-up (PR #42, 27 Sep): `ordinal` was checked with a bare
  // `typeof ordinal === 'number'`, which let a fractional, negative, or NaN
  // value through. A ResultSet position is a finite integer >= 1.
  it.each([
    ['fractional', 1.5],
    ['negative', -1],
    ['NaN', Number.NaN],
    ['zero (positions are 1-based)', 0],
  ])('refuses a %s ordinal on a PublicResultItem', (_label, badOrdinal) => {
    const validItem = (okAccommodationResultsResponse.items as unknown[])[0];
    const item = {
      ...(validItem as Record<string, unknown>),
      record_id: 'accommodation:residence:bad-ordinal',
      canonical_id: 'bad-ordinal',
      ordinal: badOrdinal,
    };
    expect(toResultCards([item])).toBeNull();
  });

  /*
   * Hostile strings reach the App through several new surfaces this contract
   * adds: the generic `fields` dict, `qualifying_evidence`, comparison cell
   * values, and an action's `label`. All of it is untrusted stored text and
   * must render as React text children only — never `dangerouslySetInnerHTML`,
   * never markdown, never executed.
   */
  it('renders hostile strings in fields, qualifying_evidence, comparison cells, and an action label as text, never executed', () => {
    const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    const hostileResultItem = {
      type: 'result' as const,
      record_id: 'accommodation:residence:hostile',
      source_id: 'accommodation_anu_study',
      canonical_id: 'hostile',
      title: `${hostile} Hostile Hall`,
      url: 'https://example.invalid/placeholder-hostile',
      domain: 'accommodation',
      result_set_id: 'rs:accommodation:hostile',
      ordinal: 1,
      fields: { category: hostile, features: [hostile] },
      qualifying_evidence: {
        type: 'room_rate' as const,
        room_name: hostile,
        rate: hostile,
        cost_period: hostile,
        contract: hostile,
        inclusions: hostile,
        other_fees: hostile,
      },
    };
    const { container: cardContainer } = renderTurn(
      buildResponse({ items: [hostileResultItem], answer: 'Hostile discovery answer.' }),
    );
    expect(cardContainer.querySelector('img')).not.toBeInTheDocument();
    expect(cardContainer.querySelector('script')).not.toBeInTheDocument();
    expect(cardContainer).toHaveTextContent(hostile);

    const hostileComparisonItem = {
      type: 'comparison' as const,
      result_set_id: null,
      records: [
        { ...hostileResultItem, fields: {} },
        { ...hostileResultItem, record_id: 'accommodation:residence:hostile-2', canonical_id: 'hostile-2' },
      ],
      fields: [
        {
          name: 'category',
          label: hostile,
          values: [
            { record_id: hostileResultItem.record_id, value: hostile, state: 'published' as const },
            { record_id: 'accommodation:residence:hostile-2', value: null, state: 'not_published' as const },
          ],
        },
      ],
    };
    const { container: tableContainer } = renderTurn(
      buildResponse({ items: [hostileComparisonItem], answer: 'Hostile comparison answer.' }),
    );
    expect(tableContainer.querySelector('img')).not.toBeInTheDocument();
    expect(tableContainer.querySelector('script')).not.toBeInTheDocument();
    expect(tableContainer).toHaveTextContent(hostile);

    const { container: actionContainer } = renderTurn(
      buildResponse({
        status: 'insufficient_evidence',
        answer: 'Hostile vacancy answer.',
        actions: [
          {
            type: 'application',
            label: hostile,
            url: 'https://example.invalid/placeholder-hostile-apply',
            record_id: 'accommodation:residence:hostile',
            source_id: 'accommodation_anu_study',
          },
        ],
      }),
    );
    expect(actionContainer.querySelector('img')).not.toBeInTheDocument();
    expect(actionContainer.querySelector('script')).not.toBeInTheDocument();
    expect(actionContainer).toHaveTextContent(hostile);
  });
});
