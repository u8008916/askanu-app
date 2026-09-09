import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

function explore() {
  return screen.getByRole('navigation', { name: 'Explore' });
}

describe('resource navigation', () => {
  it('routes to Courses and moves the current-page marker', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Home is current while the chat is showing.
    expect(within(explore()).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(explore()).getByRole('link', { name: 'Courses' }));

    await waitFor(() =>
      expect(within(explore()).getByRole('link', { name: 'Courses' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(
      within(explore()).getByRole('link', { name: 'Home' }),
    ).not.toHaveAttribute('aria-current');
    expect(window.location.pathname).toBe('/courses');
  });

  it('leaves the five unbuilt domains non-navigating', async () => {
    render(<App />);
    const nav = explore();

    for (const label of [
      'Scholarships',
      'Accommodation',
      'Jobs',
      'Events',
      'Support Services',
    ]) {
      const item = within(nav).getByRole('button', { name: label });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).not.toHaveAttribute('href');
    }
    // Only the two built routes are links.
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
  });

  it('keeps the conversation across a trip to Courses and back', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'What are the prerequisites for COMP1110?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );

    await user.click(within(explore()).getByRole('link', { name: 'Courses' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /Courses/ })).toBeInTheDocument(),
    );
    // The chat is not on screen, so nothing of it is rendered.
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();

    await user.click(within(explore()).getByRole('link', { name: 'Home' }));

    // Current-session context survived the round trip.
    await waitFor(() =>
      expect(
        screen.getByText('What are the prerequisites for COMP1110?'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('Clear Chat still works after navigating', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Anything');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );

    await user.click(within(explore()).getByRole('link', { name: 'Courses' }));
    await user.click(within(explore()).getByRole('link', { name: 'Home' }));
    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    // CONVERSATION_CONTRACT: Clear Chat restores the `Try asking` empty state.
    expect(screen.getByRole('heading', { name: 'Try asking' })).toBeInTheDocument();
    expect(screen.queryByText('Anything')).not.toBeInTheDocument();
  });

  it('sends an unknown route back to the chat', async () => {
    window.history.replaceState({}, '', '/not-a-page');
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.getByRole('heading', { name: 'Try asking' })).toBeInTheDocument();
  });

  it('opens Courses directly from its own URL', async () => {
    window.history.replaceState({}, '', '/courses');
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Courses/ }),
    ).toBeInTheDocument();
  });

  /*
   * The desktop shell is what tests/setup.ts reports, so this covers the
   * desktop headings only; the mobile app bar is measured in a real browser
   * for the day's evidence. Either way a route gets exactly one h1.
   */
  it('gives every route exactly one h1', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    await user.click(within(explore()).getByRole('link', { name: 'Courses' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /Courses/ })).toBeInTheDocument(),
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});