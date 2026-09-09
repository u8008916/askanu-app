import { CrestPlaceholder } from '../ui/Icon';
import styles from './Brand.module.css';

interface BrandProps {
  /** The mobile app bar drops the tagline. */
  showTagline?: boolean;
  /**
   * The wordmark is the page heading in the chat panel, but the persistent
   * mobile app bar is site chrome that sits above every route — a heading
   * there would compete with the resource page's own `h1`.
   */
  asHeading?: boolean;
}

/**
 * `Ask` in ink, `ANU` in gold. The wordmark is large display text, which is
 * the one place --gold is permitted for type.
 *
 * The mark is a generic shield placeholder — the ANU crest asset has not been
 * supplied and must not be approximated.
 */
export function Brand({ showTagline = true, asHeading = true }: BrandProps) {
  const Wordmark = asHeading ? 'h1' : 'span';
  return (
    <div className={styles.root}>
      <CrestPlaceholder size={showTagline ? 34 : 28} />
      <div className={styles.text}>
        <Wordmark className={styles.wordmark}>
          Ask<span className={styles.wordmarkAccent}>ANU</span>
        </Wordmark>
        {showTagline && (
          <p className={styles.tagline}>
            Your intelligent guide to ANU information.
          </p>
        )}
      </div>
    </div>
  );
}
