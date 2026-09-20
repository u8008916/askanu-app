import { DomainLauncher } from '../domains/DomainLauncher';
import { EVENTS_DOMAIN } from '../domains/domainConfig';

interface EventsPageProps {
  /** Returns to the single AskANU chat with the question ready to edit. */
  onAskInChat: (prompt: string) => void;
}

export function EventsPage({ onAskInChat }: EventsPageProps) {
  return <DomainLauncher config={EVENTS_DOMAIN} onSelectQuestion={onAskInChat} />;
}
