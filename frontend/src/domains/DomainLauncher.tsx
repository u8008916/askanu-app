import { ExternalLink } from '../ui/ExternalLink';
import { LinkIcon } from '../ui/Icon';
import type { DomainLauncherConfig } from './domainConfig';
import { RecommendedQuestionCard } from './RecommendedQuestionCard';
import styles from './DomainLauncher.module.css';

interface DomainLauncherProps {
  config: DomainLauncherConfig;
  /** Places the prompt in the single chat composer, focused and unsent. */
  onSelectQuestion: (prompt: string) => void;
}

/**
 * V5 guided-domain launcher: recommended questions on top, compact official
 * resources at the bottom. There is no chat input here — every card routes
 * into the one AskANU chat with an editable draft.
 */
export function DomainLauncher({ config, onSelectQuestion }: DomainLauncherProps) {
  const { id, title, intro, Icon, questions, resourcesTitle, resources, resourcesNote } =
    config;
  const questionsId = `${id}-questions`;
  const resourcesId = `${id}-resources`;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Icon className={styles.titleIcon} size={26} />
          {title}
        </h1>
        <p className={styles.intro}>{intro}</p>
      </header>

      <section aria-labelledby={questionsId} className={styles.questions}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id={questionsId}>
            Recommended questions
          </h2>
          <p className={styles.sectionCaption}>
            Click a question to open AskANU with a pre-filled prompt. You can
            edit it before sending.
          </p>
        </div>
        <ul className={styles.cardGrid}>
          {questions.map((question) => (
            <li key={question.id}>
              <RecommendedQuestionCard onSelect={onSelectQuestion} question={question} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={resourcesId} className={styles.resources}>
        <h2 className={styles.resourcesTitle} id={resourcesId}>
          <LinkIcon className={styles.resourcesTitleIcon} size={16} />
          {resourcesTitle}
        </h2>
        <ul className={styles.resourceList}>
          {resources.map(({ label, href }) => (
            <li key={href}>
              <ExternalLink href={href} variant="compact">
                {label}
              </ExternalLink>
            </li>
          ))}
        </ul>
        {resourcesNote !== undefined && (
          <p className={styles.resourcesNote}>{resourcesNote}</p>
        )}
      </section>
    </div>
  );
}
