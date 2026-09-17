import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QuickLinksCard } from '../src/resources/QuickLinksCard';

/**
 * The four V3_LOCKED_DECISIONS.md Quick Links, now carrying their approved
 * canonical URLs. Both layouts (`grid` — desktop rail/drawer; `row` — mobile
 * home) render the same four destinations, so both are checked here rather
 * than assuming one proves the other.
 */

const EXPECTED_LINKS: Record<string, string> = {
  AnuHub: 'https://selfservice.sas.anu.edu.au/',
  MyTimetable: 'https://mytimetable.anu.edu.au/even/',
  Canvas: 'https://canvas.anu.edu.au/',
  'ANU Careers': 'https://careercentral.anu.edu.au/student/',
};

describe.each([
  ['grid' as const, undefined],
  ['row' as const, 'row' as const],
])('QuickLinksCard (%s layout)', (_label, layout) => {
  function panel() {
    return screen.getByRole('region', { name: 'Quick Links' });
  }

  it('links every Quick Link to its approved ANU URL, safely', () => {
    render(<QuickLinksCard layout={layout} />);

    const links = within(panel()).getAllByRole('link');
    expect(links).toHaveLength(Object.keys(EXPECTED_LINKS).length);

    for (const link of links) {
      const label = Object.keys(EXPECTED_LINKS).find((name) =>
        link.textContent?.includes(name),
      );
      expect(label).toBeDefined();
      expect(link).toHaveAttribute('href', EXPECTED_LINKS[label!]);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      // Every stored/constant destination is `.anu.edu.au`, per V3's ANU-only scope.
      expect(new URL(link.getAttribute('href')!).hostname).toMatch(
        /\.anu\.edu\.au$/,
      );
    }
  });

  it('no longer announces the links as disabled or pending', () => {
    render(<QuickLinksCard layout={layout} />);

    expect(
      within(panel()).queryByText('Official links pending approved URLs.'),
    ).not.toBeInTheDocument();
    for (const link of within(panel()).getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-disabled');
    }
  });
});
