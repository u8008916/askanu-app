import { useCallback, useRef, useState } from 'react';
import { ChatPanel } from './chat/ChatPanel';
import { useChatSession } from './chat/useChatSession';
import { MobileDrawer } from './layout/MobileDrawer';
import { ResourceRail } from './layout/ResourceRail';
import { TopBar } from './layout/TopBar';
import { useIsDesktop } from './layout/useIsDesktop';
import { useTheme } from './theme/useTheme';
import styles from './App.module.css';

export function App() {
  const { turns, sendMessage, clearChat } = useChatSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerToggleRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();
  const { resolved: theme, toggleTheme } = useTheme();

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Return focus to the control that opened the drawer.
    drawerToggleRef.current?.focus();
  }, []);

  return (
    <div className={styles.root}>
      {!isDesktop && (
        <TopBar
          drawerOpen={drawerOpen}
          drawerToggleRef={drawerToggleRef}
          onToggleDrawer={() => setDrawerOpen((open) => !open)}
          onToggleTheme={toggleTheme}
          theme={theme}
        />
      )}
      <main className={styles.main}>
        {/* Chat is primary and comes first in the document order. */}
        <div className={styles.chat}>
          <ChatPanel
            isDesktop={isDesktop}
            onClearChat={clearChat}
            onSend={sendMessage}
            onToggleTheme={toggleTheme}
            theme={theme}
            turns={turns}
          />
        </div>
        {isDesktop && (
          <aside className={styles.rail}>
            <ResourceRail />
          </aside>
        )}
      </main>
      {!isDesktop && (
        <MobileDrawer
          onClearChat={clearChat}
          onClose={closeDrawer}
          open={drawerOpen}
        />
      )}
    </div>
  );
}
