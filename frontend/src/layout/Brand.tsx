import { CrestPlaceholder } from '../ui/Icon';
import styles from './Brand.module.css';

interface BrandProps {
  /** The mobile app bar drops the tagline. */
  showTagline?: boolean;
}

/**
 * `Ask` in ink, `ANU` in gold. The wordmark is large display text, which is
 * the one place --gold is permitted for type.
 *
 * The mark is a generic shield placeholder — the ANU crest asset has not been
 * supplied and must not be approximated.
 */
export function Brand({ showTagline = true }: BrandProps) {
  return (
    <div className={styles.root}>
      <CrestPlaceholder size={showTagline ? 34 : 28} />
      <div className={styles.text}>
        <h1 className={styles.wordmark}>
          Ask<span className={styles.wordmarkAccent}>ANU</span>
        </h1>
        {showTagline && (
          <p className={styles.tagline}>
            Your intelligent guide to ANU information.
          </p>
        )}
      </div>
    </div>
  );
}
