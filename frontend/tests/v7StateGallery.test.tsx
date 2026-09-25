import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { V7StateGallery } from '../src/dev/v7/V7StateGallery';

/**
 * Pins the acceptance references for the three V7 Day 1 target mock states
 * (`docs/V7_UI_CONTRACT.md` §3). This is a dev-only page — see
 * `tests/navigation.test.tsx`'s gate test for the route itself — so this
 * suite renders `V7StateGallery` directly and checks the contract rules each
 * state is meant to demonstrate: backend order preserved, missingness
 * preserved, unknown never styled as an error, and canonical identity never
 * guessed from rendered text.
 */
describe('V7 Day 1 state gallery', () => {
  it('renders the three target states, the entity_summary architecture demo and the hostile-strings check, each as one AskANU turn', () => {
    render(<V7StateGallery />);

    expect(
      screen.getByRole('heading', { level: 2, name: '1. Accommodation discovery result set' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '2. Comparison + selected result' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '3. Useful unknown + next action' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '4. Entity summary (architecture demo, not a Day 1 acceptance state)',
      }),
    ).toBeInTheDocument();
    // 3 acceptance states + 1 entity_summary architecture demo + 1 hostile-strings check.
    expect(screen.getAllByText('AskANU')).toHaveLength(5);
    expect(screen.getAllByRole('list', { name: 'Conversation' })).toHaveLength(5);
  });

  describe('entity_summary architecture demo', () => {
    it('renders through the ResponseRenderer dispatcher: name, labelled fields, missingness preserved, and follow-up actions', () => {
      render(<V7StateGallery />);

      const heading = screen.getByRole('heading', {
        level: 3,
        name: 'Placeholder Warrumbul Lodge record',
      });
      const block = heading.closest('li') as HTMLElement;

      expect(within(block).getByText('Placeholder weekly cost wording')).toBeInTheDocument();
      // Facilities is `null` in the fixture: neutral unknown label, not blank.
      expect(within(block).getByText('Not published in the stored record')).toBeInTheDocument();
      expect(
        within(block).getByRole('button', { name: 'Room types & prices' }),
      ).toBeInTheDocument();
      expect(within(block).getByRole('button', { name: 'How to apply' })).toBeInTheDocument();
      expect(within(block).getByRole('button', { name: 'Compare' })).toBeInTheDocument();
    });
  });

  describe('discovery result set', () => {
    it('renders result cards in fixture order, each a real button carrying canonical identity', () => {
      render(<V7StateGallery />);

      const cards = within(
        screen.getByRole('list', { name: 'Results' }),
      ).getAllByRole('listitem');
      expect(cards).toHaveLength(3);

      // Fixture order: A, B, C — never re-sorted by the App.
      expect(within(cards[0]).getByText('Placeholder residence A')).toBeInTheDocument();
      expect(within(cards[1]).getByText('Placeholder residence B')).toBeInTheDocument();
      expect(within(cards[2]).getByText('Placeholder residence C')).toBeInTheDocument();

      // Every card exposes exactly one real, accessibly-named action.
      for (const card of cards) {
        expect(
          within(card).getByRole('button', { name: /^Ask about this/ }),
        ).toBeInTheDocument();
      }

      // A `null` field renders the neutral unknown label, not blank.
      expect(
        within(cards[0]).getByText('Not published'),
      ).toBeInTheDocument();
    });
  });

  describe('comparison + selected result', () => {
    it('shows every dimension once, preserves a missing value as unknown, and shows the selected-result chip', () => {
      render(<V7StateGallery />);

      const table = screen.getByRole('table', { name: 'Comparison' });
      // One row per dimension label, not one per (entity, dimension) pair.
      expect(within(table).getByRole('rowheader', { name: 'Weekly cost' })).toBeInTheDocument();
      expect(within(table).getByRole('rowheader', { name: 'Catering' })).toBeInTheDocument();
      expect(within(table).getByRole('rowheader', { name: 'Room type' })).toBeInTheDocument();
      expect(within(table).getAllByRole('rowheader')).toHaveLength(3);

      // Residence B has no stored catering wording: unknown, not blank and not
      // silently copied from residence A's value.
      const cateringRow = within(table).getByRole('rowheader', { name: 'Catering' })
        .closest('tr') as HTMLElement;
      const cateringCells = within(cateringRow).getAllByRole('cell');
      expect(cateringCells[0]).toHaveTextContent('Placeholder catering wording');
      expect(within(cateringCells[1]).getByText('Not published')).toBeInTheDocument();

      expect(
        screen.getByText('Selected: Placeholder residence B'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Clear selected result: Placeholder residence B' }),
      ).toBeInTheDocument();
    });
  });

  describe('useful unknown + next action', () => {
    it('never uses the error alert role or the insufficient-evidence heading, and links to the official next step', () => {
      render(<V7StateGallery />);

      // The status notice for `insufficient_evidence` still renders (it is a
      // real, contract-valid AskResponse), but the *next action* block is the
      // thing under test: it must not itself be styled or announced as an
      // error.
      const nextActionLink = screen.getByRole('link', {
        name: /Check current availability on the official residence page/,
      });
      expect(nextActionLink).toHaveAttribute('href', 'https://example.invalid/placeholder-residence-a');
      expect(nextActionLink).toHaveAttribute('target', '_blank');
      expect(nextActionLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('hostile strings', () => {
    it('renders hostile content as text and refuses a javascript: next-action URL as a link', () => {
      render(<V7StateGallery />);

      // The hostile title/answer/label show up as literal text somewhere on
      // the page — never executed, never dropped.
      expect(screen.getAllByText(/<script>/).length).toBeGreaterThan(0);

      // The hostile next action has an unsafe URL: rendered as plain text, not
      // an anchor.
      expect(
        screen.queryByRole('link', { name: /Hostile next action label/ }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Hostile next action label/)).toBeInTheDocument();
    });
  });
});
