import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ResponseRenderer } from '../src/dev/v7/ResponseRenderer';
import type { ProposedResponse } from '../src/dev/v7/proposedContract';

/**
 * Pins the response-type dispatcher architecture (`docs/V7_UI_CONTRACT.md`
 * §8/§9): given a `response_type`, the correct renderer is chosen, and each
 * renderer keeps the contract rules its underlying block already enforces
 * (backend order, missingness, no error styling for `unknown`). This is
 * architecture-readiness proof, not production behaviour — nothing here is
 * reachable outside the dev-only `/dev/v7-states` gallery.
 */
const noopResult = vi.fn();
const noopAction = vi.fn();

function renderResponse(response: ProposedResponse) {
  return render(
    <ResponseRenderer onSelectAction={noopAction} onSelectResult={noopResult} response={response} />,
  );
}

describe('V7 response-type dispatcher (architecture prep)', () => {
  it('answer: renders plain text through AnswerBody', () => {
    renderResponse({ response_type: 'answer', answer: 'Warrumbul Lodge is self-catered.' });
    expect(screen.getByText('Warrumbul Lodge is self-catered.')).toBeInTheDocument();
  });

  it('entity_summary: renders title, fields (with missingness preserved) and actions', () => {
    renderResponse({
      response_type: 'entity_summary',
      entity: {
        entity_id: 'accommodation:residence:x',
        domain: 'accommodation',
        entity_type: 'residence',
        title: 'Placeholder Warrumbul Lodge record',
        description: 'Placeholder description.',
        fields: [
          { label: 'Cost', value: 'From $X/week' },
          { label: 'Facilities', value: null },
        ],
        actions: [{ label: 'Room types & prices', prompt: 'What room types does it have?' }],
        url: 'https://example.invalid/x',
        source_id: 'accommodation_anu_study',
      },
    });

    expect(
      screen.getByRole('heading', { level: 3, name: 'Placeholder Warrumbul Lodge record' }),
    ).toBeInTheDocument();
    expect(screen.getByText('From $X/week')).toBeInTheDocument();
    expect(screen.getByText('Not published in the stored record')).toBeInTheDocument();

    const action = screen.getByRole('button', { name: 'Room types & prices' });
    action.click();
    expect(noopAction).toHaveBeenCalledWith({
      label: 'Room types & prices',
      prompt: 'What room types does it have?',
    });
  });

  it('result_set: renders cards in fixture order and forwards the canonical selection', () => {
    renderResponse({
      response_type: 'result_set',
      answer: 'Two residences found.',
      resultSet: {
        result_set_id: 'rs_1',
        status: 'RESULTS',
        items: [
          {
            entity_id: 'accommodation:residence:a',
            domain: 'accommodation',
            entity_type: 'residence',
            title: 'Residence A',
            url: 'https://example.invalid/a',
            source_id: 'accommodation_anu_study',
            fields: [],
          },
          {
            entity_id: 'accommodation:residence:b',
            domain: 'accommodation',
            entity_type: 'residence',
            title: 'Residence B',
            url: 'https://example.invalid/b',
            source_id: 'accommodation_anu_study',
            fields: [],
          },
        ],
      },
    });

    expect(screen.getByText('Two residences found.')).toBeInTheDocument();
    const cards = within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Residence A')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Residence B')).toBeInTheDocument();

    within(cards[1]).getByRole('button', { name: /^Ask about this/ }).click();
    expect(noopResult).toHaveBeenCalledWith({
      result_set_id: 'rs_1',
      entity_id: 'accommodation:residence:b',
      position: 2,
    });
  });

  it('comparison: renders every dimension once with missingness preserved', () => {
    renderResponse({
      response_type: 'comparison',
      entities: [
        {
          entity_id: 'a',
          domain: 'accommodation',
          entity_type: 'residence',
          title: 'A',
          url: 'https://example.invalid/a',
          source_id: 'x',
          fields: [],
        },
        {
          entity_id: 'b',
          domain: 'accommodation',
          entity_type: 'residence',
          title: 'B',
          url: 'https://example.invalid/b',
          source_id: 'x',
          fields: [],
        },
      ],
      fields: [{ label: 'Catering', values: ['Self-catered', null] }],
    });

    const table = screen.getByRole('table', { name: 'Comparison' });
    expect(within(table).getAllByRole('rowheader')).toHaveLength(1);
    expect(within(table).getByText('Not published')).toBeInTheDocument();
  });

  it.each(['unknown', 'partial'] as const)(
    '%s: renders the statement and an official next action, never as an error',
    (responseType) => {
      renderResponse({
        response_type: responseType,
        answer: 'AskANU cannot confirm this from approved evidence.',
        nextAction: { label: 'Check the official page', url: 'https://example.invalid/official' },
      });

      expect(
        screen.getByText('AskANU cannot confirm this from approved evidence.'),
      ).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /Check the official page/ });
      expect(link).toHaveAttribute('href', 'https://example.invalid/official');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('unknown/partial without a next action renders the statement alone', () => {
    renderResponse({ response_type: 'unknown', answer: 'Nothing further is known.' });
    expect(screen.getByText('Nothing further is known.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
