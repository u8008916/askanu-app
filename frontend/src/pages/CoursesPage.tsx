import { DomainLauncher } from '../domains/DomainLauncher';
import { COURSES_DOMAIN } from '../domains/domainConfig';

interface CoursesPageProps {
  /** Returns to the single AskANU chat with the question ready to edit. */
  onAskInChat: (prompt: string) => void;
}

export function CoursesPage({ onAskInChat }: CoursesPageProps) {
  return <DomainLauncher config={COURSES_DOMAIN} onSelectQuestion={onAskInChat} />;
}
