import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { isSafeHttpUrl } from '../src/util/safeUrl';

/** Open the Courses page the way a student does: through the Explore nav. */
async function openCourses(user: ReturnType<typeof userEvent.setup>) {
  const explore = screen.getByRole('navigation', { name: 'Explore' });
  await user.click(within(explore).getByRole('link', { name: 'Courses' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 1, name: /Courses/ })).toBeInTheDocument(),
  );
}

describe('Courses resource page', () => {
  it('is a resource hub, not another chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

    // V3: resource pages are information hubs, not separate bots.
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

  it('links only to official ANU pages, safely', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

    const official = screen.getByRole('region', {
      name: 'Official ANU search and navigation',
    });
    const links = within(official).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      // V3 restricts the Courses domain to Programs and Courses.
      expect(new URL(href).hostname).toBe('programsandcourses.anu.edu.au');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('shows no invented course data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);

    // The planned-fields block names fields; it must not display values.
    const planned = screen.getByRole('region', { name: 'Course details in AskANU' });
    expect(
      within(planned).getByText(/Placeholder only — awaiting the courses endpoint/),
    ).toBeInTheDocument();
  });

  it('call to action returns to the chat and prefills without sending', async () => {
    const user = userEvent.setup();
    const transportSpy = vi.spyOn(window, 'fetch');
    render(<App />);
    await openCourses(user);

    await user.click(screen.getByRole('button', { name: 'Ask a course question' }));

    // Back on the single chat, with the question waiting in the composer.
    const input = await screen.findByLabelText('Ask AskANU a question');
    expect(input).toHaveValue('Tell me about COMP1110.');
    expect(input).toHaveFocus();

    // Nothing was sent: no request, no turn, and the empty state is intact.
    expect(transportSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Try asking' })).toBeInTheDocument();

    transportSpy.mockRestore();
  });

  it('keeps the prefilled question editable and sendable', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCourses(user);
    await user.click(screen.getByRole('button', { name: 'Ask a course question' }));

    const input = await screen.findByLabelText('Ask AskANU a question');
    await user.clear(input);
    await user.type(input, 'What are the prerequisites for COMP1110?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      screen.getByText('What are the prerequisites for COMP1110?'),
    ).toBeInTheDocument();
  });
});
