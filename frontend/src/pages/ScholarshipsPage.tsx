import { DomainLauncher } from '../domains/DomainLauncher';
import { SCHOLARSHIPS_DOMAIN } from '../domains/domainConfig';

interface ScholarshipsPageProps {
  /** Returns to the single AskANU chat with the question ready to edit. */
  onAskInChat: (prompt: string) => void;
}

export function ScholarshipsPage({ onAskInChat }: ScholarshipsPageProps) {
  return <DomainLauncher config={SCHOLARSHIPS_DOMAIN} onSelectQuestion={onAskInChat} />;
}
