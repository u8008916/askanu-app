import { useCallback, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ChatPanel } from './chat/ChatPanel';
import { useChatSession } from './chat/useChatSession';
import { MobileDrawer } from './layout/MobileDrawer';
import { ResourceRail } from './layout/ResourceRail';
import { TopBar } from './layout/TopBar';
import { useIsDesktop } from './layout/useIsDesktop';
import { AccommodationPage } from './pages/AccommodationPage';
import { CoursesPage } from './pages/CoursesPage';
import { JobsPage } from './pages/JobsPage';
import { ScholarshipsPage } from './pages/ScholarshipsPage';
import { SupportPage } from './pages/SupportPage';
import { FeedsProvider } from './resources/FeedsProvider';
import { useTheme } from './theme/useTheme';
import styles from './App.module.css';

function AppShell() {
  const { turns, isSending, sendMessage, clearChat } = useChatSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerToggleRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();
  const { resolved: theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  /*
   * The draft lives here rather than inside ChatPanel so it survives leaving
   * the chat route, and so a resource page can hand a question to the composer.
   */
  const [draft, setDraft] = useState('');
  // Bumped to ask the composer to take focus; the value itself is meaningless.
  const [focusComposerSignal, setFocusComposerSignal] = useState(0);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Return focus to the control that opened the drawer.
    drawerToggleRef.current?.focus();
  }, []);

  /*
   * Domain launcher pages route back into the single chat. The question is
   * placed in the composer and focused, never sent — navigating must not fire
   * a request on the student's behalf. The current conversation is kept.
   */
  const askInChat = useCallback(
    (question: string) => {
      setDraft(question);
      setFocusComposerSignal((signal) => signal + 1);
      navigate('/');
    },
    [navigate],
  );

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text);
      setDraft('');
    },
    [sendMessage],
  );

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
          <Routes>
            <Route
              element={
                <ChatPanel
                  draft={draft}
                  focusComposerSignal={focusComposerSignal}
                  isDesktop={isDesktop}
                  isSending={isSending}
                  onClearChat={clearChat}
                  onDraftChange={setDraft}
                  onSend={handleSend}
                  onToggleTheme={toggleTheme}
                  theme={theme}
                  turns={turns}
                />
              }
              path="/"
            />
            <Route
              element={<CoursesPage onAskInChat={askInChat} />}
              path="/courses"
            />
            <Route
              element={<ScholarshipsPage onAskInChat={askInChat} />}
              path="/scholarships"
            />
            <Route element={<JobsPage onAskInChat={askInChat} />} path="/jobs" />
            <Route
              element={<AccommodationPage onAskInChat={askInChat} />}
              path="/accommodation"
            />
            <Route element={<SupportPage onAskInChat={askInChat} />} path="/support" />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
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

/**
 * The router lives inside App so the whole application, including tests, has
 * one history. Routing swaps the main content column only: the shell, the
 * desktop resource rail and the mobile drawer are constant, which is what keeps
 * the confirmed V3 layout and the current-session chat state intact across
 * navigation.
 *
 * `FeedsProvider` sits at the same level for the same reason: the two list
 * panels are fetched once per page load and shared by every place
 * `ResourceCards` is mounted.
 */
export function App() {
  return (
    <BrowserRouter>
      <FeedsProvider>
        <AppShell />
      </FeedsProvider>
    </BrowserRouter>
  );
}
