import { ChevronRightIcon } from '../ui/Icon';
import type { RecommendedQuestion } from './domainConfig';
import styles from './DomainLauncher.module.css';

interface RecommendedQuestionCardProps {
  question: RecommendedQuestion;
  onSelect: (prompt: string) => void;
}

/**
 * A guided intent. A real button so it works by mouse, keyboard and touch;
 * activating it hands `prompt` to the chat composer and never sends.
 */
export function RecommendedQuestionCard({
  question,
  onSelect,
}: RecommendedQuestionCardProps) {
  const { title, description, prompt, Icon } = question;
  return (
    <button
      className={styles.card}
      onClick={() => onSelect(prompt)}
      type="button"
    >
      <span className={styles.cardIcon}>
        <Icon size={22} />
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.cardDescription}>{description}</span>
      </span>
      <ChevronRightIcon className={styles.cardArrow} size={18} />
    </button>
  );
}
