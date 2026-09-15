import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { setMockFeedScenario } from '../src/dev/mockFeeds';
import { mockCurrentJobs, mockUpcomingEvents } from '../src/mocks/feedResponses';

/**
 * The Current Jobs and Upcoming Events panels through the App, in every state
 * the feed can be in. The mock feed stands in for the App -> RAG path; the
 * real client is covered in `listApi.test.ts`.
 *
 * Two rules hold in every state: nothing invented (no placeholder rows, no
 * App-made open/closed verdict, no guessed URL) and the server's order kept.
 */

function panel(name: 'Current Jobs' | 'Upcoming Events') {
  return screen.getByRole('region', { name });
}

async function settled(name: 'Current Jobs' | 'Upcoming Events') {
  await waitFor(() =>
    expect(within(panel(name)).queryByText('Loading…')).not.toBeInTheDocument(),
  );
  return panel(name);
}

describe('Current Jobs panel', () => {
  it('shows a loading line first, then the server list in server order', async () => {
    render(<App />);

    expect(within(panel('Current Jobs')).getByText('Loading…')).toBeInTheDocument();

    const jobs = await settled('Current Jobs');
    const links = within(jobs).getAllByRole('link', { name: /Placeholder role/ });
    expect(links).toHaveLength(mockCurrentJobs.length);
    links.forEach((link, index) => {
      const job = mockCurrentJobs[index];
      expect(link).toHaveTextContent(job.title);
      expect(link).toHaveAttribute('href', job.url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });

  it('renders published type, location and closing wording, and nothing for missing fields', async () => {
    render(<App />);
    const jobs = await settled('Current Jobs');

    // Role A: two employment types, a location and closing wording.
    const roleA = within(jobs).getByRole('link', { name: /Placeholder role A/ });
    expect(roleA).toHaveTextContent('Full time, Continuing');
    expect(roleA).toHaveTextContent('Placeholder location');
    expect(roleA).toHaveTextContent('Closes 1 January 2099');

    // Role D: employment_types is []; the meta line simply omits it.
    const roleD = within(jobs).getByRole('link', { name: /Placeholder role D/ });
    expect(roleD).toHaveTextContent('Placeholder location · Closes 22 January 2099');

    // Role E: undated. Nothing is derived — no date, no "open", no "closed".
    const roleE = within(jobs).getByRole('link', { name: /Placeholder role E/ });
    expect(roleE).not.toHaveTextContent(/Closes/);
    expect(within(jobs).queryByText(/\b(open|closed)\b/i)).not.toBeInTheDocument();
    // And the long title is complete, not clipped.
    expect(within(jobs).getByRole('link', { name: /Placeholder role C/ })).toHaveTextContent(
      mockCurrentJobs[2].title,
    );
  });

  it('View all routes to the Jobs launcher page', async () => {
    const user = userEvent.setup();
    render(<App />);
    const jobs = await settled('Current Jobs');

    const viewAll = within(jobs).getByRole('link', { name: 'View all' });
    expect(viewAll).toHaveAttribute('href', '/jobs');
    await user.click(viewAll);
    expect(await screen.findByRole('heading', { level: 1, name: /Jobs/ })).toBeInTheDocument();
  });

  it('shows an honest empty line for a successful empty list', async () => {
    setMockFeedScenario('jobs', 'empty');
    render(<App />);
    const jobs = await settled('Current Jobs');

    expect(within(jobs).getByText('No current ANU jobs are listed right now.')).toBeInTheDocument();
    expect(within(jobs).queryByRole('list')).not.toBeInTheDocument();
    expect(within(jobs).queryByText(/Placeholder/)).not.toBeInTheDocument();
  });

  it('shows an unavailable line, and no internals, when the feed fails', async () => {
    setMockFeedScenario('jobs', 'unavailable');
    render(<App />);
    const jobs = await settled('Current Jobs');

    expect(within(jobs).getByText('Current jobs are unavailable right now.')).toBeInTheDocument();
    expect(within(jobs).queryByRole('list')).not.toBeInTheDocument();
    expect(jobs.textContent).not.toMatch(/error|fail|502|404|mock/i);
    // The chat is unaffected.
    expect(screen.getByLabelText('Ask AskANU a question')).toBeEnabled();
  });

  it('never shows placeholder slots in any state', async () => {
    for (const scenario of ['ok', 'empty', 'unavailable'] as const) {
      setMockFeedScenario('jobs', scenario);
      const { unmount } = render(<App />);
      const jobs = await settled('Current Jobs');
      expect(within(jobs).queryByText(/Placeholder slot|Awaiting data/)).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('Upcoming Events panel', () => {
  it('defaults to the unavailable state, matching the deployed service today', async () => {
    render(<App />);
    const events = await settled('Upcoming Events');

    expect(
      within(events).getByText('Upcoming events are unavailable right now.'),
    ).toBeInTheDocument();
    expect(within(events).queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();
  });

  it('renders contract-shaped events in server order with a Canberra time', async () => {
    setMockFeedScenario('events', 'ok');
    render(<App />);
    const events = await settled('Upcoming Events');

    const links = within(events).getAllByRole('link', { name: /Placeholder event/ });
    expect(links).toHaveLength(mockUpcomingEvents.length);
    expect(links[0]).toHaveAttribute('href', mockUpcomingEvents[0].url);
    // 2099-03-02T10:00+11:00 is Mon 2 Mar, 10:00 am in Canberra (AEDT); the
    // stored offset is rendered in the Canberra zone, not the machine's.
    expect(links[0]).toHaveTextContent(/Mon, 2 Mar, 10:00 am/);
    expect(links[0]).toHaveTextContent('Placeholder venue');
    // Venue-less item: time only, nothing invented in its place.
    expect(links[1]).toHaveTextContent(/Tue, 3 Mar, 6:30 pm/);
    expect(links[1]).not.toHaveTextContent('venue');
  });

  it('shows an honest empty line for a successful empty list', async () => {
    setMockFeedScenario('events', 'empty');
    render(<App />);
    const events = await settled('Upcoming Events');

    expect(
      within(events).getByText('No upcoming ANU events are listed right now.'),
    ).toBeInTheDocument();
  });
});

describe('feeds are shared, not refetched per panel instance', () => {
  it('keeps both panels present through an active conversation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await settled('Current Jobs');

    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByRole('list', { name: 'Conversation' });

    expect(within(panel('Current Jobs')).getAllByRole('link', { name: /Placeholder role/ })).toHaveLength(
      mockCurrentJobs.length,
    );
    expect(panel('Upcoming Events')).toBeInTheDocument();
  });
});
