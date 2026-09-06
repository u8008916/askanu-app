import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { MOCK_SCENARIOS } from '../src/chat/askTransport';
import type { AskResponse, AskStatus } from '../src/types/api';

/** The turn is an <li>; give it the list its markup expects. */
function renderTurn(response: AskResponse) {
  return render(
    <ul>
      <AssistantTurn response={response} />
    </ul>,
  );
}

const FROZEN_STATUSES: AskStatus[] = [
  'ok',
  'partial',
  'needs_clarification',
  'insufficient_evidence',
  'off_topic',
  'error',
];

describe('AssistantTurn', () => {
  it('covers every status in the frozen enum with a fixture', () => {
    const covered = new Set(
      MOCK_SCENARIOS.map((scenario) => scenario.response.status),
    );
    expect([...FROZEN_STATUSES].sort()).toEqual([...covered].sort());
  });

  it.each(FROZEN_STATUSES)('renders a non-empty turn for %s', (status) => {
    const scenario = MOCK_SCENARIOS.find((s) => s.response.status === status);
    const { container } = renderTurn(scenario!.response);

    const turn = container.querySelector('li');
    expect(turn).not.toBeNull();
    expect(turn!.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('shows the answer and its sources for ok', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'ok-multi')!;
    renderTurn(scenario.response);

    expect(
      screen.getByText(/Placeholder answer text drawing on more than one/),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('renders partial exactly like ok, with answer and sources', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'partial')!;
    renderTurn(scenario.response);

    expect(screen.getByText(scenario.response.answer)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('lists clarification options in contract order, not as controls', () => {
    const scenario = MOCK_SCENARIOS.find(
      (s) => s.id === 'needs-clarification',
    )!;
    renderTurn(scenario.response);

    const options = within(
      screen.getByRole('list', { name: 'Clarification options' }),
    ).getAllByRole('listitem');
    const labels = options.map((item) => item.textContent);
    // Order backs `first` / `second`.
    expect(labels[0]).toContain('COMP1110');
    expect(labels[1]).toContain('COMP1600');

    // Selectable controls are Day 13. Today the student replies in words.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Reply in the message box/),
    ).toBeInTheDocument();
  });

  it.each(['insufficient', 'off-topic'] as const)(
    'presents %s compactly, with no source block and no error styling',
    (id) => {
      const scenario = MOCK_SCENARIOS.find((s) => s.id === id)!;
      renderTurn(scenario.response);

      expect(screen.getByText(scenario.response.answer)).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Sources' }),
      ).not.toBeInTheDocument();
      // An abstention is correct behaviour, not a fault: it is not announced
      // as an alert.
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('announces the error state', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'error')!;
    renderTurn(scenario.response);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(scenario.response.answer)).toBeInTheDocument();
  });

  it('never renders a blank turn for an envelope with nothing to show', () => {
    const { container } = renderTurn({
      status: 'ok',
      answer: '   ',
      items: [],
      sources: [],
      clarification: null,
      request_id: 'req_empty',
    });

    expect(container.querySelector('li')!.textContent!.trim()).not.toBe('');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows no timestamp and no request_id', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'ok')!;
    const { container } = renderTurn(scenario.response);

    expect(container.textContent).not.toContain(scenario.response.request_id);
    expect(container.querySelector('time')).toBeNull();
  });
});
