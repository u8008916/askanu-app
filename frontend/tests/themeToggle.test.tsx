import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { THEME_STORAGE_KEY } from '../src/theme/useTheme';

describe('theme toggle', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('follows the system preference until the user chooses', () => {
    render(<App />);
    // The matchMedia stub reports light, so no override should be applied.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
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
});
