import { FixturePicker } from '../dev/FixturePicker';
import { Brand } from '../layout/Brand';
import { ClearChatButton } from '../layout/ClearChatButton';
import { ThemeToggle } from '../layout/ThemeToggle';
import { ResourceCards } from '../resources/ResourceCards';
import type { ResolvedTheme } from '../theme/useTheme';
import type { ChatTurn } from './useChatSession';
import { AssistantTurn } from './AssistantTurn';
import { Composer } from './Composer';
import { EmptyState } from './EmptyState';
import { PendingTurn } from './PendingTurn';
import { UserTurn } from './UserTurn';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  turns: ChatTurn[];
  isDesktop: boolean;
  isSending: boolean;
  onSend: (text: string) => void;
  onClearChat: () => void;
  theme: ResolvedTheme;
  onToggleTheme: () => void;
  /* The draft is owned by App so it survives leaving the chat route. */
  draft: string;
  onDraftChange: (value: string) => void;
  /** Changes when something outside the chat asks the composer to focus. */
  focusComposerSignal: number;
  /** A clarification option was chosen: put its text in the composer. */
  onSelectClarification: (text: string) => void;
}

const DISCLAIMER =
  'AskANU can make mistakes. Please double-check important information.';

function renderTurn(
  turn: ChatTurn,
  onSelectClarification: (text: string) => void,
  activeClarificationTurnId: string | undefined,
) {
  switch (turn.kind) {
    case 'user':
      return <UserTurn content={turn.content} key={turn.id} />;
    case 'pending':
      return <PendingTurn key={turn.id} />;
    case 'assistant':
      return (
        <AssistantTurn
          isClarificationActive={turn.id === activeClarificationTurnId}
          key={turn.id}
          onSelectClarification={onSelectClarification}
          response={turn.response}
        />
      );
  }
}

/**
 * `useChatSession` only ever tracks one `pendingClarification`, mirrored from
 * the most recent assistant response — so exactly one turn's clarification,
 * the latest assistant turn's, can still be the one a reply would resolve.
 * An earlier turn's clarification is history: still shown, no longer live.
 */
function findActiveClarificationTurnId(turns: ChatTurn[]): string | undefined {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (turn.kind === 'assistant') {
      return turn.id;
    }
  }
  return undefined;
}

/**
 * The polite announcement for a newly arrived answer. `PendingTurn`'s own
 * live region unmounts when the answer replaces it, so without this a screen
 * reader user hears "finding an answer" and then silence. An `error` turn is
 * skipped: `StatusNotice` already announces it as an alert. The zero-width
 * space alternates with the number of turns so two consecutive answers are
 * each announced, the same technique App uses for "Conversation cleared".
 */
function answerAnnouncement(turns: ChatTurn[]): string {
  const last = turns[turns.length - 1];
  if (last === undefined || last.kind !== 'assistant' || last.response.status === 'error') {
    return '';
  }
  return 'AskANU replied' + String.fromCharCode(0x200b).repeat(turns.length % 2);
}

export function ChatPanel({
  turns,
  isDesktop,
  isSending,
  onSend,
  onClearChat,
  theme,
  onToggleTheme,
  draft,
  onDraftChange,
  focusComposerSignal,
  onSelectClarification,
}: ChatPanelProps) {
  const isEmpty = turns.length === 0;
  const activeClarificationTurnId = findActiveClarificationTurnId(turns);

  /*
   * Confirmed mobile home: greeting and input at the top, then `Try asking`,
   * then the resource cards in the same scroll. The desktop panel keeps the
   * input anchored at the bottom of the chat column.
   */
  if (isEmpty && !isDesktop) {
    return (
      <div className={styles.mobileHome}>
        <section className={styles.mobileIntro}>
          {/* The page heading on mobile: the app bar wordmark is chrome. */}
          <h1 className={styles.greeting}>How can I help you today?</h1>
          <Composer
            disabled={isSending}
            focusSignal={focusComposerSignal}
            onChange={onDraftChange}
            onSubmit={onSend}
            showSearchIcon
            value={draft}
          />
          <EmptyState onSelectSuggestion={onSend} />
        </section>
        <ResourceCards quickLinksLayout="row" />
        <p className={styles.disclaimer}>{DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <section className={styles.panel}>
      {/* Mobile has no panel header, so the route still needs one heading. */}
      {!isDesktop && <h1 className="visually-hidden">AskANU chat</h1>}
      {isDesktop && (
        <header className={styles.panelHeader}>
          <Brand />
          <div className={styles.headerActions}>
            <ThemeToggle onToggle={onToggleTheme} resolved={theme} />
            <ClearChatButton onClearChat={onClearChat} />
          </div>
        </header>
      )}
      <div className={styles.scroll}>
        {isEmpty ? (
          <EmptyState onSelectSuggestion={onSend} />
        ) : (
          <ul aria-label="Conversation" className={styles.turns}>
            {turns.map((turn) =>
              renderTurn(turn, onSelectClarification, activeClarificationTurnId),
            )}
          </ul>
        )}
        {/* Mounted with the first turn, so it exists before any answer text
            is written into it — a region inserted already filled is not
            reliably announced. */}
        {!isEmpty && (
          <div aria-live="polite" className="visually-hidden" role="status">
            {answerAnnouncement(turns)}
          </div>
        )}
      </div>
      <div className={styles.composerSlot}>
        {/* Only meaningful when the dev mock transport is selected. Vite
            replaces both operands with literals, so a production build drops
            the branch, the picker and the fixtures behind it. */}
        {import.meta.env.DEV &&
          import.meta.env.VITE_USE_MOCK_TRANSPORT === '1' && <FixturePicker />}
        <Composer
          disabled={isSending}
          focusSignal={focusComposerSignal}
          onChange={onDraftChange}
          onSubmit={onSend}
          value={draft}
        />
        <p className={styles.disclaimer}>{DISCLAIMER}</p>
      </div>
    </section>
  );
}
