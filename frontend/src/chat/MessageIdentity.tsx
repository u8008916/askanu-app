import { PersonIcon } from '../ui/Icon';
import styles from './MessageIdentity.module.css';

/**
 * The circular marker beside a user turn. A generic silhouette: no profile,
 * login or account exists (`AGENTS.md`), so there is no real photo to show.
 * It carries the accessible name "You" so the speaker is announced once,
 * replacing the visible "You" caption it stands in for.
 */
export function UserAvatar() {
  return (
    <span aria-label="You" className={`${styles.avatar} ${styles.userAvatar}`} role="img">
      <PersonIcon aria-hidden="true" size={18} />
    </span>
  );
}

/**
 * The gold AskANU marker plus the name, shown once at the top of every
 * assistant turn. The letter is decorative: the visible "AskANU" text next to
 * it is the accessible name, so nothing is announced twice.
 */
export function AskANUIdentity() {
  return (
    <div className={styles.assistant}>
      <span aria-hidden="true" className={`${styles.avatar} ${styles.assistantAvatar}`}>
        A
      </span>
      <span className={styles.assistantName}>AskANU</span>
    </div>
  );
}

const TIME_FORMAT = new Intl.DateTimeFormat('en-AU', {
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * The local time this turn was created — read from the App's own clock when
 * the turn was added, never from the backend, and never inferred. Absent for a
 * turn without a creation time (fixtures, the state gallery), which then shows
 * nothing rather than a made-up time.
 */
export function MessageTime({ at }: { at: number | undefined }) {
  if (at === undefined) {
    return null;
  }
  return (
    <time className={styles.time} dateTime={new Date(at).toISOString()}>
      {TIME_FORMAT.format(at).toUpperCase()}
    </time>
  );
}
