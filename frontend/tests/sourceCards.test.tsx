import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceCards } from '../src/chat/SourceCards';
import { hostileStringsResponse, okMultiSourceResponse } from '../src/mocks/askResponses';
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
      screen.getByText(/<img src=x onerror=alert\(3\)>Title that must render/),
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

  it('does not reorder evidence', () => {
    const reversed: Source[] = [...okMultiSourceResponse.sources].reverse();
    render(<SourceCards sources={reversed} />);

    const titles = screen.getAllByRole('link').map((link) => link.textContent);
    expect(titles[0]).toContain(reversed[0].title);
    expect(titles[2]).toContain(reversed[2].title);
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
