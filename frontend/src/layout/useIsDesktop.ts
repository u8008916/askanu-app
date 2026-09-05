import { useEffect, useState } from 'react';

/**
 * Mirrors the `900px` breakpoint token in `styles/tokens.css`.
 *
 * The confirmed V3 UI puts different controls in different places on desktop
 * and mobile — Clear Chat sits in the header on desktop and at the top of the
 * drawer on mobile, and the resource cards move between the rail and the
 * mobile scroll. Branching in JS rather than hiding duplicates with CSS keeps
 * exactly one copy of each control in the document.
 */
const DESKTOP_QUERY = '(min-width: 900px)';

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);

    function sync() {
      setIsDesktop(query.matches);
    }
    sync();

    // `change` alone can be missed (for example under devtools viewport
    // emulation), so `resize` backs it up. Both re-read the same query.
    query.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      query.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  return isDesktop;
}
