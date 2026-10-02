import { brandAsset } from '../ui/brandAssets';
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
 * The crest in a fixed square, so the wordmark never shifts whether the mark
 * is the approved ANU file or the generic placeholder. The approved file comes
 * from `src/assets/brand/` (see its README); it is never drawn here. A crest
 * with no dark-theme variant sits on a light backing on the dark theme, so
 * the supplied file is shown untouched rather than recoloured.
 */
function BrandMark({ showTagline }: { showTagline: boolean }) {
  const logo = brandAsset('anu-logo');

  if (logo !== null) {
    return (
      <span
        className={`${styles.mark} ${styles.logoMark}`}
        style={{
          height: showTagline ? 48 : 32,
          width: showTagline ? 148 : 99,
        }}
      >
        <img
          alt="Australian National University"
          className={styles.universityLogo}
          src={logo}
        />
      </span>
    );
  }

  const light = brandAsset('anu-crest');
  const dark = brandAsset('anu-crest-dark');
  const size = showTagline ? 60 : 38;

  return (
    <span
      className={`${styles.mark} ${light !== null && dark === null ? styles.markBacked : ''}`}
      style={{ height: size, width: size }}
    >
      {light === null ? (
        <CrestPlaceholder size={size} />
      ) : (
        <>
          <img
            alt="Australian National University crest"
            className={dark === null ? styles.crest : `${styles.crest} ${styles.crestLight}`}
            height={size}
            src={light}
            width={size}
          />
          {dark !== null && (
            <img
              alt="Australian National University crest"
              className={`${styles.crest} ${styles.crestDark}`}
              height={size}
              src={dark}
              width={size}
            />
          )}
        </>
      )}
    </span>
  );
}

/**
 * `Ask` in ink, `ANU` in gold. The wordmark is large display text, which is
 * the one place --gold is permitted for type.
 */
export function Brand({ showTagline = true, asHeading = true }: BrandProps) {
  const Wordmark = asHeading ? 'h1' : 'span';
  return (
    <div className={styles.root}>
      <BrandMark showTagline={showTagline} />
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
