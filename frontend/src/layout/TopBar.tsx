import type { RefObject } from 'react';
import type { ResolvedTheme } from '../theme/useTheme';
import { MenuIcon } from '../ui/Icon';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import styles from './TopBar.module.css';

interface TopBarProps {
  drawerOpen: boolean;
  drawerToggleRef: RefObject<HTMLButtonElement | null>;
  onToggleDrawer: () => void;
  theme: ResolvedTheme;
  onToggleTheme: () => void;
}

/**
 * Mobile app bar. On desktop the brand and Clear Chat live inside the chat
 * panel instead, so this renders on mobile only and carries the menu toggle.
 */
export function TopBar({
  drawerOpen,
  drawerToggleRef,
  onToggleDrawer,
  theme,
  onToggleTheme,
}: TopBarProps) {
  return (
    <header className={styles.root}>
      <Brand showTagline={false} />
      <div className={styles.actions}>
        <ThemeToggle onToggle={onToggleTheme} resolved={theme} />
        <button
          aria-controls="resource-drawer"
          aria-expanded={drawerOpen}
          aria-label="Open menu"
          className={styles.menuToggle}
          onClick={onToggleDrawer}
          ref={drawerToggleRef}
          type="button"
        >
          <MenuIcon size={22} />
        </button>
      </div>
    </header>
  );
}
