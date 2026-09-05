import type { ComponentType } from 'react';
import {
  AccommodationIcon,
  ChevronRightIcon,
  EventsIcon,
  ScholarshipsIcon,
  StarIcon,
} from '../ui/Icon';
import styles from './EmptyState.module.css';

/**
 * V3: `Try asking` appears in the empty state only and disappears after the
 * first question. Suggestions are real buttons so they work by keyboard and
 * touch.
 */
const SUGGESTIONS: {
  text: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    text: 'What scholarships are available for international students?',
    Icon: ScholarshipsIcon,
  },
  { text: 'When are classes for COMP1110 next semester?', Icon: EventsIcon },
  { text: 'I need help with accommodation', Icon: AccommodationIcon },
  { text: 'What events are happening this week?', Icon: StarIcon },
];

interface EmptyStateProps {
  onSelectSuggestion: (suggestion: string) => void;
}

export function EmptyState({ onSelectSuggestion }: EmptyStateProps) {
  return (
    <section aria-label="Try asking" className={styles.root}>
      <h2 className={styles.heading}>Try asking</h2>
      <ul className={styles.suggestions}>
        {SUGGESTIONS.map(({ text, Icon }) => (
          <li key={text}>
            <button
              className={styles.suggestion}
              onClick={() => onSelectSuggestion(text)}
              type="button"
            >
              <span className={styles.suggestionIcon}>
                <Icon size={18} />
              </span>
              <span className={styles.suggestionText}>{text}</span>
              <ChevronRightIcon className={styles.suggestionChevron} size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
