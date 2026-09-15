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
  ];
  return homes.some((home) => home !== null && home.contains(anchor));
}
