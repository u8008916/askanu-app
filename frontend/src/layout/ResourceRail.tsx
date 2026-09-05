import { ResourceCards } from '../resources/ResourceCards';
import { DomainNav } from './DomainNav';
import styles from './ResourceRail.module.css';

/** The desktop right column: Explore, then the three resource panels. */
export function ResourceRail() {
  return (
    <div className={styles.root}>
      <DomainNav />
      <ResourceCards />
    </div>
  );
}
