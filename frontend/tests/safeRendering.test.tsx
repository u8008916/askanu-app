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
  /*
   * Day 4 added a formatter between the answer string and the DOM. Structure is
   * the only thing it may create: hostile text inside a list item or inside
   * `**...**` must still arrive as characters on screen, never as elements.
   */
  it('renders hostile list and emphasis content as text, not elements', async () => {
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
        screen.getByText('<img src=x onerror=alert(5)> hostile list item'),
      ).toBeInTheDocument(),
    );

    // The formatter did build real list structure from the markers...
    expect(container.querySelector('li')).not.toBeNull();
    // ...and built nothing at all from the HTML in the text.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();

    // `**<script>...</script>**` becomes emphasis around literal characters.
    const strong = screen.getByText('<script>alert(6)</script>');
    expect(strong.tagName).toBe('STRONG');
    expect(strong.innerHTML).toBe('&lt;script&gt;alert(6)&lt;/script&gt;');
  });

  it('cannot build an anchor from answer text', async () => {
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

    /*
     * The provenance invariant: links come from stored source records only.
     * Every anchor on screen must sit inside the source block, so nothing in the
     * answer body can send a student anywhere.
     */
    const sources = screen.getByRole('region', { name: 'Sources' });
    for (const anchor of container.querySelectorAll('a')) {
      expect(sources.contains(anchor)).toBe(true);
    }
  });
  /*
   * The literal string named by the Day 4 grounding/security gate (G6), driven
   * through all three untrusted channels: user input, answer content and a
   * stored source title.
   */
  it("renders <script>alert('x')</script> as text in every untrusted channel", async () => {
    setMockScenarioId('hostile');
    const user = userEvent.setup();
    const { container } = render(<App />);
    const gateString = "<script>alert('x')</script>";

    await user.type(
      screen.getByLabelText('Ask AskANU a question'),
      gateString,
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument(),
    );

    // 1. the user's own message, 2. the answer body, 3. the source title.
    expect(screen.getAllByText(gateString).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(
        "<img src=x onerror=alert(3)><script>alert('x')</script>Title that must render as text",
      ),
    ).toBeInTheDocument();

    // Nothing anywhere became a script, and no executable node was created.
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).toContain('&lt;script&gt;');
  });
});
