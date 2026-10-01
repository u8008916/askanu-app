import { screen, waitFor, within } from '@testing-library/react';

/**
 * The chat/launcher column: everything in <main> except the resource rail.
 *
 * The rail's Current Jobs / Upcoming Events panels legitimately show
 * server-sent roles, dates and links, so a "nothing invented on this page"
 * assertion has to be scoped to the column the page owns.
 */
export function chatColumn(): HTMLElement {
  return screen.getByRole('main').firstElementChild as HTMLElement;
}

/** Waits until both list panels have left their loading state. */
export async function feedsSettled(): Promise<void> {
  await waitFor(() => {
    for (const name of ['Current Jobs', 'Upcoming Events']) {
      const panel = screen.queryByRole('region', { name });
      if (panel !== null) {
        expect(within(panel).queryByText('Loading…')).not.toBeInTheDocument();
      }
    }
  });
}

/** True when the anchor lives in a place allowed to carry a link. */
export function isSanctionedAnchor(anchor: Element): boolean {
  const homes = [
    screen.queryByRole('navigation', { name: 'Explore' }),
    screen.queryByRole('region', { name: 'Sources' }),
    screen.queryByRole('region', { name: 'Current Jobs' }),
    screen.queryByRole('region', { name: 'Upcoming Events' }),
    // Quick Links are static, verified constants (QuickLinksCard.tsx), never
    // model or record output — the same kind of trusted navigation as Explore.
    screen.queryByRole('region', { name: 'Quick Links' }),
  ];
  return homes.some((home) => home !== null && home.contains(anchor));
}

/**
 * The collapsed backend-text disclosure under a result list ("Show as text").
 * Result cards ("More details") and the Sources row are also `<details>`, so a
 * bare `querySelector('details')` no longer identifies it.
 */
export function showAsTextDetails(root: ParentNode): HTMLDetailsElement | null {
  return (
    Array.from(root.querySelectorAll('details')).find(
      (details) => details.querySelector(':scope > summary')?.textContent === 'Show as text',
    ) ?? null
  );
}

/** The visible number on one result card — the backend ordinal, or its position. */
export function resultCardNumber(card: HTMLElement): string {
  return card.querySelector('[data-ordinal]')?.textContent?.replace(/\.$/, '') ?? '';
}

/**
 * Every `<img>` in `root` that is not one of the trusted brand files bundled
 * from `src/assets/brand/`. The safe-rendering tests use this to prove that
 * hostile text never becomes an image element, while the App's own crest and
 * logo images (which are static build assets, never model or record output)
 * remain allowed.
 */
export function untrustedImages(root: ParentNode): HTMLImageElement[] {
  return Array.from(root.querySelectorAll('img')).filter(
    (img) => !(img.getAttribute('src') ?? '').includes('/assets/brand/'),
  );
}
