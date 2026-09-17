import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { SUPPORT_DOMAIN } from '../src/domains/domainConfig';
import { setMockScenarioId } from '../src/dev/mockTransport';
import { okSupportResponse, partialSupportResponse } from '../src/mocks/askResponses';
import { isSafeHttpUrl } from '../src/util/safeUrl';
import { chatColumn, feedsSettled } from './helpers';

/** Open the Support page the way a student does: through the Explore nav. */
async function openSupport(user: ReturnType<typeof userEvent.setup>) {
  const explore = screen.getByRole('navigation', { name: 'Explore' });
  await user.click(within(explore).getByRole('link', { name: 'Support Services' }));
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { level: 1, name: /Support/ }),
    ).toBeInTheDocument(),
  );
}

function cardById(id: string) {
  return SUPPORT_DOMAIN.questions.find((q) => q.id === id)!;
}

const FIRST_CARD = SUPPORT_DOMAIN.questions[0];

/** V3 names ANUSA Student Assistance plus approved ANU support pages. */
const OFFICIAL_HOSTS = ['anusa.com.au', 'www.anu.edu.au'];

describe('Support guided-domain page', () => {
  it('is a launcher into the one chat, not another chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    expect(screen.queryByLabelText('Ask AskANU a question')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
  });

  it('gives the page exactly one h1', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the four recommended questions as real buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const cards = within(region).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent)).toEqual(
      SUPPORT_DOMAIN.questions.map((q) => `${q.title}${q.description}`),
    );
    for (const card of cards) {
      expect(card).toHaveAttribute('type', 'button');
    }
  });

  it('links only to official ANU/ANUSA support pages, safely, at the bottom', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    const official = screen.getByRole('region', {
      name: 'Official ANU and ANUSA support navigation',
    });
    const links = within(official).getAllByRole('link');
    expect(links).toHaveLength(SUPPORT_DOMAIN.resources.length);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      expect(OFFICIAL_HOSTS).toContain(new URL(href).hostname);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    expect(links[0]).toHaveAttribute('href', 'https://anusa.com.au/student-assistance/');

    const questions = screen.getByRole('region', { name: 'Recommended questions' });
    expect(
      questions.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows no invented hotline, hours or emergency-promise data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);
    await feedsSettled();
    const page = within(chatColumn());

    // V6 Day 12: never hard-code hotlines, hours, "24/7", guaranteed response
    // times or personal/medical/legal advice in the UI copy.
    expect(page.queryByText(/24\/7|hotline|guaranteed response/i)).not.toBeInTheDocument();
    expect(
      page.queryByText(/\d{1,2}(:\d{2})?\s?(am|pm)\b/i),
    ).not.toBeInTheDocument();
    expect(page.queryByText(/\+?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/)).not.toBeInTheDocument();
  });

  /**
   * V6 Day 12 review (Qasim): the stored Support universe is only the six
   * ANUSA Student Assistance categories. The launcher must read as pointing
   * to the option that fits, not as promising a searchable index of every
   * ANU and ANUSA service.
   */
  it('does not claim broader indexed ANU-and-ANUSA coverage than is stored', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);
    const page = within(chatColumn());

    expect(page.queryByText(/ANU or ANUSA/i)).not.toBeInTheDocument();
    expect(page.getByText('Find the support option that matches what you need.')).toBeInTheDocument();
  });

  it('card click returns to the chat and prefills without sending', async () => {
    const user = userEvent.setup();
    const transportSpy = vi.spyOn(window, 'fetch');
    render(<App />);
    await openSupport(user);

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

    for (const question of SUPPORT_DOMAIN.questions) {
      await openSupport(user);
      await user.click(screen.getByRole('button', { name: new RegExp(question.title) }));
      const input = await screen.findByLabelText('Ask AskANU a question');
      expect(input).toHaveValue(question.prompt);
    }
  });

  it('activates by keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const [first, second] = within(region).getAllByRole('button');

    first.focus();
    await user.keyboard('{Enter}');
    let input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(SUPPORT_DOMAIN.questions[0].prompt);

    await openSupport(user);
    within(screen.getByRole('region', { name: 'Recommended questions' }))
      .getAllByRole('button')[1]
      .focus();
    expect(document.activeElement?.textContent).toBe(second.textContent);
    await user.keyboard(' ');
    input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(SUPPORT_DOMAIN.questions[1].prompt);
  });

  it('keeps the current conversation when a card is chosen mid-session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Tell me about ANU support services',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByRole('list', { name: 'Conversation' });

    await openSupport(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    // V3: Clear Chat is the only thing that clears the session.
    const conversation = await screen.findByRole('list', { name: 'Conversation' });
    expect(
      within(conversation).getByText('Tell me about ANU support services'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(FIRST_CARD.prompt);
  });

  it('ok flow: renders the answer and a support-domain source card', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    const card = cardById('what-it-helps-with');
    await user.click(screen.getByRole('button', { name: new RegExp(card.title) }));
    expect(await screen.findByLabelText('Ask AskANU a question')).toHaveValue(card.prompt);

    setMockScenarioId('ok-support');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Placeholder answer about an ANU support service/),
      ).toBeInTheDocument(),
    );
    const sources = screen.getByRole('region', { name: 'Sources' });
    const link = within(sources).getByRole('link');
    expect(link).toHaveTextContent('support');
  });

  it('a long support-service name and many source cards render without clipping', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('find-the-right-service').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('ok-many-sources');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const sources = await screen.findByRole('region', { name: 'Sources' });
    expect(within(sources).getAllByRole('link').length).toBeGreaterThan(9);
  });

  it('renders clarification naturally and supports a session follow-up', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    const card = cardById('find-the-right-service');
    await user.click(screen.getByRole('button', { name: new RegExp(card.title) }));
    expect(await screen.findByLabelText('Ask AskANU a question')).toHaveValue(card.prompt);

    setMockScenarioId('needs-clarification-support');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const options = await screen.findByRole('list', { name: 'Clarification options' });
    expect(screen.getByText('Which support service do you mean?')).toBeInTheDocument();
    expect(within(options).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1Placeholder support service A',
      '2Placeholder support service B',
    ]);
    expect(
      screen.getByText('Reply in the message box to choose one.'),
    ).toBeInTheDocument();

    setMockScenarioId('ok-support');
    await user.type(screen.getByLabelText('Ask AskANU a question'), 'first');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Placeholder answer about an ANU support service/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(card.prompt)).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();
  });

  it('partial flow reads like an answer, not a fault', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('contact-and-location').title) }),
    );
    await screen.findByLabelText('Ask AskANU a question');

    setMockScenarioId('partial-support');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText(/Placeholder answer covering part of the support question/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('insufficient evidence after a card stays compact and adds no support facts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSupport(user);

    await user.click(
      screen.getByRole('button', { name: new RegExp(cardById('student-assistance').title) }),
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
    await openSupport(user);

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
   * Support record identity is frozen cross-repo on Day 12 (Qasim review):
   * `source_id = support_anusa_student_assistance`, `record_id =
   * support:support_service:<slug>`. Pinning the fixture shape here catches
   * mock drift back toward the pre-freeze placeholder identity the dev
   * fixtures used before the contract was frozen.
   */
  it('mock support sources match the frozen production identity shape', () => {
    const allSupportSources = [
      ...okSupportResponse.sources,
      ...partialSupportResponse.sources,
    ];
    expect(allSupportSources.length).toBeGreaterThan(0);

    for (const source of allSupportSources) {
      expect(source.domain).toBe('support');
      expect(source.source_id).toBe('support_anusa_student_assistance');
      expect(source.record_id).toMatch(/^support:support_service:[a-z0-9-]+$/);
      // Mock source URLs stay on example.invalid, never a real-looking ANU URL.
      expect(new URL(source.url).hostname).toBe('example.invalid');
    }
  });
});
