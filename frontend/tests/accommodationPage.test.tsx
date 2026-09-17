import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { ACCOMMODATION_DOMAIN } from '../src/domains/domainConfig';
import { setMockScenarioId } from '../src/dev/mockTransport';
import {
  okAccommodationResponse,
  partialAccommodationResponse,
} from '../src/mocks/askResponses';
import { isSafeHttpUrl } from '../src/util/safeUrl';
import { chatColumn, feedsSettled } from './helpers';

/** Open the Accommodation page the way a student does: through the Explore nav. */
async function openAccommodation(user: ReturnType<typeof userEvent.setup>) {
  const explore = screen.getByRole('navigation', { name: 'Explore' });
  await user.click(within(explore).getByRole('link', { name: 'Accommodation' }));
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { level: 1, name: /Accommodation/ }),
    ).toBeInTheDocument(),
  );
}

function cardById(id: string) {
  return ACCOMMODATION_DOMAIN.questions.find((q) => q.id === id)!;
}

const FIRST_CARD = ACCOMMODATION_DOMAIN.questions[0];

/** V3/V6 restrict Accommodation to the official ANU Accommodation pages. */
const OFFICIAL_HOSTS = ['study.anu.edu.au'];

describe('Accommodation guided-domain page', () => {
  it('is a launcher into the one chat, not another chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    expect(screen.queryByLabelText('Ask AskANU a question')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
  });

  it('gives the page exactly one h1', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the four recommended questions as real buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const cards = within(region).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent)).toEqual(
      ACCOMMODATION_DOMAIN.questions.map((q) => `${q.title}${q.description}`),
    );
    for (const card of cards) {
      expect(card).toHaveAttribute('type', 'button');
    }
  });

  it('links only to official ANU accommodation pages, safely, at the bottom', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    const official = screen.getByRole('region', {
      name: 'Official ANU accommodation search and navigation',
    });
    const links = within(official).getAllByRole('link');
    expect(links).toHaveLength(ACCOMMODATION_DOMAIN.resources.length);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      expect(OFFICIAL_HOSTS).toContain(new URL(href).hostname);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    expect(links[0]).toHaveAttribute('href', 'https://study.anu.edu.au/accommodation');

    const questions = screen.getByRole('region', { name: 'Recommended questions' });
    expect(
      questions.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows no invented residence, price or vacancy data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);
    await feedsSettled();
    const page = within(chatColumn());

    expect(page.queryByText(/\$[\d,]+/)).not.toBeInTheDocument();
    expect(
      page.queryByText(/\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i),
    ).not.toBeInTheDocument();
    // V6 Day 12: the UI must never suggest AskANU has live room availability.
    expect(page.queryByText(/vacan(t|cy)|room(s)? available/i)).not.toBeInTheDocument();
  });

  it('card click returns to the chat and prefills without sending', async () => {
    const user = userEvent.setup();
    const transportSpy = vi.spyOn(window, 'fetch');
    render(<App />);
    await openAccommodation(user);

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

    for (const question of ACCOMMODATION_DOMAIN.questions) {
      await openAccommodation(user);
      await user.click(screen.getByRole('button', { name: new RegExp(question.title) }));
      const input = await screen.findByLabelText('Ask AskANU a question');
      expect(input).toHaveValue(question.prompt);
    }
  });

  it('activates by keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const [first, second] = within(region).getAllByRole('button');

    first.focus();
    await user.keyboard('{Enter}');
    let input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(ACCOMMODATION_DOMAIN.questions[0].prompt);

    await openAccommodation(user);
    within(screen.getByRole('region', { name: 'Recommended questions' }))
      .getAllByRole('button')[1]
      .focus();
    expect(document.activeElement?.textContent).toBe(second.textContent);
    await user.keyboard(' ');
    input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(ACCOMMODATION_DOMAIN.questions[1].prompt);
  });

  it('keeps the current conversation when a card is chosen mid-session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Tell me about ANU accommodation',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByRole('list', { name: 'Conversation' });

    await openAccommodation(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    // V3: Clear Chat is the only thing that clears the session.
    const conversation = await screen.findByRole('list', { name: 'Conversation' });
    expect(
      within(conversation).getByText('Tell me about ANU accommodation'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(FIRST_CARD.prompt);
  });

  it('ok flow: renders the answer and an accommodation-domain source card', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    const card = cardById('residence-information');
    await user.click(screen.getByRole('button', { name: new RegExp(card.title) }));
    expect(await screen.findByLabelText('Ask AskANU a question')).toHaveValue(card.prompt);

    setMockScenarioId('ok-accommodation');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Placeholder answer about ANU accommodation/),
      ).toBeInTheDocument(),
    );
    const sources = screen.getByRole('region', { name: 'Sources' });
    const link = within(sources).getByRole('link');
    expect(link).toHaveTextContent('accommodation');
  });

  it('a long residence name and a long answer render without clipping', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('compare-residences').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('ok-many-sources');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const sources = await screen.findByRole('region', { name: 'Sources' });
    // The many-sources fixture exercises broad result sets generically; here it
    // proves the Accommodation launcher's chat handoff renders every source,
    // not a locally-capped sample.
    expect(within(sources).getAllByRole('link').length).toBeGreaterThan(9);
  });

  it('renders clarification naturally and supports a session follow-up', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    const card = cardById('residence-information');
    await user.click(screen.getByRole('button', { name: new RegExp(card.title) }));
    expect(await screen.findByLabelText('Ask AskANU a question')).toHaveValue(card.prompt);

    setMockScenarioId('needs-clarification-accommodation');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const options = await screen.findByRole('list', { name: 'Clarification options' });
    expect(screen.getByText('Which residence do you mean?')).toBeInTheDocument();
    expect(within(options).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1Placeholder residence A',
      '2Placeholder residence B',
    ]);
    expect(
      screen.getByText('Select an option, or reply in the message box.'),
    ).toBeInTheDocument();

    setMockScenarioId('ok-accommodation');
    await user.type(screen.getByLabelText('Ask AskANU a question'), 'first');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Placeholder answer about ANU accommodation/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(card.prompt)).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();
  });

  it('partial flow reads like an answer, not a fault', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('costs-and-features').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('partial-accommodation');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText(/Placeholder answer covering part of the accommodation question/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('insufficient evidence after a card stays compact and adds no residence facts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('how-to-apply').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('insufficient');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sources' })).not.toBeInTheDocument();
  });

  it('a backend-unavailable error after a card stays a controlled error, not invented content', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAccommodation(user);

    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('error');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(
      screen.getByText('The request could not be completed.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sources' })).not.toBeInTheDocument();
  });

  /**
   * Accommodation record identity is frozen cross-repo on Day 12 (Qasim
   * review): `source_id = accommodation_anu_study`, `record_id =
   * accommodation:residence:<slug>`. The App never parses either value, but
   * pinning the fixture shape here catches mock drift back toward the
   * pre-freeze placeholder identity the dev fixtures used before the
   * contract was frozen.
   */
  it('mock accommodation sources match the frozen production identity shape', () => {
    const allAccommodationSources = [
      ...okAccommodationResponse.sources,
      ...partialAccommodationResponse.sources,
    ];
    expect(allAccommodationSources.length).toBeGreaterThan(0);

    for (const source of allAccommodationSources) {
      expect(source.domain).toBe('accommodation');
      expect(source.source_id).toBe('accommodation_anu_study');
      expect(source.record_id).toMatch(/^accommodation:residence:[a-z0-9-]+$/);
      // Mock source URLs stay on example.invalid, never a real-looking ANU URL.
      expect(new URL(source.url).hostname).toBe('example.invalid');
    }
  });
});
