import styles from './UserTurn.module.css';

interface UserTurnProps {
  content: string;
}

/**
 * User text is untrusted (SECURITY_BASELINE.md). It is rendered as a React
 * text child, never through `dangerouslySetInnerHTML`, so HTML or script-like
 * content displays as literal text.
 */
export function UserTurn({ content }: UserTurnProps) {
  return (
    <li className={styles.root}>
      <div className={styles.bubble}>
        <p className={styles.text}>{content}</p>
      </div>
      <span className={styles.label}>You</span>
    </li>
  );
}
