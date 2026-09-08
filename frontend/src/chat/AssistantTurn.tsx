import type { AskResponse, Clarification } from '../types/api';
import { AnswerBody } from './AnswerBody';
import { SourceCards } from './SourceCards';
import { StatusNotice } from './StatusNotice';
import type { NoticeStatus } from './StatusNotice';
import styles from './AssistantTurn.module.css';

const NOTICE_STATUSES: NoticeStatus[] = [
  'insufficient_evidence',
  'off_topic',
  'error',
];

function isNoticeStatus(status: AskResponse['status']): status is NoticeStatus {
  return (NOTICE_STATUSES as string[]).includes(status);
}

/**
 * Clarification options, read-only.
 *
 * The conversation contract's baseline is that the student answers in words —
 * first / second / both / correction — so listing the options and pointing at
 * the message box is the working behaviour today, not a stopgap. Day 13 adds
 * selectable controls on top.
 *
 * Order is significant: it is what `first` and `second` refer to.
 */
function ClarificationOptions({ clarification }: { clarification: Clarification }) {
  return (
    <div className={styles.clarification}>
      <ol aria-label="Clarification options" className={styles.options}>
        {clarification.options.map((option, index) => (
          <li className={styles.option} key={option.id}>
            <span aria-hidden="true" className={styles.optionIndex}>
              {index + 1}
            </span>
            <span className={styles.optionLabel}>{option.label}</span>
          </li>
        ))}
      </ol>
      <p className={styles.optionsNote}>
        {clarification.allow_multiple
          ? 'Reply in the message box — you can choose one or both.'
          : 'Reply in the message box to choose one.'}
      </p>
    </div>
  );
}

interface AssistantTurnProps {
  response: AskResponse;
}

/**
 * One AskANU turn.
 *
 * Every status in the frozen enum renders something: `ok` and `partial` show
 * the answer and its evidence, `needs_clarification` adds the option list, and
 * the three no-answer statuses use the compact notice. A malformed envelope
 * with nothing to show falls back to the error notice rather than a blank turn.
 *
 * No timestamp and no `request_id` appear here. A single-session chat does not
 * need them, and `request_id` is an internal identifier students should not be
 * shown.
 *
 * `answer` and every source field are untrusted model/stored strings. They are
 * rendered as React text children only — never `dangerouslySetInnerHTML`, and
 * never through a markdown renderer, which would reintroduce HTML execution.
 * `AnswerBody` gives a grounded answer its paragraphs and lists under exactly
 * that rule: it chooses elements from parsed structure, it never parses markup.
 */
export function AssistantTurn({ response }: AssistantTurnProps) {
  const { status, answer, sources, clarification } = response;
  const hasAnswer = answer.trim() !== '';
  const hasContent = hasAnswer || sources.length > 0 || clarification !== null;

  return (
    <li className={styles.root}>
      <span className={styles.label}>AskANU</span>
      <div className={styles.body}>
        {isNoticeStatus(status) || !hasContent ? (
          <>
            <StatusNotice
              answer={
                hasAnswer
                  ? answer
                  : /* Client-side fallback for an envelope that carries nothing
                       to display. Not backend copy. */
                    'No response content was returned.'
              }
              status={isNoticeStatus(status) ? status : 'error'}
            />
            {/*
              An abstention can still be evidence-backed. The real service
              answers "prerequisites for COMP1110" with `insufficient_evidence`
              plus the stored Programs and Courses record: the evidence exists,
              it simply does not establish the fact that was asked for. Hiding
              that source would drop provenance the backend supplied and leave
              the student with no way to check. Renders nothing when the
              envelope carries no sources, which is the usual case here.
            */}
            <SourceCards sources={sources} />
          </>
        ) : (
          <>
            {hasAnswer && <AnswerBody answer={answer} />}
            {clarification && (
              <ClarificationOptions clarification={clarification} />
            )}
            <SourceCards sources={sources} />
          </>
        )}
      </div>
    </li>
  );
}
