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

  /**
   * `docs/V7_UI_CONTRACT.md` §5 (V7 additions): Clear Chat also drops any
   * composer draft and speaks a polite live-region announcement, since V7
   * session state makes the post-clear reset more consequential than before.
   */
  it('clears an unsent composer draft', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'a draft nobody sent',
    );
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(
      'a draft nobody sent',
    );

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue('');
  });

  it('announces the reset in a polite live region', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('');

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Which scholarships are open?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    expect(screen.getByRole('status')).toHaveTextContent('Conversation cleared');

    // A second press announces again, even though the text is the same.
    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));
    expect(screen.getByRole('status')).toHaveTextContent('Conversation cleared');
  });
});
