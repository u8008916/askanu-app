import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { resetMockScenario, setMockScenarioId } from '../src/dev/mockTransport';

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

  it('makes every domain a real link now that all six pages exist', async () => {
    render(<App />);
    const nav = explore();

    // Home plus the six built domains are links; nothing is announced disabled.
    expect(within(nav).getAllByRole('link')).toHaveLength(7);
    expect(within(nav).queryByRole('button')).not.toBeInTheDocument();
    expect(within(nav).queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events');
  });

  it('routes to Events and moves the current-page marker', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(explore()).getByRole('link', { name: 'Events' }));

    await waitFor(() =>
      expect(within(explore()).getByRole('link', { name: 'Events' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(
      within(explore()).getByRole('link', { name: 'Home' }),
    ).not.toHaveAttribute('aria-current');
    expect(window.location.pathname).toBe('/events');
  });

  it('opens Events directly from its own URL', async () => {
    window.history.replaceState({}, '', '/events');
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /Events/ })).toBeInTheDocument();
  });

  it('routes to Accommodation and moves the current-page marker', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(explore()).getByRole('link', { name: 'Accommodation' }));

    await waitFor(() =>
      expect(within(explore()).getByRole('link', { name: 'Accommodation' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(
      within(explore()).getByRole('link', { name: 'Home' }),
    ).not.toHaveAttribute('aria-current');
    expect(window.location.pathname).toBe('/accommodation');
  });

  it('opens Accommodation directly from its own URL', async () => {
    window.history.replaceState({}, '', '/accommodation');
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Accommodation/ }),
    ).toBeInTheDocument();
  });

  it('routes to Support Services and moves the current-page marker', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(explore()).getByRole('link', { name: 'Support Services' }));

    await waitFor(() =>
      expect(
        within(explore()).getByRole('link', { name: 'Support Services' }),
      ).toHaveAttribute('aria-current', 'page'),
    );
    expect(
      within(explore()).getByRole('link', { name: 'Home' }),
    ).not.toHaveAttribute('aria-current');
    expect(window.location.pathname).toBe('/support');
  });

  it('opens Support Services directly from its own URL', async () => {
    window.history.replaceState({}, '', '/support');
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Support/ }),
    ).toBeInTheDocument();
  });

  it('routes to Jobs and moves the current-page marker', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(explore()).getByRole('link', { name: 'Jobs' }));

    await waitFor(() =>
      expect(within(explore()).getByRole('link', { name: 'Jobs' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(
      within(explore()).getByRole('link', { name: 'Home' }),
    ).not.toHaveAttribute('aria-current');
    expect(window.location.pathname).toBe('/jobs');
  });

  it('opens Jobs directly from its own URL', async () => {
    window.history.replaceState({}, '', '/jobs');
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /Jobs/ })).toBeInTheDocument();
  });

  it('routes to Scholarships and moves the current-page marker', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(explore()).getByRole('link', { name: 'Scholarships' }));

    await waitFor(() =>
      expect(within(explore()).getByRole('link', { name: 'Scholarships' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(
      within(explore()).getByRole('link', { name: 'Home' }),
    ).not.toHaveAttribute('aria-current');
    expect(window.location.pathname).toBe('/scholarships');
  });

  it('opens Scholarships directly from its own URL', async () => {
    window.history.replaceState({}, '', '/scholarships');
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Scholarships/ }),
    ).toBeInTheDocument();
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

  it('keeps the conversation across a trip to Accommodation and back, then Support', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'How do I apply for ANU accommodation?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );

    await user.click(within(explore()).getByRole('link', { name: 'Accommodation' }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: /Accommodation/ }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();

    // A second trip, straight through to Support, still keeps the session live.
    await user.click(within(explore()).getByRole('link', { name: 'Support Services' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /Support/ })).toBeInTheDocument(),
    );

    await user.click(within(explore()).getByRole('link', { name: 'Home' }));
    await waitFor(() =>
      expect(
        screen.getByText('How do I apply for ANU accommodation?'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('Clear Chat still works after visiting Accommodation and Support', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Anything');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );

    await user.click(within(explore()).getByRole('link', { name: 'Accommodation' }));
    await user.click(within(explore()).getByRole('link', { name: 'Support Services' }));
    await user.click(within(explore()).getByRole('link', { name: 'Home' }));
    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    // CONVERSATION_CONTRACT: Clear Chat restores the `Try asking` empty state.
    expect(screen.getByRole('heading', { name: 'Try asking' })).toBeInTheDocument();
    expect(screen.queryByText('Anything')).not.toBeInTheDocument();
  });

  /**
   * V6 Day 12: Support must "clearly expose official sources" even when a
   * request cannot be answered — but never by inventing a fallback link. The
   * one safe, always-present path back to the verified official pages is the
   * persistent Explore nav, which this proves survives a Support error turn.
   */
  it('Support Services stays reachable in Explore after a backend error', async () => {
    const user = userEvent.setup();
    render(<App />);

    setMockScenarioId('error');
    await user.click(within(explore()).getByRole('link', { name: 'Support Services' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /Support/ })).toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole('button', { name: /Find the right support service/ }),
    );
    await screen.findByLabelText('Ask AskANU a question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    // No sources are invented for a controlled error — the App shows none...
    expect(screen.queryByRole('region', { name: 'Sources' })).not.toBeInTheDocument();
    // ...but the route back to the verified official Support page is intact.
    expect(
      within(explore()).getByRole('link', { name: 'Support Services' }),
    ).toBeInTheDocument();
    resetMockScenario();
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