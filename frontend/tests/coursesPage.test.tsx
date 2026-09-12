import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { COURSES_DOMAIN } from '../src/domains/domainConfig';
import { isSafeHttpUrl } from '../src/util/safeUrl';

/** Open the Courses page the way a student does: through the Explore nav. */
async function openCourses(user: ReturnType<typeof userEvent.setup>) {
  const explore = screen.getByRole('navigation', { name: 'Explore' });
  await user.click(within(explore).getByRole('link', { name: 'Courses' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 1, name: /Courses/ })).toBeInTheDocument(),
  );
}

const FIRST_CARD = COURSES_DOMAIN.questions[0];

describe('Courses guided-domain page', () => {
  it('is a launcher into the one chat, not another chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

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
    await openCourses(user);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the four recommended questions as real buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const cards = within(region).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent)).toEqual(
      COURSES_DOMAIN.questions.map((q) => `${q.title}${q.description}`),
    );
    for (const card of cards) {
      expect(card).toHaveAttribute('type', 'button');
    }
  });

  it('links only to official ANU pages, safely, at the bottom', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

    const official = screen.getByRole('region', {
      name: 'Official ANU search and navigation',
    });
    const links = within(official).getAllByRole('link');
    expect(links).toHaveLength(COURSES_DOMAIN.resources.length);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      // V3/V5 restrict the Courses domain to Programs and Courses.
      expect(new URL(href).hostname).toBe('programsandcourses.anu.edu.au');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }

    // Resources come after the question cards in document order.
    const questions = screen.getByRole('region', { name: 'Recommended questions' });
    expect(
      questions.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows no invented course data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

    // No course code, session, unit value or requirement appears as data.
    expect(screen.queryByText(/COMP\d{4}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\b(units?|semester|session)\b/i)).not.toBeInTheDocument();
  });

  it('card click returns to the chat and prefills without sending', async () => {
    const user = userEvent.setup();
    const transportSpy = vi.spyOn(window, 'fetch');
    render(<App />);
    await openCourses(user);

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

    for (const question of COURSES_DOMAIN.questions) {
      await openCourses(user);
      await user.click(screen.getByRole('button', { name: new RegExp(question.title) }));
      const input = await screen.findByLabelText('Ask AskANU a question');
      expect(input).toHaveValue(question.prompt);
    }
  });

  it('activates by keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    const [first, second] = within(region).getAllByRole('button');

    first.focus();
    await user.keyboard('{Enter}');
    let input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(COURSES_DOMAIN.questions[0].prompt);

    await openCourses(user);
    within(screen.getByRole('region', { name: 'Recommended questions' }))
      .getAllByRole('button')[1]
      .focus();
    expect(document.activeElement?.textContent).toBe(second.textContent);
    await user.keyboard(' ');
    input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue(COURSES_DOMAIN.questions[1].prompt);
  });

  it('keeps the prefilled question editable and sendable', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    const input = await screen.findByLabelText('Ask AskANU a question');
    await user.clear(input);
    await user.type(input, 'What are the prerequisites for COMP1110?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      screen.getByText('What are the prerequisites for COMP1110?'),
    ).toBeInTheDocument();
  });

  it('keeps the current conversation when a card is chosen mid-session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Tell me about COMP1110');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByRole('list', { name: 'Conversation' });

    await openCourses(user);
    await user.click(screen.getByRole('button', { name: new RegExp(FIRST_CARD.title) }));

    // V3: Clear Chat is the only thing that clears the session.
    const conversation = await screen.findByRole('list', { name: 'Conversation' });
    expect(within(conversation).getByText('Tell me about COMP1110')).toBeInTheDocument();
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(FIRST_CARD.prompt);
  });
});
