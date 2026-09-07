import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { setMockScenarioId } from '../src/dev/mockTransport';

/**
 * SECURITY_BASELINE.md: user input, model output and stored source text are all
 * untrusted and must never be executed as HTML.
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

  it('renders HTML-like answer and source text as literal text', async () => {
    setMockScenarioId('hostile');
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Tell me about COMP1110',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          '<img src=x onerror=alert(1)><script>alert(2)</script><b>bold</b>',
        ),
      ).toBeInTheDocument(),
    );

    // Nothing from the answer or the source titles became an element.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('never puts a non-http scheme into an href', async () => {
    setMockScenarioId('hostile');
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      'Tell me about COMP1110',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );

    for (const anchor of container.querySelectorAll('a')) {
      expect(anchor.getAttribute('href')).toMatch(/^https?:\/\//);
    }
  });

  it('uses no raw HTML injection anywhere in the source tree', () => {
    // Guard against a future component reaching for dangerouslySetInnerHTML.
    // The grep equivalent is in the Day 2 evidence file; this keeps it in CI.
    const modules = import.meta.glob('../src/**/*.{ts,tsx}', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;

    // Comments legitimately name the API to explain why it is not used, so
    // strip them before scanning for a real call site.
    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

    const offenders = Object.entries(modules)
      .filter(([, source]) =>
        /dangerouslySetInnerHTML|\.innerHTML\s*=/.test(stripComments(source)),
      )
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });
});
