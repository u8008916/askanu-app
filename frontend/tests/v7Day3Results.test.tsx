import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { ComparisonTable } from '../src/chat/results/ComparisonTable';
import { ResultList } from '../src/chat/results/ResultList';
import { toResultCards } from '../src/chat/results/resultItems';
import { setMockScenarioId } from '../src/dev/mockTransport';
import {
  insufficientEvidenceResponse,
  okAccommodationResponse,
  okEventsResultSetForwardResponse,
  okJobsResultSetResponse,
  errorResponse,
} from '../src/mocks/askResponses';
import type { AskResponse } from '../src/types/api';

/**
 * V7 Day 3 — shared result-set / comparison / evidence-aware rendering.
 *
 * Every assertion here is about the App *rendering* backend semantics: order,
 * identity, missingness and the EMPTY-vs-UNKNOWN distinction come from the
 * response, never from App-side sorting, filtering or inference.
 */

function renderTurn(response: AskResponse) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onSelectClarification={vi.fn()}
        response={response}
      />
    </ul>,
  );
}

const jobItems = okJobsResultSetResponse.items as Array<Record<string, unknown>>;

describe('toResultCards (shared item adapter)', () => {
  it('keeps backend order exactly — card N is items[N-1], never re-sorted', () => {
    // Deliberately reverse the fixture: the adapter must follow, not fix, it.
    const reversed = [...jobItems].reverse();
    const cards = toResultCards(reversed);
    expect(cards?.map((card) => card.recordId)).toEqual(
      reversed.map((item) => item.record_id),
    );
  });

  it('carries the stored record identity, not anything derived from the title', () => {
    const cards = toResultCards(jobItems);
    expect(cards?.[0].recordId).toBe('jobs:job:900101');
  });

  it('refuses (null) an empty list, so an empty items array never renders "0 results"', () => {
    expect(toResultCards([])).toBeNull();
  });

  it('refuses the whole list when any item is not a recognised shape', () => {
    expect(toResultCards([...jobItems, { foo: 1 }])).toBeNull();
    expect(toResultCards(['not an object'])).toBeNull();
  });

  it('refuses mixed domains and repeated identities instead of dropping or merging', () => {
    const event = (okEventsResultSetForwardResponse.items as unknown[])[0];
    expect(toResultCards([jobItems[0], event])).toBeNull();
    expect(toResultCards([jobItems[0], jobItems[0]])).toBeNull();
  });

  it('refuses an event from a source it has no provenance label for', () => {
    const event = {
      ...(okEventsResultSetForwardResponse.items as Array<Record<string, unknown>>)[0],
      source_id: 'some_unapproved_source',
    };
    expect(toResultCards([event])).toBeNull();
  });

  it('keeps missing job fields as null and falls back to the stored date-only closing_date', () => {
    const cards = toResultCards(jobItems)!;
    const roleC = cards[2];
    const field = (label: string) => roleC.fields.find((f) => f.label === label)?.value;
    expect(field('Location')).toBeNull();
    expect(field('Salary')).toBeNull();
    // No closing_text; closing_date 2099-01-15 is shown as a date, no time.
    expect(field('Closes')).toMatch(/15 Jan 2099/);
    expect(field('Closes')).not.toMatch(/:|am|pm/i);

    const roleF = cards[5];
    expect(roleF.fields.find((f) => f.label === 'Closes')?.value).toBeNull();
  });
});

describe('AssistantTurn with backend result items', () => {
  it('renders the Jobs items as one numbered list in backend order, bounded with Show more', async () => {
    const user = userEvent.setup();
    renderTurn(okJobsResultSetResponse);

    expect(screen.getByRole('heading', { level: 3, name: '7 results' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Results' });
    let cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByText('Placeholder role A')).toBeInTheDocument();
    expect(within(cards[4]).getByText('Placeholder role E')).toBeInTheDocument();

    const more = screen.getByRole('button', { name: 'Show 2 more' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveAttribute('aria-controls', list.id);
    await user.click(more);

    cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(7);
    // Revealing more never reorders: A..G in fixture order.
    expect(cards.map((card) => within(card).getAllByText(/Placeholder role/)[0].textContent))
      .toEqual(jobItems.map((item) => item.title));
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows a missing stored field as "Not published", never blank or guessed', () => {
    renderTurn(okJobsResultSetResponse);
    const cards = within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem');
    expect(within(cards[2]).getAllByText('Not published').length).toBeGreaterThan(0);
  });

  it('keeps the backend answer text on the page, collapsed under "Show as text"', () => {
    const { container } = renderTurn(okJobsResultSetResponse);
    const details = container.querySelector('details') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(within(details).getByText('Show as text')).toBeInTheDocument();
    expect(details).toHaveTextContent('Placeholder role A. Job ID: 900101.');
  });

  it('keeps the evidence Sources block alongside the cards', () => {
    renderTurn(okJobsResultSetResponse);
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('does not render the selected-result action in production (contract gap G1)', () => {
    renderTurn(okJobsResultSetResponse);
    expect(screen.queryByRole('button', { name: /Ask about/ })).not.toBeInTheDocument();
  });

  it('keeps a partial answer\'s caveat text in full above the cards', () => {
    const { container } = renderTurn({ ...okJobsResultSetResponse, status: 'partial' });
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByRole('list', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getAllByText(/Placeholder role A\. Job ID: 900101\./).length).toBe(1);
  });

  it('renders the forward Events fixture with distinct official vs community provenance', () => {
    renderTurn(okEventsResultSetForwardResponse);
    const cards = within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem');
    expect(within(cards[0]).getByText('Official ANU Events')).toBeInTheDocument();
    expect(within(cards[1]).getByText('ANU community · via Rubric')).toBeInTheDocument();
    // Missing venue/organiser/end are "Not published" — never "Online", never omitted.
    expect(within(cards[1]).getAllByText('Not published')).toHaveLength(3);
    expect(within(cards[1]).queryByText(/online/i)).not.toBeInTheDocument();
    expect(within(cards[0]).getByText(/2 Mar.*10:00/)).toBeInTheDocument();
  });

  it('shows answer text only for domains that send no items (Accommodation)', () => {
    renderTurn(okAccommodationResponse);
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('falls back to the answer text, never raw objects, when items are malformed', () => {
    const { container } = renderTurn({
      ...okJobsResultSetResponse,
      items: [{ foo: 'bar' }, 42],
    });
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Placeholder role A. Job ID: 900101.');
    expect(container).not.toHaveTextContent('[object Object]');
    expect(container).not.toHaveTextContent('foo');
  });
});

describe('EMPTY vs UNKNOWN — an unknown never reads as "no results"', () => {
  it('insufficient_evidence never grows a result list, even if items are present', () => {
    renderTurn({ ...insufficientEvidenceResponse, items: jobItems });
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
  });

  it('an ok answer with empty items renders no "0 results" list', () => {
    renderTurn({ ...okJobsResultSetResponse, items: [] });
    expect(screen.queryByText(/0 results/)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('an empty-answer abstention gets UNKNOWN wording, never "no results" or "nothing returned"', () => {
    renderTurn({ ...insufficientEvidenceResponse, answer: '' });
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.getByText(/couldn't confirm this from its stored ANU sources/)).toBeInTheDocument();
    expect(screen.queryByText(/no (results|matches)|No response content/i)).not.toBeInTheDocument();
  });

  it('an empty-answer error gets retry wording, not raw envelope text', () => {
    renderTurn({ ...errorResponse, answer: '   ' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      "AskANU couldn't complete this answer. Please try again.",
    );
    expect(screen.queryByText(/req_mock_error/)).not.toBeInTheDocument();
  });

  it('an ok envelope with nothing at all falls back to the error notice, not a blank turn', () => {
    renderTurn({ ...okJobsResultSetResponse, answer: '', items: [], sources: [] });
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again');
  });
});

describe('ResultList selected-result action (shared primitive)', () => {
  it('emits the stored identity and backend position, with an accessible name that starts with the visible label', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ResultList cards={toResultCards(jobItems)!} onSelect={onSelect} />);

    const button = screen.getByRole('button', {
      name: /^Ask about this\s*:\s*Placeholder role B$/,
    });
    await user.click(button);
    expect(onSelect).toHaveBeenCalledWith({
      record_id: 'jobs:job:900102',
      domain: 'jobs',
      position: 2,
    });
  });

  it('is reachable and operable by keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ResultList cards={toResultCards(jobItems.slice(0, 1))!} onSelect={onSelect} />);
    // Tab past the card's title link to its action.
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: /^Ask about this/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('ComparisonTable (shared primitive)', () => {
  const columns = [
    { id: 'accommodation:residence:a', title: 'Residence A' },
    { id: 'accommodation:residence:b', title: 'Residence B' },
  ];

  it('preserves missingness per cell and keeps column order', () => {
    render(
      <ComparisonTable
        columns={columns}
        rows={[{ label: 'Catering', values: ['Self-catered', null] }]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Comparison' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Detail', 'Residence A', 'Residence B']);
    const cells = within(table).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Self-catered');
    expect(cells[1]).toHaveTextContent('Not published');
  });

  it('renders two rows with the same label as two rows (no key collision)', () => {
    render(
      <ComparisonTable
        columns={columns}
        rows={[
          { label: 'Fee', values: ['X', 'Y'] },
          { label: 'Fee', values: ['Z', null] },
        ]}
      />,
    );
    expect(screen.getAllByRole('rowheader', { name: 'Fee' })).toHaveLength(2);
  });

  it('refuses a row whose value count does not match the columns, instead of crashing or padding', () => {
    const { container } = render(
      <ComparisonTable
        columns={columns}
        rows={[{ label: 'Catering', values: ['Self-catered', null, 'extra'] }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('refuses a single-entity "comparison"', () => {
    const { container } = render(
      <ComparisonTable columns={columns.slice(0, 1)} rows={[{ label: 'Fee', values: ['X'] }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('answer arrival is announced (accessibility)', () => {
  it('announces a completed answer politely, then drops the region on Clear Chat', async () => {
    setMockScenarioId('ok-jobs-result-set');
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Any IT jobs?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getAllByRole('status').some((region) =>
          region.textContent?.startsWith('AskANU replied'),
        ),
      ).toBe(true),
    );
    expect(screen.getByRole('list', { name: 'Results' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));
    expect(
      screen.getAllByRole('status').some((region) =>
        region.textContent?.startsWith('AskANU replied'),
      ),
    ).toBe(false);
  });

  it('does not double-announce an error (StatusNotice is already an alert)', async () => {
    setMockScenarioId('error');
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Anything');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(
      screen.getAllByRole('status').some((region) =>
        region.textContent?.startsWith('AskANU replied'),
      ),
    ).toBe(false);
  });
});
