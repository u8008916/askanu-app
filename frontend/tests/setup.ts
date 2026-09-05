import '@testing-library/jest-dom/vitest';

/*
 * jsdom does not implement matchMedia. Report the desktop breakpoint as
 * matching so component tests exercise the desktop shell; mobile layout is
 * verified in a real browser at 360/390/430px.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
