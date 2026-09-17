import { DomainLauncher } from '../domains/DomainLauncher';
import { SUPPORT_DOMAIN } from '../domains/domainConfig';

interface SupportPageProps {
  /** Returns to the single AskANU chat with the question ready to edit. */
  onAskInChat: (prompt: string) => void;
}

export function SupportPage({ onAskInChat }: SupportPageProps) {
  return <DomainLauncher config={SUPPORT_DOMAIN} onSelectQuestion={onAskInChat} />;
}
