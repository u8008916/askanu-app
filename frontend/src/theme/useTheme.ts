import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Also read by the inline no-flash script in index.html. Keep the two in sync. */
export const THEME_STORAGE_KEY = 'askanu-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    // Private mode or blocked site data: fall back to following the system.
    return 'system';
  }
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Light/dark preference.
 *
 * Defaults to following the operating system. Once the user picks a side the
 * choice is written to localStorage and applied as `data-theme` on <html>,
 * which the token blocks in `styles/tokens.css` key off. Storage is
 * per-browser and never leaves the device.
 */
export function useTheme() {
  const [preference, setPreference] =
    useState<ThemePreference>(readStoredPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme);

  // Follow the OS while the preference is `system`.
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const sync = () => setSystemTheme(query.matches ? 'dark' : 'light');
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const resolved: ResolvedTheme =
    preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }

    try {
      if (preference === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // Storage unavailable: the theme still applies for this page view.
    }
  }, [preference]);

  /** Flips whichever theme is currently on screen. */
  const toggleTheme = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved]);

  /** Hands control back to the operating system setting. */
  const useSystemTheme = useCallback(() => setPreference('system'), []);

  return { preference, resolved, toggleTheme, useSystemTheme };
}
