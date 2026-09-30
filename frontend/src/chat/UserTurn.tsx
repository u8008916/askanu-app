import { MessageTime, UserAvatar } from './MessageIdentity';
import styles from './UserTurn.module.css';

interface UserTurnProps {
  content: string;
  /** Local creation time (ms since epoch). */
  createdAt?: number;
}

/**
 * User text is untrusted (SECURITY_BASELINE.md). It is rendered as a React
 * text child, never through `dangerouslySetInnerHTML`, so HTML or script-like
 * content displays as literal text.
 */
export function UserTurn({ content, createdAt }: UserTurnProps) {
  return (
    <li className={styles.root}>
      <div className={styles.line}>
        <div className={styles.bubble}>
          <p className={styles.text}>{content}</p>
        </div>
        <UserAvatar />
      </div>
      {createdAt !== undefined && (
        <div className={styles.meta}>
          <MessageTime at={createdAt} />
        </div>
      )}
    </li>
  );
}
