import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

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
});
