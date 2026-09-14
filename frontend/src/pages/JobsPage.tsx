import { DomainLauncher } from '../domains/DomainLauncher';
import { JOBS_DOMAIN } from '../domains/domainConfig';

interface JobsPageProps {
  /** Returns to the single AskANU chat with the question ready to edit. */
  onAskInChat: (prompt: string) => void;
}

export function JobsPage({ onAskInChat }: JobsPageProps) {
  return <DomainLauncher config={JOBS_DOMAIN} onSelectQuestion={onAskInChat} />;
}
