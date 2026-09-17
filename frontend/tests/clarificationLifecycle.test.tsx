import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { setMockScenarioId } from '../src/dev/mockTransport';

/**
 * `useChatSession` carries exactly one `pendingClarification`, mirrored from
 * the latest assistant response. This suite pins the consequence for the UI:
 * once a later response resolves or replaces a clarification, the turn that
 * asked it stops being able to accept an answer, even though it stays on
 * screen as conversation history. Only the newest clarification turn — the
 * one a reply would actually resolve — may still be interactive.
 */
async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(screen.getByLabelText('Ask AskANU a question'), question);
  await user.click(screen.getByRole('button', { name: 'Send' }));
}

describe('clarification lifecycle across turns', () => {
  it('disables an earlier clarification once a later response replaces it, and keeps the new one live', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Clarification A: multi-select (allow_multiple: true), COMP1110/COMP1600.
    setMockScenarioId('needs-clarification');
    await ask(user, 'Tell me about COMP1110 or COMP1600');

    // `getByRole` throws until the element exists, so this is itself the wait.
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: /COMP1110/ })).toBeInTheDocument(),
    );

    const firstComp1110 = screen.getByRole('checkbox', { name: /COMP1110/ });
    const firstComp1600 = screen.getByRole('checkbox', { name: /COMP1600/ });

    // Still the only turn: its controls are live.
    expect(firstComp1110).toBeEnabled();
    expect(firstComp1600).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Use selection' }),
    ).toBeInTheDocument();

    // A second response supersedes it with a different clarification.
    // Note: its fixture answer text ("Which course do you mean?") must not be
    // confused with a *question* asked in this test — the wait below targets
    // an option unique to this second clarification, not the answer text,
    // precisely to avoid matching the user's own already-on-screen question.
    setMockScenarioId('needs-clarification-many');
    await ask(user, 'Actually, which one exactly?');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /COMP1100/ }),
      ).toBeInTheDocument(),
    );

    // Clarification A is conversation history now: visible, not answerable.
    expect(firstComp1110).toBeDisabled();
    expect(firstComp1600).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Use selection' }),
    ).not.toBeInTheDocument();

    // A click on a disabled control does nothing.
    await user.click(firstComp1110);
    expect(firstComp1110).not.toBeChecked();

    // The current clarification (single-select this time) remains actionable.
    const currentOption = screen.getByRole('button', { name: /COMP1100/ });
    expect(currentOption).toBeEnabled();
    await user.click(currentOption);
    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(
      'COMP1100',
    );
  });

  it('disables a clarification once it is resolved into an ordinary answer', async () => {
    const user = userEvent.setup();
    render(<App />);

    setMockScenarioId('needs-clarification');
    await ask(user, 'Which course do you mean?');

    await waitFor(() =>
      expect(
        screen.getByText('Do you mean COMP1110 or COMP1600?'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('checkbox', { name: /COMP1110/ })).toBeEnabled();

    // Resolved: the next response carries no clarification at all.
    setMockScenarioId('ok');
    await ask(user, 'Both');

    await waitFor(() =>
      expect(
        screen.getByText(/Placeholder answer text\. Real answers come from/),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole('checkbox', { name: /COMP1110/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /COMP1600/ })).toBeDisabled();
    // No live clarification remains anywhere in the conversation.
    expect(screen.queryByRole('button', { name: 'Use selection' })).not.toBeInTheDocument();
  });
});
