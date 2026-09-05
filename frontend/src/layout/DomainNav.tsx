import type { ComponentType } from 'react';
import {
  AccommodationIcon,
  CoursesIcon,
  EventsIcon,
  HomeIcon,
  JobsIcon,
  ScholarshipsIcon,
  SupportIcon,
} from '../ui/Icon';
import styles from './DomainNav.module.css';

/**
 * The `Explore` panel from the confirmed V3 UI: Home plus the six domains, in
 * the order shown in the approved desktop and mobile designs.
 *
 * Day 1 establishes the information architecture only. Entries other than the
 * current one are announced as disabled and carry no routing; resource pages
 * are later scheduled work.
 */
const NAV_ITEMS: { label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { label: 'Home', Icon: HomeIcon },
  { label: 'Courses', Icon: CoursesIcon },
  { label: 'Scholarships', Icon: ScholarshipsIcon },
  { label: 'Accommodation', Icon: AccommodationIcon },
  { label: 'Jobs', Icon: JobsIcon },
  { label: 'Events', Icon: EventsIcon },
  { label: 'Support Services', Icon: SupportIcon },
];

const CURRENT_ITEM = 'Home';

interface DomainNavProps {
  /** The drawer shows the nav without its own panel chrome. */
  bare?: boolean;
}

export function DomainNav({ bare = false }: DomainNavProps) {
  return (
    <nav
      aria-label="Explore"
      className={`${styles.root} ${bare ? styles.bare : ''}`}
    >
      <h2 className={styles.heading}>Explore</h2>
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ label, Icon }) => {
          const isCurrent = label === CURRENT_ITEM;
          return (
            <li key={label}>
              <button
                aria-current={isCurrent ? 'page' : undefined}
                aria-disabled={isCurrent ? undefined : 'true'}
                className={`${styles.item} ${isCurrent ? styles.itemCurrent : ''}`}
                onClick={(event) => event.preventDefault()}
                type="button"
              >
                <Icon size={19} />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>Resource pages coming soon.</p>
    </nav>
  );
}
