import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { JOBS_DOMAIN } from '../src/domains/domainConfig';
import { setMockScenarioId } from '../src/dev/mockTransport';
import {
  okCurrentJobsResponse,
  partialClosingSoonResponse,
} from '../src/mocks/askResponses';
import { isSafeHttpUrl } from '../src/util/safeUrl';
import { chatColumn, feedsSettled } from './helpers';

/** Open the Jobs page the way a student does: through the Explore nav. */
async function openJobs(user: ReturnType<typeof userEvent.setup>) {
  const explore = screen.getByRole('navigation', { name: 'Explore' });
  await user.click(within(explore).getByRole('link', { name: 'Jobs' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 1, name: /Jobs/ })).toBeInTheDocument(),
  );
}

function cardById(id: string) {
  return JOBS_DOMAIN.questions.find((q) => q.id === id)!;
}

const FIRST_CARD = JOBS_DOMAIN.questions[0];

/** V3 approves ANU Jobs; the resource links stay on ANU's own hosts. */
const OFFICIAL_HOSTS = ['jobs.anu.edu.au', 'www.anu.edu.au'];

describe('Jobs guided-domain page', () => {
  it('is a launcher into the one chat, not another chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    expect(screen.queryByLabelText('Ask AskANU a question')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
    // And no separate jobs search UI lives inside the domain page.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('gives the page exactly one h1', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the four recommended questions as real buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const cards = within(region).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent)).toEqual(
      JOBS_DOMAIN.questions.map((q) => `${q.title}${q.description}`),
    );
    expect(JOBS_DOMAIN.questions.map((q) => q.id)).toEqual([
      'current-jobs',
      'jobs-for-background',
      'closing-soon',
      'job-requirements',
    ]);
    for (const card of cards) {
      expect(card).toHaveAttribute('type', 'button');
    }
  });

  it('links only to official ANU pages, safely, at the bottom', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    const official = screen.getByRole('region', {
      name: 'Official ANU jobs search and navigation',
    });
    const links = within(official).getAllByRole('link');
    expect(links).toHaveLength(JOBS_DOMAIN.resources.length);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      expect(OFFICIAL_HOSTS).toContain(new URL(href).hostname);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    // The official listing the scraper collects from is the first escape hatch.
    expect(links[0]).toHaveAttribute('href', 'https://jobs.anu.edu.au/jobs/search');

    const questions = screen.getByRole('region', { name: 'Recommended questions' });
    expect(
      questions.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows no invented job data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);
    // The rail's Current Jobs panel legitimately shows server-sent roles and
    // closing wording; the launcher column itself must carry none.
    await feedsSettled();
    const page = within(chatColumn());

    // No closing date, salary or named role appears as data: whether a job is
    // open, and when it closes, are server facts the App never infers.
    expect(page.queryByText(/\$[\d,]+/)).not.toBeInTheDocument();
    expect(
      page.queryByText(/\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i),
    ).not.toBeInTheDocument();
    expect(page.queryByText(/Placeholder role/)).not.toBeInTheDocument();
  });

  it('card click returns to the chat and prefills without sending', async () => {
    const user = userEvent.setup();
    const transportSpy = vi.spyOn(window, 'fetch');
    render(<App />);
    await openJobs(user);

    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    const input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(FIRST_CARD.prompt);
    expect(input).toHaveFocus();

    expect(transportSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Try asking' })).toBeInTheDocument();

    transportSpy.mockRestore();
  });

  it('every card prefills its own prompt', async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const question of JOBS_DOMAIN.questions) {
      await openJobs(user);
      await user.click(screen.getByRole('button', { name: new RegExp(question.title) }));
      const input = await screen.findByLabelText('Ask AskANU a question');
      expect(input).toHaveValue(question.prompt);
    }
  });

  it('activates by keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const [first, second] = within(region).getAllByRole('button');

    first.focus();
    await user.keyboard('{Enter}');
    let input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(JOBS_DOMAIN.questions[0].prompt);

    await openJobs(user);
    within(screen.getByRole('region', { name: 'Recommended questions' }))
      .getAllByRole('button')[1]
      .focus();
    expect(document.activeElement?.textContent).toBe(second.textContent);
    await user.keyboard(' ');
    input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(JOBS_DOMAIN.questions[1].prompt);
  });

  it('keeps the current conversation when a card is chosen mid-session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Tell me about ANU jobs');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByRole('list', { name: 'Conversation' });

    await openJobs(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    // V3: Clear Chat is the only thing that clears the session.
    const conversation = await screen.findByRole('list', { name: 'Conversation' });
    expect(within(conversation).getByText('Tell me about ANU jobs')).toBeInTheDocument();
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(FIRST_CARD.prompt);
  });

  it('current-jobs flow: renders the list in server order with dates and source cards intact', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    const card = cardById('current-jobs');
    await user.click(screen.getByRole('button', { name: new RegExp(card.title) }));
    const input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(card.prompt);

    setMockScenarioId('ok-jobs-current');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // The roles arrive as one numbered list, in the order the service sent.
    const firstRole = await screen.findByText('Placeholder role A', { selector: 'strong' });
    const list = firstRole.closest('ol')!;
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items.map((li) => li.querySelector('strong')?.textContent)).toEqual([
      'Placeholder role A',
      'Placeholder role B',
      'Placeholder role C with a deliberately long title so that wrapping inside the chat column is visible at narrow widths',
      'Placeholder role D',
      'Placeholder role E',
    ]);

    // Closing information is never truncated: every dated role shows its
    // date, and the undated role says so in the service's own words.
    for (const li of items.slice(0, 4)) {
      expect(li).toHaveTextContent(/closes \d{1,2} January 2099/);
    }
    expect(items[4]).toHaveTextContent('no closing date listed');
    // The App adds no open/closed verdict of its own.
    expect(screen.queryByText(/^(Open|Closed)$/)).not.toBeInTheDocument();

    // One source card per role, in the same order, all on the jobs domain.
    const sources = screen.getByRole('region', { name: 'Sources' });
    const links = within(sources).getAllByRole('link');
    expect(links).toHaveLength(okCurrentJobsResponse.sources.length);
    links.forEach((link, index) => {
      const source = okCurrentJobsResponse.sources[index];
      expect(link).toHaveAttribute('href', source.url);
      expect(link).toHaveTextContent(source.title);
      expect(link).toHaveTextContent('jobs');
      expect(link).toHaveAttribute('target', '_blank');
    });

    // The session is intact: the guided prompt is still the user turn.
    expect(screen.getByText(card.prompt)).toBeInTheDocument();
  });

  it('closing-soon flow: a partial answer reads like an answer, not a fault', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    const card = cardById('closing-soon');
    await user.click(screen.getByRole('button', { name: new RegExp(card.title) }));
    expect(await screen.findByLabelText('Ask AskANU a question')).toHaveValue(card.prompt);

    setMockScenarioId('partial-jobs-closing');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const firstRole = await screen.findByText('Placeholder role A', { selector: 'strong' });
    const items = within(firstRole.closest('ol')!).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('closes 1 January 2099');
    expect(items[1]).toHaveTextContent('closes 8 January 2099');

    // The service's own caveat is shown verbatim; `partial` gets no App-made
    // banner, and it is not an error or an abstention.
    expect(
      screen.getByText(/One further open role lists no closing date/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Not enough evidence to answer')).not.toBeInTheDocument();

    const sources = screen.getByRole('region', { name: 'Sources' });
    expect(within(sources).getAllByRole('link')).toHaveLength(
      partialClosingSoonResponse.sources.length,
    );
  });

  it('insufficient evidence after a jobs card stays compact and adds no roles', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openJobs(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('job-requirements').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('insufficient');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sources' })).not.toBeInTheDocument();
    // The abstention adds no roles to the conversation; the rail's panel is
    // server data and out of scope here.
    const conversation = screen.getByRole('list', { name: 'Conversation' });
    expect(within(conversation).queryByText(/Placeholder role/)).not.toBeInTheDocument();
  });

  /**
   * Jobs v1 identity is frozen cross-repo: `source_id = jobs_anu_search`,
   * `record_id = jobs:job:<numeric requisition id>`. The App never parses
   * either value, but pinning the fixture shape here catches mock drift
   * back toward the pre-freeze slug placeholders.
   */
  it('mock job sources match the frozen Jobs v1 identity shape', () => {
    const allJobSources = [
      ...okCurrentJobsResponse.sources,
      ...partialClosingSoonResponse.sources,
    ];
    expect(allJobSources.length).toBeGreaterThan(0);

    for (const source of allJobSources) {
      expect(source.domain).toBe('jobs');
      expect(source.source_id).toBe('jobs_anu_search');
      expect(source.record_id).toMatch(/^jobs:job:\d+$/);
      // Mock source URLs stay on example.invalid, never a real-looking ANU URL.
      expect(new URL(source.url).hostname).toBe('example.invalid');
    }
  });
});
