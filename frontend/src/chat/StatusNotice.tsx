import { AlertIcon, InfoIcon } from '../ui/Icon';
import { AnswerBody } from './AnswerBody';
import styles from './StatusNotice.module.css';

export type NoticeStatus = 'insufficient_evidence' | 'off_topic' | 'error';

/**
 * Headings are UI chrome, not answer content. The body text below always comes
 * from the response's own `answer` field — the App never writes the explanation.
 */
const HEADINGS: Record<NoticeStatus, string> = {
  insufficient_evidence: 'Not enough evidence to answer',
  off_topic: 'Outside what AskANU covers',
  error: 'Something went wrong',
};

interface StatusNoticeProps {
  status: NoticeStatus;
  /** The response's `answer` string. Untrusted; rendered as a text child. */
  answer: string;
}

/**
 * Compact presentation for the three no-answer states, per the V3 rule that
 * these must be clear but must not take more room than a real answer.
 *
 * `--red` is reserved for `error` alone. An abstention is correct behaviour,
 * not a fault, so it must not be coloured like one.
 *
 * The body runs through `AnswerBody` at its compact scale, so a service message
 * that arrives as two short paragraphs or a small list reads as such instead of
 * running together — without letting a no-answer state grow to answer size.
 */
export function StatusNotice({ status, answer }: StatusNoticeProps) {
  const isError = status === 'error';
  const Icon = isError ? AlertIcon : InfoIcon;

  return (
    <div
      className={`${styles.root} ${isError ? styles.rootError : ''}`}
      /* Errors are announced; an abstention is read in reading order. */
      role={isError ? 'alert' : undefined}
    >
      <Icon className={styles.icon} size={18} />
      <div className={styles.body}>
        <p className={styles.heading}>{HEADINGS[status]}</p>
        <AnswerBody answer={answer} size="compact" />
      </div>
    </div>
  );
}
