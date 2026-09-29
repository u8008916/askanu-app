import { useCallback, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ChatPanel } from './chat/ChatPanel';
import type { PendingStructuredPrefill } from './chat/structuredPrefill';
import { resolveStructuredPayload } from './chat/structuredPrefill';
import { useChatSession } from './chat/useChatSession';
import type {
  ClarificationSelectionRequest,
  ResultPageRequest,
  SelectedResultRequest,
} from './types/api';
import { MobileDrawer } from './layout/MobileDrawer';
import { ResourceRail } from './layout/ResourceRail';
import { TopBar } from './layout/TopBar';
import { useIsDesktop } from './layout/useIsDesktop';
import { AccommodationPage } from './pages/AccommodationPage';
import { CoursesPage } from './pages/CoursesPage';
import { EventsPage } from './pages/EventsPage';
import { JobsPage } from './pages/JobsPage';
import { ScholarshipsPage } from './pages/ScholarshipsPage';
import { SupportPage } from './pages/SupportPage';
import { FeedsProvider } from './resources/FeedsProvider';
import { useTheme } from './theme/useTheme';
import { V7StateGallery } from './dev/v7/V7StateGallery';
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
  /*
   * `docs/V7_UI_CONTRACT.md` §5: a polite live-region announcement for Clear
   * Chat, since V7 clarification/session state makes the post-clear reset
   * more consequential than before. `clearAnnouncementCountRef` makes two
   * Clear Chat presses in a row both announce even though the text is
   * identical each time — a screen reader only speaks a live region on a
   * text change, so a trailing zero-width space (invisible either way,
   * since the region itself is visually hidden) alternates the string.
   */
  const [clearAnnouncement, setClearAnnouncement] = useState('');
  const clearAnnouncementCountRef = useRef(0);

  /*
   * V7 Day 4 (`askanu-rag` PR #38, not yet merged): a card's "Ask about this"
   * or the clarification "Use selection" still only prefills the composer —
   * the "prefill, editable, unsent" rule is unchanged. This pairs that
   * prefill with the exact structured payload RAG needs, but only attaches
   * it to the outgoing request if the student sends the prefill text
   * unchanged (`handleSend` below); an edit drops the structured payload and
   * falls back to today's plain free-text send. Not React state: setting it
   * must never itself trigger a render.
   */
  const pendingStructuredPrefillRef = useRef<PendingStructuredPrefill | null>(null);

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
      const structured = resolveStructuredPayload(
        pendingStructuredPrefillRef.current,
        text,
      );
      pendingStructuredPrefillRef.current = null;
      sendMessage(text, structured);
      setDraft('');
    },
    [sendMessage],
  );

  /*
   * Clear Chat's App-owned half, alongside `useChatSession.clearChat`'s
   * turns/clarification/session-state reset: the composer draft (V7 addition
   * — a stale draft is not conversation state, but it is text a stale
   * follow-up could still send) and the live-region announcement.
   */
  const handleClearChat = useCallback(() => {
    clearChat();
    setDraft('');
    pendingStructuredPrefillRef.current = null;
    clearAnnouncementCountRef.current += 1;
    setClearAnnouncement(
      'Conversation cleared' + '\u200B'.repeat(clearAnnouncementCountRef.current % 2),
    );
  }, [clearChat]);

  /*
   * A clarification option is another way to fill the composer, not a second
   * send path: it never bypasses the "prefill, focus, never auto-send" rule
   * domain-launcher cards already use. `selection` (V7 Day 4) is stashed
   * alongside the prefill and only reaches the wire in `handleSend` if the
   * composer is sent with this exact text, unedited.
   */
  const handleSelectClarification = useCallback(
    (text: string, selection: ClarificationSelectionRequest) => {
      pendingStructuredPrefillRef.current = {
        prefillText: text,
        clarificationSelection: selection,
      };
      setDraft(text);
      setFocusComposerSignal((signal) => signal + 1);
    },
    [],
  );

  /*
   * A card's "Ask about this" (V7 Day 4): same prefill-only rule as above.
   * `selectedResult` travels structurally and independently of the composer
   * text \u2014 see `AssistantTurn.tsx`'s `handleCardSelect` doc comment.
   */
  const handleSelectResult = useCallback(
    (payload: { prefillText: string; selectedResult: SelectedResultRequest }) => {
      pendingStructuredPrefillRef.current = {
        prefillText: payload.prefillText,
        selectedResult: payload.selectedResult,
      };
      setDraft(payload.prefillText);
      setFocusComposerSignal((signal) => signal + 1);
    },
    [],
  );

  /*
   * "Show more" on a server-paged result list (V7 Day 4): a direct action,
   * not a prefill \u2014 it sends immediately, bypassing the composer entirely,
   * the same way Clear Chat bypasses it. The next page renders as a new
   * assistant turn below the current one.
   */
  const handleShowMorePage = useCallback(
    (page: ResultPageRequest) => {
      sendMessage('Show more results', { resultPage: page });
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
                  onClearChat={handleClearChat}
                  onDraftChange={setDraft}
                  onRequestMorePage={handleShowMorePage}
                  onSelectClarification={handleSelectClarification}
                  onSelectResult={handleSelectResult}
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
            <Route element={<EventsPage onAskInChat={askInChat} />} path="/events" />
            {/*
              Dev-only V7 Day 1 acceptance gallery (docs/V7_UI_CONTRACT.md
              §3). Same gate `ChatPanel.tsx` uses for `FixturePicker`: Vite
              replaces both operands with literals, so a production build
              folds this to `false`, the route never registers, and
              `V7StateGallery` (and the fixtures it imports) are dropped from
              the bundle entirely — verified by grepping `dist/` in
              docs/evidence/V7_DAY_01_UX_CONTRACT_FREEZE.md.
            */}
            {import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_TRANSPORT === '1' && (
              <Route element={<V7StateGallery />} path="/dev/v7-states" />
            )}
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
          onClearChat={handleClearChat}
          onClose={closeDrawer}
          open={drawerOpen}
        />
      )}
      <div aria-live="polite" className="visually-hidden" role="status">
        {clearAnnouncement}
      </div>
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
