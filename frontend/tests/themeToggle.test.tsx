import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../index.html?raw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { THEME_STORAGE_KEY } from '../src/theme/useTheme';

describe('theme toggle', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  it.each([false, true])('defaults to light with dark OS preference %s', (darkOS) => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...original(query),
      matches: query === '(prefers-color-scheme: dark)' ? darkOS : original(query).matches,
    }));
    render(<App />);
    // The explicit light default overrides even a dark OS preference.
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(
      screen.getByRole('button', { name: 'Switch to dark mode' }),
    ).toBeInTheDocument();
  });

  it('switches to dark, then back to light, and persists the choice', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('exposes exactly one theme control', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /Switch to .* mode/ })).toHaveLength(
      1,
    );
  });

  it.each(['light', 'dark'] as const)('restores a saved %s preference', (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    render(<App />);
    expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme);
    expect(screen.getByRole('button', {
      name: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
    })).toBeInTheDocument();
  });

  it('defaults to light and permits toggling when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it.each([null, 'system', 'invalid', 'light', 'dark'])('applies %s storage before React mounts', (stored) => {

    expect(html).toContain('<html lang="en-AU" data-theme="light">');
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeDefined();
    document.documentElement.setAttribute('data-theme', 'light');
    if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored);
    new Function('document', 'localStorage', script!)(document, localStorage);
    expect(document.documentElement.getAttribute('data-theme')).toBe(stored === 'dark' ? 'dark' : 'light');
  });

  it('retains light before React mounts when storage is blocked', () => {

    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeDefined();
    document.documentElement.setAttribute('data-theme', 'light');
    new Function('document', 'localStorage', script!)(document, {
      getItem: () => { throw new Error('blocked'); },
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
