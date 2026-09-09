import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

function suggestions() {
  const region = screen.getByRole('region', { name: 'Try asking' });
  return within(region).getAllByRole('button');
}

describe('empty state', () => {
  it('shows Try asking on first render', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Try asking' }),
    ).toBeInTheDocument();
  });

  it('removes Try asking after the first question and shows the user turn', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'What are the prerequisites for COMP1110?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      screen.queryByRole('heading', { name: 'Try asking' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('What are the prerequisites for COMP1110?'),
    ).toBeInTheDocument();
  });

  it('offers every suggestion as a real button', () => {
    render(<App />);

    const cards = suggestions();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      // A real <button> is what makes these work by keyboard and touch.
      expect(card.tagName).toBe('BUTTON');
      expect(card).toHaveAttribute('type', 'button');
      expect(card).toBeEnabled();
    }
  });

  it('sends the suggestion text when a card is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const card = suggestions()[0];
    const text = card.textContent ?? '';
    expect(text).not.toBe('');
    await user.click(card);

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Try asking' }),
    ).not.toBeInTheDocument();
  });

  it('reaches every suggestion by keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    const cards = suggestions();
    // Tab until the first card takes focus, then confirm the rest follow.
    for (let i = 0; i < 40 && document.activeElement !== cards[0]; i += 1) {
      await user.tab();
    }
    expect(cards[0]).toHaveFocus();

    for (let i = 1; i < cards.length; i += 1) {
      await user.tab();
      expect(cards[i]).toHaveFocus();
    }
  });

  it('activates a focused suggestion with Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    const card = suggestions()[1];
    const text = card.textContent ?? '';
    card.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText(text)).toBeInTheDocument());
  });

  it('activates a focused suggestion with Space', async () => {
    const user = userEvent.setup();
    render(<App />);

    const card = suggestions()[2];
    const text = card.textContent ?? '';
    card.focus();
    await user.keyboard('{ }');

    await waitFor(() => expect(screen.getByText(text)).toBeInTheDocument());
  });
});
