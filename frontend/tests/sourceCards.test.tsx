import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceCards } from '../src/chat/SourceCards';
import {
  hostileStringsResponse,
  okCurrentJobsResponse,
  okManySourcesResponse,
  okMissingFieldSourceResponse,
  okMultiSourceResponse,
} from '../src/mocks/askResponses';
import { isSafeHttpUrl } from '../src/util/safeUrl';
import type { Source } from '../src/types/api';

describe('source cards', () => {
  it('renders one external link per source, in the order sent', () => {
    render(<SourceCards sources={okMultiSourceResponse.sources} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    links.forEach((link, index) => {
      expect(link).toHaveAttribute(
        'href',
        okMultiSourceResponse.sources[index].url,
      );
      expect(link).toHaveTextContent(
        okMultiSourceResponse.sources[index].title,
      );
    });
  });

  it('opens sources in a new tab without handing over the opener', () => {
    render(<SourceCards sources={okMultiSourceResponse.sources} />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('renders nothing when the envelope carries no sources', () => {
    const { container } = render(<SourceCards sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a hostile source title as text, creating no element', () => {
    const { container } = render(
      <SourceCards sources={hostileStringsResponse.sources} />,
    );

    expect(
      screen.getByText(/^<img src=x onerror=alert\(3\)><script>alert\('x'\)<\/script>Title that must render/),
    ).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('refuses to link a stored URL that is not http or https', () => {
    render(<SourceCards sources={hostileStringsResponse.sources} />);

    // Only the https record becomes a link; the `javascript:` one does not.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    }
    // It is still shown, just not as something clickable.
    expect(
      screen.getByText('Record whose stored URL is not a web address'),
    ).toBeInTheDocument();
  });

  it('renders a five-role jobs list in full, long title and long URL included', () => {
    render(<SourceCards sources={okCurrentJobsResponse.sources} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    links.forEach((link, index) => {
      const source = okCurrentJobsResponse.sources[index];
      // Title text is complete, never clipped to fit the card.
      expect(link).toHaveTextContent(source.title);
      expect(link).toHaveAttribute('href', source.url);
      expect(link).toHaveTextContent('jobs');
    });
  });

  it('does not reorder evidence', () => {
    const reversed: Source[] = [...okMultiSourceResponse.sources].reverse();
    render(<SourceCards sources={reversed} />);

    const titles = screen.getAllByRole('link').map((link) => link.textContent);
    expect(titles[0]).toContain(reversed[0].title);
    expect(titles[2]).toContain(reversed[2].title);
  });

  /*
   * Day 11 V6 breadth audit: every earlier fixture used one to five sources.
   * The data layer is expanding toward 99% coverage, so a grounded answer can
   * plausibly cite well over five records. Nothing in `SourceCards` caps or
   * paginates the list, and this proves it holds at a larger, more realistic
   * count instead of only at demo scale.
   */
  it('renders a broad source list in full, with no cap and no reordering', () => {
    render(<SourceCards sources={okManySourcesResponse.sources} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(okManySourcesResponse.sources.length);
    expect(links.length).toBeGreaterThan(5);
    links.forEach((link, index) => {
      const source = okManySourcesResponse.sources[index];
      expect(link).toHaveAttribute('href', source.url);
      expect(link).toHaveTextContent(source.title);
    });
  });

  /*
   * Day 11 V6 breadth audit: `Source` fields are typed as non-nullable
   * strings, but a broadly-scraped record can still arrive with an empty
   * title before the data layer backfills it. The card must still render —
   * a real, clickable record — rather than crash or show invented text.
   */
  it('renders a source with an empty title without crashing or inventing text', () => {
    const [source] = okMissingFieldSourceResponse.sources;
    render(<SourceCards sources={okMissingFieldSourceResponse.sources} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', source.url);
    expect(link).toHaveTextContent(source.domain);
    expect(link.textContent).not.toMatch(/undefined|null/i);
  });
});

describe('isSafeHttpUrl', () => {
  it.each([
    ['https://example.invalid/page', true],
    ['http://example.invalid/page', true],
    ['javascript:alert(1)', false],
    ['data:text/html,<script>alert(1)</script>', false],
    ['/relative/path', false],
    ['', false],
  ])('%s -> %s', (value, expected) => {
    expect(isSafeHttpUrl(value)).toBe(expected);
  });
});
