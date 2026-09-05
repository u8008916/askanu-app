import type { ComponentType } from 'react';
import { ChevronRightIcon } from '../ui/Icon';
import styles from './Panel.module.css';

interface FeedPanelProps {
  title: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  /** V3 shows 5 items in both default panels. */
  slotCount: number;
  note: string;
}

/**
 * Shared shape for the Upcoming Events and Current Jobs panels: title, a
 * `View all` route to the resource page, and the item feed.
 *
 * No endpoint exists yet, so the feed renders clearly-labelled empty slots.
 * These panels must never display invented ANU events or roles.
 */
export function FeedPanel({ title, Icon, slotCount, note }: FeedPanelProps) {
  return (
    <section aria-label={title} className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>
          <Icon className={styles.panelTitleIcon} size={16} />
          {title}
        </h3>
        <button
          aria-disabled="true"
          className={styles.viewAll}
          onClick={(event) => event.preventDefault()}
          type="button"
        >
          View all
        </button>
      </div>
      <ul className={styles.feed}>
        {Array.from({ length: slotCount }, (_, index) => (
          <li className={styles.feedItem} key={index}>
            <span className={styles.bullet} />
            <span className={styles.feedBody}>
              <span className={styles.slotTitle}>Placeholder slot {index + 1}</span>
              <span className={styles.slotMeta}>Awaiting data</span>
            </span>
            <ChevronRightIcon className={styles.chevron} size={16} />
          </li>
        ))}
      </ul>
      <p className={styles.note}>{note}</p>
    </section>
  );
}
