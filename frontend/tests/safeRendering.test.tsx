import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

/**
 * SECURITY_BASELINE.md: user and model strings are untrusted and must never be
 * executed as HTML.
 */
describe('safe rendering', () => {
  it('renders HTML-like user input as literal text, not markup', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const hostile = '<img src=x onerror=alert(1)><b>bold</b>';

    await user.type(screen.getByLabelText('Ask AskANU a question'), hostile);
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText(hostile)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });
});
