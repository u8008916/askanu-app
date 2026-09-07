import { useState } from 'react';
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
}

const DISCLAIMER =
  'AskANU can make mistakes. Please double-check important information.';

function renderTurn(turn: ChatTurn) {
  switch (turn.kind) {
    case 'user':
      return <UserTurn content={turn.content} key={turn.id} />;
    case 'pending':
      return <PendingTurn key={turn.id} />;
    case 'assistant':
      return <AssistantTurn key={turn.id} response={turn.response} />;
  }
}

export function ChatPanel({
  turns,
  isDesktop,
  isSending,
  onSend,
  onClearChat,
  theme,
  onToggleTheme,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const isEmpty = turns.length === 0;

  function handleSend(text: string) {
    onSend(text);
    setDraft('');
  }

  /*
   * Confirmed mobile home: greeting and input at the top, then `Try asking`,
   * then the resource cards in the same scroll. The desktop panel keeps the
   * input anchored at the bottom of the chat column.
   */
  if (isEmpty && !isDesktop) {
    return (
      <div className={styles.mobileHome}>
        <section className={styles.mobileIntro}>
          <h2 className={styles.greeting}>How can I help you today?</h2>
          <Composer
            disabled={isSending}
            onChange={setDraft}
            onSubmit={handleSend}
            showSearchIcon
            value={draft}
          />
          <EmptyState onSelectSuggestion={handleSend} />
        </section>
        <ResourceCards quickLinksLayout="row" />
        <p className={styles.disclaimer}>{DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <section className={styles.panel}>
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
          <EmptyState onSelectSuggestion={handleSend} />
        ) : (
          <ul aria-label="Conversation" className={styles.turns}>
            {turns.map(renderTurn)}
          </ul>
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
          onChange={setDraft}
          onSubmit={handleSend}
          value={draft}
        />
        <p className={styles.disclaimer}>{DISCLAIMER}</p>
      </div>
    </section>
  );
}
