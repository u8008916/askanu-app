import { useId, useState } from 'react';
import type { AskResponse, Clarification } from '../types/api';
import { AnswerBody } from './AnswerBody';
import { ResultList } from './results/ResultList';
import { toResultCards } from './results/resultItems';
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

/*
 * Client-side fallbacks for a notice envelope whose `answer` is empty. Not
 * backend copy, and deliberately status-specific: an abstention with no text
 * must still read as "not known", never as "no results", and never as the
 * generic "nothing was returned" an error gets.
 */
const EMPTY_NOTICE_FALLBACK: Record<NoticeStatus, string> = {
  insufficient_evidence:
    "AskANU couldn't confirm this from its stored ANU sources. Try asking in a different way, or check the official ANU website.",
  off_topic: 'This question is outside what AskANU covers.',
  error: "AskANU couldn't complete this answer. Please try again.",
};

/**
 * Combines selected option labels into one sentence, e.g. "Both COMP1110 and
 * COMP1600" for two, "A, B and C" for more. `both` stays the exact wording the
 * conversation contract names for the common two-option case.
 */
function joinSelection(labels: string[]): string {
  if (labels.length <= 1) {
    return labels[0] ?? '';
  }
  if (labels.length === 2) {
    return `Both ${labels[0]} and ${labels[1]}`;
  }
  const [last, ...rest] = [...labels].reverse();
  return `${rest.reverse().join(', ')} and ${last}`;
}

/**
 * Clarification options, selectable — but only for the turn `useChatSession`
 * still considers pending.
 *
 * A single-select option is a button: clicking it puts its label in the
 * composer, exactly like a domain-launcher card — never a second send path.
 * A multi-select clarification (`allow_multiple`) uses checkboxes so the
 * student can build `both`/`A, B and C` before sending. Either way the student
 * can still ignore the controls and type a reply, which is why the message-box
 * note stays.
 *
 * `active` is false once a later response has resolved or replaced this
 * clarification: the session only ever carries one `pendingClarification`, so
 * an earlier turn's options no longer correspond to anything a reply would
 * resolve. They stay visible as conversation history, disabled rather than
 * removed, with no message-box prompt inviting an answer that would land on
 * the wrong turn.
 *
 * Order is significant: it is what `first` and `second` refer to.
 */
function ClarificationOptions({
  clarification,
  onSelect,
  active,
}: {
  clarification: Clarification;
  onSelect: (text: string) => void;
  active: boolean;
}) {
  const { options, allow_multiple: allowMultiple } = clarification;
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const groupName = useId();

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const selectedLabels = options
    .filter((option) => selected.has(option.id))
    .map((option) => option.label);

  return (
    <div className={styles.clarification}>
      <ol aria-label="Clarification options" className={styles.options}>
        {options.map((option, index) => (
          <li key={option.id}>
            {allowMultiple ? (
              <label
                className={`${styles.option} ${!active ? styles.optionDisabled : ''}`}
              >
                <input
                  checked={selected.has(option.id)}
                  className={styles.optionCheckbox}
                  disabled={!active}
                  name={groupName}
                  onChange={() => toggle(option.id)}
                  type="checkbox"
                />
                <span aria-hidden="true" className={styles.optionIndex}>
                  {index + 1}
                </span>
                <span className={styles.optionLabel}>{option.label}</span>
              </label>
            ) : (
              <button
                className={`${styles.option} ${!active ? styles.optionDisabled : ''}`}
                disabled={!active}
                onClick={() => onSelect(option.label)}
                type="button"
              >
                <span aria-hidden="true" className={styles.optionIndex}>
                  {index + 1}
                </span>
                <span className={styles.optionLabel}>{option.label}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
      {active &&
        (allowMultiple ? (
          <div className={styles.selectionActions}>
            <button
              className={styles.useSelection}
              disabled={selectedLabels.length === 0}
              onClick={() => onSelect(joinSelection(selectedLabels))}
              type="button"
            >
              Use selection
            </button>
            <p className={styles.optionsNote}>
              Choose one or more, then use your selection — or reply in the
              message box.
            </p>
          </div>
        ) : (
          <p className={styles.optionsNote}>
            Select an option, or reply in the message box.
          </p>
        ))}
    </div>
  );
}

interface AssistantTurnProps {
  response: AskResponse;
  onSelectClarification: (text: string) => void;
  /** False once a later response has resolved or replaced this turn's clarification. */
  isClarificationActive: boolean;
}

/**
 * One AskANU turn.
 *
 * Every status in the frozen enum renders something: `ok` and `partial` show
 * the answer and its evidence, `needs_clarification` adds the option list, and
 * the three no-answer statuses use the compact notice. A malformed envelope
 * with nothing to show falls back to the error notice rather than a blank turn.
 *
 * V7 Day 3: when an answered turn's `items` are a recognised, well-formed
 * list, they render through the one shared `ResultList` in exactly the order
 * RAG sent them (`results/resultItems.ts`). Anything else leaves `items`
 * unrendered and the answer text in charge — the App never builds a list the
 * backend did not send. The selected-result action is not wired here: the ask
 * request has no field to carry a selected identity back to RAG yet.
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
export function AssistantTurn({
  response,
  onSelectClarification,
  isClarificationActive,
}: AssistantTurnProps) {
  const { status, answer, sources, clarification, items } = response;
  const hasAnswer = answer.trim() !== '';
  /*
   * Result cards come only from the backend's own `items`, and only for an
   * answered turn: a notice status never grows a result list.
   */
  const cards = isNoticeStatus(status) ? null : toResultCards(items);
  const hasContent =
    hasAnswer || sources.length > 0 || clarification !== null || cards !== null;
  const noticeStatus: NoticeStatus = isNoticeStatus(status) ? status : 'error';

  return (
    <li className={styles.root}>
      <span className={styles.label}>AskANU</span>
      <div className={styles.body}>
        {isNoticeStatus(status) || !hasContent ? (
          <>
            <StatusNotice
              answer={hasAnswer ? answer : EMPTY_NOTICE_FALLBACK[noticeStatus]}
              status={noticeStatus}
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
            {hasAnswer && (cards === null || status === 'partial') && (
              /*
                A `partial` answer's text carries the caveat about what is
                missing, so it stays in full above any cards.
              */
              <AnswerBody answer={answer} />
            )}
            {cards !== null && <ResultList cards={cards} />}
            {hasAnswer && cards !== null && status !== 'partial' && (
              /*
                The backend's text for a list answer restates the same records
                the cards show, one line each. It stays on the page — the
                backend wrote it — but collapsed, so the turn is not a second
                wall of text.
              */
              <details className={styles.answerText}>
                <summary className={styles.answerTextSummary}>Show as text</summary>
                <AnswerBody answer={answer} />
              </details>
            )}
            {/*
              A `needs_clarification` response with no options would render an
              empty list and a "Select an option" prompt for nothing to
              select. `DAY_02.md`'s do-not-cross line ("No empty
              clarification options") means that case falls back to the
              answer text and the free-text composer only, same as any other
              status.
            */}
            {clarification && clarification.options.length > 0 && (
              <ClarificationOptions
                active={isClarificationActive}
                clarification={clarification}
                onSelect={onSelectClarification}
              />
            )}
            <SourceCards sources={sources} />
          </>
        )}
      </div>
    </li>
  );
}
