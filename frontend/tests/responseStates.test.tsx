import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { setMockScenarioId } from '../src/dev/mockTransport';

async function ask(question: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Ask AskANU a question'), question);
  await user.click(screen.getByRole('button', { name: 'Send' }));
  return user;
}

describe('response states', () => {
  it('shows the loading state, then replaces it with the answer', async () => {
    render(<App />);
    await ask('What are the prerequisites for COMP1110?');

    // Pending turn is announced while the request is in flight.
    expect(
      screen.getByText('AskANU is finding an answer'),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText(/Placeholder answer text\. Real answers come from/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText('AskANU is finding an answer'),
    ).not.toBeInTheDocument();
  });

  it('keeps the user turn alongside the answer', async () => {
    render(<App />);
    await ask('Which scholarships are open?');

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );
    expect(screen.getByText('Which scholarships are open?')).toBeInTheDocument();
  });

  it('refuses to send a second question while one is in flight', async () => {
    render(<App />);
    const user = await ask('First question');

    // Still in flight, and the draft box has been cleared, so Send is off.
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    // Typing during the request must not re-enable it.
    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Second question',
    );
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    // Once the answer lands, the queued draft can be sent.
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('turns a transport failure into an error turn, not a blank one', async () => {
    setMockScenarioId('reject');
    render(<App />);
    await ask('Anything');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    );
    expect(
      screen.getByText('AskANU could not be reached. Please try again.'),
    ).toBeInTheDocument();
  });

  it('shows the controlled error envelope from the service', async () => {
    setMockScenarioId('error');
    render(<App />);
    await ask('Anything');

    await waitFor(() =>
      expect(
        screen.getByText('The request could not be completed.'),
      ).toBeInTheDocument(),
    );
  });

  it('keeps the resource panels visible during an active conversation', async () => {
    render(<App />);
    await ask('What events are on?');

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );
    for (const name of ['Quick Links', 'Upcoming Events', 'Current Jobs']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  it('Clear Chat mid-request leaves the empty state and a late answer cannot revive it', async () => {
    render(<App />);
    const user = await ask('A question that will be cleared');

    expect(
      screen.getByText('AskANU is finding an answer'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));
    expect(
      screen.getByRole('heading', { name: 'Try asking' }),
    ).toBeInTheDocument();

    // Well past the mock's latency: the settled request must write nothing.
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(
      screen.getByRole('heading', { name: 'Try asking' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('A question that will be cleared'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Sources' }),
    ).not.toBeInTheDocument();
    // The composer is usable again, not stuck disabled by the abandoned send.
    expect(screen.getByLabelText('Ask AskANU a question')).toBeEnabled();
  });

  it('Clear Chat after an answer restores the empty state', async () => {
    render(<App />);
    const user = await ask('Tell me about COMP1110');

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    expect(
      screen.getByRole('heading', { name: 'Try asking' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Sources' }),
    ).not.toBeInTheDocument();
  });
});
