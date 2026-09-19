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
 * the order shown in the approved desktop and mobile designs. Every entry is
 * a guided-domain page since Events shipped on Day 15.
 */
const NAV_ITEMS: {
  label: string;
  Icon: ComponentType<{ size?: number }>;
  to: string;
}[] = [
  { label: 'Home', Icon: HomeIcon, to: '/' },
  { label: 'Courses', Icon: CoursesIcon, to: '/courses' },
  { label: 'Scholarships', Icon: ScholarshipsIcon, to: '/scholarships' },
  { label: 'Accommodation', Icon: AccommodationIcon, to: '/accommodation' },
  { label: 'Jobs', Icon: JobsIcon, to: '/jobs' },
  { label: 'Events', Icon: EventsIcon, to: '/events' },
  { label: 'Support Services', Icon: SupportIcon, to: '/support' },
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
            {/* NavLink supplies aria-current="page" for the active route. */}
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
          </li>
        ))}
      </ul>
    </nav>
  );
}
