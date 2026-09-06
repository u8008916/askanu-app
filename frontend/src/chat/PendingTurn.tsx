import styles from './PendingTurn.module.css';

/**
 * The loading state between sending a question and the response arriving.
 *
 * It occupies the AskANU turn slot, so the answer replaces it in place. The
 * composer sits in its own flex slot outside the scroller and does not move.
 *
 * `aria-live="polite"` with a text label announces the wait to screen readers;
 * the dots themselves are decorative and hidden.
 */
export function PendingTurn() {
  return (
    <li className={styles.root}>
      <span className={styles.label}>AskANU</span>
      <div aria-live="polite" className={styles.bubble}>
        <span className="visually-hidden">AskANU is finding an answer</span>
        <span aria-hidden="true" className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      </div>
    </li>
  );
}
