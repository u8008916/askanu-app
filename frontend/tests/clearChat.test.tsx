import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

describe('Clear Chat', () => {
  it('clears the conversation and restores Try asking', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Which scholarships are open?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText('Which scholarships are open?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    expect(
      screen.queryByText('Which scholarships are open?'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Try asking' }),
    ).toBeInTheDocument();
  });

  it('offers Clear Chat, not New Chat', () => {
    render(<App />);
    expect(
      screen.getByRole('button', { name: 'Clear Chat' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /new chat/i }),
    ).not.toBeInTheDocument();
  });
});
