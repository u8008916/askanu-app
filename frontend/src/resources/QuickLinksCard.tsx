import type { ComponentType } from 'react';
import {
  CoursesIcon,
  EventsIcon,
  ExternalLinkIcon,
  JobsIcon,
  LinkIcon,
  ScholarshipsIcon,
} from '../ui/Icon';
import styles from './Panel.module.css';

/**
 * The four Quick Links locked in V3_LOCKED_DECISIONS.md.
 *
 * V3 does not supply canonical URLs, so these are non-navigating placeholders
 * rather than guessed ANU addresses. The external-link glyph shows the
 * affordance the real links will carry.
 */
const QUICK_LINKS: { label: string; Icon: ComponentType<{ size?: number }> }[] =
  [
    { label: 'AnuHub', Icon: ScholarshipsIcon },
    { label: 'MyTimetable', Icon: EventsIcon },
    { label: 'Canvas', Icon: CoursesIcon },
    { label: 'ANU Careers', Icon: JobsIcon },
  ];

interface QuickLinksCardProps {
  /** Mobile home lays the four links out as one row of icon tiles. */
  layout?: 'grid' | 'row';
}

export function QuickLinksCard({ layout = 'grid' }: QuickLinksCardProps) {
  return (
    <section aria-label="Quick Links" className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>
          <LinkIcon className={styles.panelTitleIcon} size={16} />
          Quick Links
        </h3>
      </div>
      {layout === 'row' ? (
        <ul className={styles.linkRow}>
          {QUICK_LINKS.map(({ label, Icon }) => (
            <li key={label}>
              <span aria-disabled="true" className={styles.linkRowTile}>
                <Icon size={20} />
                {label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className={styles.linkGrid}>
          {QUICK_LINKS.map(({ label, Icon }) => (
            <li key={label}>
              <span aria-disabled="true" className={styles.linkTile}>
                <span className={styles.linkTileLabel}>
                  <Icon size={18} />
                  {label}
                </span>
                <ExternalLinkIcon
                  className={styles.linkTileExternal}
                  size={15}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>Official links pending approved URLs.</p>
    </section>
  );
}
