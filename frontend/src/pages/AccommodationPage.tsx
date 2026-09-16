import { DomainLauncher } from '../domains/DomainLauncher';
import { ACCOMMODATION_DOMAIN } from '../domains/domainConfig';

interface AccommodationPageProps {
  /** Returns to the single AskANU chat with the question ready to edit. */
  onAskInChat: (prompt: string) => void;
}

export function AccommodationPage({ onAskInChat }: AccommodationPageProps) {
  return (
    <DomainLauncher config={ACCOMMODATION_DOMAIN} onSelectQuestion={onAskInChat} />
  );
}
