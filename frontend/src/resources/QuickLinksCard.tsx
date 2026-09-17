import type { ComponentType, ReactNode } from 'react';
import {
  CoursesIcon,
  EventsIcon,
  ExternalLinkIcon,
  JobsIcon,
  LinkIcon,
  ScholarshipsIcon,
} from '../ui/Icon';
import { isSafeHttpUrl } from '../util/safeUrl';
import styles from './Panel.module.css';

/**
 * The four Quick Links locked in V3_LOCKED_DECISIONS.md, now with their
 * approved canonical URLs. Each was opened and confirmed live (ANU/Microsoft
 * SSO sign-in, as expected for an authenticated student service) before being
 * written here — same standard every other official link in this app holds
 * to. Still guarded by `isSafeHttpUrl` like every other outbound link: a
 * constant today, but nothing here should ever render an unchecked `href`.
 */
const QUICK_LINKS: {
  label: string;
  href: string;
  Icon: ComponentType<{ size?: number }>;
}[] = [
  {
    label: 'AnuHub',
    href: 'https://selfservice.sas.anu.edu.au/',
    Icon: ScholarshipsIcon,
  },
  {
    label: 'MyTimetable',
    href: 'https://mytimetable.anu.edu.au/even/',
    Icon: EventsIcon,
  },
  { label: 'Canvas', href: 'https://canvas.anu.edu.au/', Icon: CoursesIcon },
  {
    label: 'ANU Careers',
    href: 'https://careercentral.anu.edu.au/student/',
    Icon: JobsIcon,
  },
];

interface QuickLinksCardProps {
  /** Mobile home lays the four links out as one row of icon tiles. */
  layout?: 'grid' | 'row';
}

/**
 * Same two guarantees every other outbound link in this app carries: a URL
 * only becomes an `<a>` once `isSafeHttpUrl` accepts it, and a failing one
 * renders as inert text rather than being repaired or guessed.
 */
function QuickLinkTile({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (!isSafeHttpUrl(href)) {
    return (
      <span
        aria-disabled="true"
        className={`${className} ${styles.tileDisabled}`}
      >
        {children}
      </span>
    );
  }
  return (
    <a className={className} href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
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
          {QUICK_LINKS.map(({ label, href, Icon }) => (
            <li key={label}>
              <QuickLinkTile className={styles.linkRowTile} href={href}>
                <Icon size={20} />
                <span className={styles.linkRowTileText}>{label}</span>
              </QuickLinkTile>
            </li>
          ))}
        </ul>
      ) : (
        <ul className={styles.linkGrid}>
          {QUICK_LINKS.map(({ label, href, Icon }) => (
            <li key={label}>
              <QuickLinkTile className={styles.linkTile} href={href}>
                <span className={styles.linkTileLabel}>
                  <Icon size={18} />
                  <span className={styles.linkTileText}>{label}</span>
                </span>
                <ExternalLinkIcon
                  className={styles.linkTileExternal}
                  size={15}
                />
              </QuickLinkTile>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>
        These links open in a new tab and require your ANU sign-in.
      </p>
    </section>
  );
}
