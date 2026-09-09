import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
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
 * An entry carries a `to` once its resource page exists; the rest are announced
 * as disabled and carry no routing until their scheduled day.
 */
const NAV_ITEMS: {
  label: string;
  Icon: ComponentType<{ size?: number }>;
  to?: string;
}[] = [
  { label: 'Home', Icon: HomeIcon, to: '/' },
  { label: 'Courses', Icon: CoursesIcon, to: '/courses' },
  { label: 'Scholarships', Icon: ScholarshipsIcon },
  { label: 'Accommodation', Icon: AccommodationIcon },
  { label: 'Jobs', Icon: JobsIcon },
  { label: 'Events', Icon: EventsIcon },
  { label: 'Support Services', Icon: SupportIcon },
];

interface DomainNavProps {
  /** The drawer shows the nav without its own panel chrome. */
  bare?: boolean;
  /** The drawer closes itself when a destination is chosen. */
  onNavigate?: () => void;
}

export function DomainNav({ bare = false, onNavigate }: DomainNavProps) {
  return (
    <nav
      aria-label="Explore"
      className={`${styles.root} ${bare ? styles.bare : ''}`}
    >
      <h2 className={styles.heading}>Explore</h2>
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ label, Icon, to }) => (
          <li key={label}>
            {to === undefined ? (
              <button
                aria-disabled="true"
                className={`${styles.item} ${styles.itemDisabled}`}
                onClick={(event) => event.preventDefault()}
                type="button"
              >
                <Icon size={19} />
                {label}
              </button>
            ) : (
              /* NavLink supplies aria-current="page" for the active route. */
              <NavLink
                className={({ isActive }) =>
                  `${styles.item} ${styles.itemLink} ${isActive ? styles.itemCurrent : ''}`
                }
                end
                onClick={onNavigate}
                to={to}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.note}>Remaining resource pages coming soon.</p>
    </nav>
  );
}
