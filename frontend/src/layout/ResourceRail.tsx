import { memo } from 'react';
import { ResourceCards } from '../resources/ResourceCards';
import { DomainNav } from './DomainNav';
import styles from './ResourceRail.module.css';

/**
 * The desktop right column: Explore, then the three resource panels.
 *
 * Memoised because the composer draft lives in App: without this, every
 * keystroke in the chat input re-renders the whole rail.
 */
export const ResourceRail = memo(function ResourceRail() {
  return (
    <div className={styles.root}>
      <DomainNav />
      <ResourceCards />
    </div>
  );
});
