import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { EVENTS_DOMAIN } from '../src/domains/domainConfig';
import { setMockFeedScenario } from '../src/dev/mockFeeds';
import { setMockScenarioId } from '../src/dev/mockTransport';
import { okEventsResponse, partialEventsResponse } from '../src/mocks/askResponses';
import { mockUpcomingEvents } from '../src/mocks/feedResponses';
import { isSafeHttpUrl } from '../src/util/safeUrl';
import { chatColumn, feedsSettled } from './helpers';

/** Open the Events page the way a student does: through the Explore nav. */
async function openEvents(user: ReturnType<typeof userEvent.setup>) {
  const explore = screen.getByRole('navigation', { name: 'Explore' });
  await user.click(within(explore).getByRole('link', { name: 'Events' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 1, name: /Events/ })).toBeInTheDocument(),
  );
}

function cardById(id: string) {
  return EVENTS_DOMAIN.questions.find((q) => q.id === id)!;
}

const FIRST_CARD = EVENTS_DOMAIN.questions[0];

/** V3 names the official ANU Events/calendar as the Events release source. */
const OFFICIAL_HOSTS = ['www.anu.edu.au'];

describe('Events guided-domain page', () => {
  it('is a launcher into the one chat, not another chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    expect(screen.queryByLabelText('Ask AskANU a question')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
  });

  it('gives the page exactly one h1', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the four recommended questions as real buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const cards = within(region).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent)).toEqual(
      EVENTS_DOMAIN.questions.map((q) => `${q.title}${q.description}`),
    );
    for (const card of cards) {
      expect(card).toHaveAttribute('type', 'button');
    }
  });

  it('links only to official ANU events pages, safely, at the bottom', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    const official = screen.getByRole('region', { name: 'Official ANU events navigation' });
    const links = within(official).getAllByRole('link');
    expect(links).toHaveLength(EVENTS_DOMAIN.resources.length);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      expect(OFFICIAL_HOSTS).toContain(new URL(href).hostname);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    expect(links[0]).toHaveAttribute('href', 'https://www.anu.edu.au/events');

    const questions = screen.getByRole('region', { name: 'Recommended questions' });
    expect(
      questions.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  /**
   * V6 Day 15: no event title, date, time, venue, ticket, price or
   * registration detail is hard-coded in the launcher. The check is scoped to
   * the chat column because the rail's Upcoming Events panel legitimately
   * shows server dates once the feed resolves.
   */
  it('shows no invented event data in the page copy', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);
    await feedsSettled();
    const page = within(chatColumn());

    expect(
      page.queryByText(/\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i),
    ).not.toBeInTheDocument();
    expect(page.queryByText(/\d{1,2}(:\d{2})?\s?(am|pm)\b/i)).not.toBeInTheDocument();
    expect(page.queryByText(/\$[\d,]+/)).not.toBeInTheDocument();
    expect(
      page.queryByText(/ticket|register|registration|free entry|sold out|online|hybrid|in-person/i),
    ).not.toBeInTheDocument();
    expect(page.queryByText(/Placeholder event/)).not.toBeInTheDocument();
  });

  /**
   * The RAG service routes a question to its Events path on the word
   * "event(s)" and resolves only `today`, `tomorrow`, `this Friday` and
   * `next week` in Australia/Canberra. A card must not promise wording the
   * backend cannot answer ("this week", "this weekend"), and "this Friday"
   * is excluded because it has no answer on a Saturday or Sunday.
   */
  it('uses only time wording the backend resolves, and always says "events"', () => {
    for (const question of EVENTS_DOMAIN.questions) {
      expect(question.prompt).toMatch(/\bevents?\b/i);
      expect(question.prompt).not.toMatch(/this week|weekend|this Friday|tonight/i);
    }
    const prompts = EVENTS_DOMAIN.questions.map((q) => q.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('card click returns to the chat and prefills without sending', async () => {
    const user = userEvent.setup();
    const transportSpy = vi.spyOn(window, 'fetch');
    render(<App />);
    await openEvents(user);

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

    for (const question of EVENTS_DOMAIN.questions) {
      await openEvents(user);
      await user.click(screen.getByRole('button', { name: new RegExp(question.title) }));
      const input = await screen.findByLabelText('Ask AskANU a question');
      expect(input).toHaveValue(question.prompt);
    }
  });

  it('activates by keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const [, second] = within(region).getAllByRole('button');

    within(region).getAllByRole('button')[0].focus();
    await user.keyboard('{Enter}');
    let input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(EVENTS_DOMAIN.questions[0].prompt);

    await openEvents(user);
    within(screen.getByRole('region', { name: 'Recommended questions' }))
      .getAllByRole('button')[1]
      .focus();
    expect(document.activeElement?.textContent).toBe(second.textContent);
    await user.keyboard(' ');
    input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(EVENTS_DOMAIN.questions[1].prompt);
  });

  it('keeps the current conversation when a card is chosen mid-session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Tell me about ANU events');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByRole('list', { name: 'Conversation' });

    await openEvents(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    // V3: Clear Chat is the only thing that clears the session.
    const conversation = await screen.findByRole('list', { name: 'Conversation' });
    expect(within(conversation).getByText('Tell me about ANU events')).toBeInTheDocument();
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(FIRST_CARD.prompt);
  });

  it('ok flow: renders the backend paragraphs verbatim with official and Rubric source cards', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    const card = cardById('whats-coming-up');
    await user.click(screen.getByRole('button', { name: new RegExp(card.title) }));
    expect(await screen.findByLabelText('Ask AskANU a question')).toHaveValue(card.prompt);

    setMockScenarioId('ok-events');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // The stored ISO timestamp is displayed exactly as sent — the App does not
    // reformat, translate or drop a backend-authored fact.
    await waitFor(() =>
      expect(
        screen.getByText(/Starts: 2099-03-02T10:00:00\+11:00\. Ends: 2099-03-02T11:00:00\+11:00\./),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Venue: not published in the stored source record/),
    ).toBeInTheDocument();
    // Two paragraphs, one per event, not one run-on line.
    const conversation = screen.getByRole('list', { name: 'Conversation' });
    expect(within(conversation).getAllByText(/^Placeholder event [AB]\. Starts:/)).toHaveLength(2);

    const sources = screen.getByRole('region', { name: 'Sources' });
    const links = within(sources).getAllByRole('link');
    expect(links).toHaveLength(okEventsResponse.sources.length);
    for (const link of links) {
      expect(link).toHaveTextContent('events');
    }
    expect(links[0]).toHaveAttribute('href', okEventsResponse.sources[0].url);
    expect(links[1]).toHaveAttribute('href', okEventsResponse.sources[1].url);
  });

  it('a long event title and many source cards render without clipping', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('events-next-week').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('ok-many-sources');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const sources = await screen.findByRole('region', { name: 'Sources' });
    expect(within(sources).getAllByRole('link').length).toBeGreaterThan(9);
  });

  it('partial flow reads like an answer, not a fault', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('where-and-who').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('partial-events');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText(/Only one stored record matched that period/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  /**
   * The backend's no-match answer for a time period is `insufficient_evidence`
   * (there is no Events clarification path today). The UI stays compact and
   * adds no event of its own.
   */
  it('no-match (insufficient evidence) after a card stays compact and adds no event facts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('events-today').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('insufficient');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sources' })).not.toBeInTheDocument();
    expect(within(chatColumn()).queryByText(/Placeholder event/)).not.toBeInTheDocument();
  });

  it('a backend-unavailable error after a card stays a controlled error, not invented content', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openEvents(user);

    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('error');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('The request could not be completed.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sources' })).not.toBeInTheDocument();
  });

  it('the Upcoming Events panel stays on the Events page in every feed state', async () => {
    const user = userEvent.setup();
    setMockFeedScenario('events', 'ok');
    render(<App />);
    await openEvents(user);
    await feedsSettled();

    const panel = screen.getByRole('region', { name: 'Upcoming Events' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(mockUpcomingEvents.length);
    expect(within(panel).getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/events',
    );
  });

  /**
   * Events record identity is frozen cross-repo on Day 15 (askanu-rag
   * `carmen/day15-events-rag-api`): `record_id = events:event:<entity_id>`,
   * with `source_id` either the official `events_anu_official` or the approved
   * `rubric_unified_search`; the dedicated Upcoming panel carries the official
   * one only. Pinning the fixture shape catches mock drift.
   */
  it('mock events sources and feed items match the frozen production identity shape', () => {
    const chatSources = [...okEventsResponse.sources, ...partialEventsResponse.sources];
    expect(chatSources.length).toBeGreaterThan(0);
    for (const source of chatSources) {
      expect(source.domain).toBe('events');
      expect(['events_anu_official', 'rubric_unified_search']).toContain(source.source_id);
      expect(source.record_id).toMatch(/^events:event:[a-z0-9-]+$/);
      // Mock source URLs stay on example.invalid, never a real-looking ANU URL.
      expect(new URL(source.url).hostname).toBe('example.invalid');
    }
    for (const item of mockUpcomingEvents) {
      expect(item.domain).toBe('events');
      expect(item.source_id).toBe('events_anu_official');
      expect(item.record_id).toMatch(/^events:event:[a-z0-9-]+$/);
      expect(new URL(item.url).hostname).toBe('example.invalid');
    }
  });
});
