import type { ResolvedTheme } from '../theme/useTheme';
import { MoonIcon, SunIcon } from '../ui/Icon';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
  resolved: ResolvedTheme;
  onToggle: () => void;
}

/**
 * Switches between light and dark.
 *
 * The icon and label describe what the next press will do, not the current
 * state, so the control reads the same to sighted and screen-reader users.
 */
export function ThemeToggle({ resolved, onToggle }: ThemeToggleProps) {
  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <button
      aria-label={`Switch to ${next} mode`}
      aria-pressed={resolved === 'dark'}
      className={styles.root}
      onClick={onToggle}
      title={`Switch to ${next} mode`}
      type="button"
    >
      {resolved === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}
