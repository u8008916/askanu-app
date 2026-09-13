import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { SCHOLARSHIPS_DOMAIN } from '../src/domains/domainConfig';
import { setMockScenarioId } from '../src/dev/mockTransport';
import { isSafeHttpUrl } from '../src/util/safeUrl';

/** Open the Scholarships page the way a student does: through the Explore nav. */
async function openScholarships(user: ReturnType<typeof userEvent.setup>) {
  const explore = screen.getByRole('navigation', { name: 'Explore' });
  await user.click(within(explore).getByRole('link', { name: 'Scholarships' }));
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { level: 1, name: /Scholarships/ }),
    ).toBeInTheDocument(),
  );
}

const FIRST_CARD = SCHOLARSHIPS_DOMAIN.questions[0];

describe('Scholarships guided-domain page', () => {
  it('is a launcher into the one chat, not another chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);

    // V3/V5: the domain page has no chat input of its own.
    expect(screen.queryByLabelText('Ask AskANU a question')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // And it is not a second conversation surface either.
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
  });

  it('gives the page exactly one h1', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the four recommended questions as real buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const cards = within(region).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent)).toEqual(
      SCHOLARSHIPS_DOMAIN.questions.map((q) => `${q.title}${q.description}`),
    );
    for (const card of cards) {
      expect(card).toHaveAttribute('type', 'button');
    }
  });

  it('links only to official ANU pages, safely, at the bottom', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);

    const official = screen.getByRole('region', {
      name: 'Official ANU scholarship search and navigation',
    });
    const links = within(official).getAllByRole('link');
    expect(links).toHaveLength(SCHOLARSHIPS_DOMAIN.resources.length);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      // V3/V5 restrict the Scholarships domain to the official Scholarships Finder.
      expect(new URL(href).hostname).toBe('study.anu.edu.au');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }

    // Resources come after the question cards in document order.
    const questions = screen.getByRole('region', { name: 'Recommended questions' });
    expect(
      questions.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows no invented scholarship data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);

    // No dollar value, percentage, closing date or named scholarship appears
    // as data — only the API/backend may supply that fact
    // (CONVERSATION_CONTRACT Scholarships).
    expect(screen.queryByText(/\$[\d,]+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i),
    ).not.toBeInTheDocument();
  });

  it('card click returns to the chat and prefills without sending', async () => {
    const user = userEvent.setup();
    const transportSpy = vi.spyOn(window, 'fetch');
    render(<App />);
    await openScholarships(user);

    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    // Back on the single chat, with the question waiting in the composer.
    const input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(FIRST_CARD.prompt);
    expect(input).toHaveFocus();

    // Nothing was sent: no request, no turn, and the empty state is intact.
    expect(transportSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Try asking' })).toBeInTheDocument();

    transportSpy.mockRestore();
  });

  it('every card prefills its own prompt', async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const question of SCHOLARSHIPS_DOMAIN.questions) {
      await openScholarships(user);
      await user.click(screen.getByRole('button', { name: new RegExp(question.title) }));
      const input = await screen.findByLabelText('Ask AskANU a question');
      expect(input).toHaveValue(question.prompt);
    }
  });

  it('activates by keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const [first, second] = within(region).getAllByRole('button');

    first.focus();
    await user.keyboard('{Enter}');
    let input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(SCHOLARSHIPS_DOMAIN.questions[0].prompt);

    await openScholarships(user);
    within(screen.getByRole('region', { name: 'Recommended questions' }))
      .getAllByRole('button')[1]
      .focus();
    expect(document.activeElement?.textContent).toBe(second.textContent);
    await user.keyboard(' ');
    input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(SCHOLARSHIPS_DOMAIN.questions[1].prompt);
  });

  it('keeps the prefilled question editable and sendable', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    const input = await screen.findByLabelText('Ask AskANU a question');
    await user.clear(input);
    await user.type(input, 'What scholarships are open for domestic undergraduates?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      screen.getByText('What scholarships are open for domestic undergraduates?'),
    ).toBeInTheDocument();
  });

  it('keeps the current conversation when a card is chosen mid-session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Tell me about ANU scholarships',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByRole('list', { name: 'Conversation' });

    await openScholarships(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    // V3: Clear Chat is the only thing that clears the session.
    const conversation = await screen.findByRole('list', { name: 'Conversation' });
    expect(
      within(conversation).getByText('Tell me about ANU scholarships'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(FIRST_CARD.prompt);
  });

  it('renders clarification naturally and supports a session follow-up', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScholarships(user);

    // "Check eligibility" routes into the one chat with its prefilled prompt.
    const eligibilityCard = SCHOLARSHIPS_DOMAIN.questions.find(
      (q) => q.id === 'check-eligibility',
    )!;
    await user.click(screen.getByRole('button', { name: new RegExp(eligibilityCard.title) }));
    const input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(eligibilityCard.prompt);

    // The API comes back ambiguous about *which scholarship*: the
    // CONVERSATION_CONTRACT baseline is a read-only option list, answered in
    // words, not a picker.
    setMockScenarioId('needs-clarification-scholarship');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const options = await screen.findByRole('list', { name: 'Clarification options' });
    expect(screen.getByText('Which scholarship do you mean?')).toBeInTheDocument();
    expect(within(options).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1Placeholder scholarship A',
      '2Placeholder scholarship B',
    ]);
    // Single-choice wording, since this clarification has allow_multiple: false.
    expect(
      screen.getByText('Reply in the message box to choose one.'),
    ).toBeInTheDocument();
    // It is a scholarship clarification, not the generic course one.
    expect(screen.queryByText(/COMP\d{4}/)).not.toBeInTheDocument();

    // Session follow-up: the student answers in the same composer, current
    // session kept — this is what "pending_clarification carried forward,
    // cleared once resolved" looks like from the UI.
    setMockScenarioId('ok');
    await user.type(screen.getByLabelText('Ask AskANU a question'), 'first');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Placeholder answer text\. Real answers come from/),
      ).toBeInTheDocument(),
    );
    // The resolved turn's own response carries no clarification, so the
    // option list from the earlier turn is the only one on screen — nothing
    // new was added for the resolved turn.
    expect(screen.getAllByRole('list', { name: 'Clarification options' })).toHaveLength(1);
    // Both turns of the session are still visible: no reset happened.
    expect(screen.getByText(eligibilityCard.prompt)).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();
  });
});
