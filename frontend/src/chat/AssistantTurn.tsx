import { useId, useState } from 'react';
import type {
  AskResponse,
  Clarification,
  ClarificationSelectionRequest,
  ResultPageRequest,
  SelectedResultRequest,
} from '../types/api';
import { AnswerBody } from './AnswerBody';
import { ResponseActions } from './ResponseActions';
import { ComparisonTable } from './results/ComparisonTable';
import { ResultList } from './results/ResultList';
import type { ResultSelection } from './results/resultItems';
import { toComparisonModel, toResultCards } from './results/resultItems';
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
 *
 * V7 Day 4 (`askanu-rag` PR #38, not yet merged): `onSelect` also carries the
 * exact backend option ids alongside the human-readable text — `App.tsx`
 * attaches them to the outgoing `AskRequest` as `clarification_selection`
 * only if the composer is sent with this exact text unchanged, so RAG can
 * bypass free-text re-parsing entirely. Ids come from `clarification.options`
 * in backend order, never from `Set` insertion order.
 */
function ClarificationOptions({
  clarification,
  onSelect,
  active,
}: {
  clarification: Clarification;
  onSelect: (text: string, selection: ClarificationSelectionRequest) => void;
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

  const selectedOptions = options.filter((option) => selected.has(option.id));
  const selectedLabels = selectedOptions.map((option) => option.label);

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
                onClick={() =>
                  onSelect(option.label, {
                    clarification_id: clarification.id,
                    option_ids: [option.id],
                  })
                }
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
              onClick={() =>
                onSelect(joinSelection(selectedLabels), {
                  clarification_id: clarification.id,
                  option_ids: selectedOptions.map((option) => option.id),
                })
              }
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
  onSelectClarification: (text: string, selection: ClarificationSelectionRequest) => void;
  /** False once a later response has resolved or replaced this turn's clarification. */
  isClarificationActive: boolean;
  /**
   * V7 Day 4: fired when a card's "Ask about this" is clicked, only ever
   * passed down for a card domain that closed contract gap G1 (Accommodation/
   * Support today — detected generically by the card carrying a non-null
   * `resultSetId`/`canonicalId`/`ordinal`, never by a domain name literal).
   */
  onSelectResult?: (payload: {
    prefillText: string;
    selectedResult: SelectedResultRequest;
  }) => void;
  /** V7 Day 4: fired when "Show more" on a server-paged result list is clicked. */
  onRequestMorePage?: (page: ResultPageRequest) => void;
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
 * backend did not send.
 *
 * V7 Day 4 (`askanu-rag` PR #38, not yet merged): a single `type:"comparison"`
 * item renders through the shared `ComparisonTable` instead (never alongside
 * cards). The selected-result action is now wired, but only for a card that
 * carries the full `{resultSetId, canonicalId, ordinal}` triple — the ask
 * request still has no field to carry a selected identity for a domain that
 * doesn't send one (Jobs/Events), so their cards keep no button, exactly as
 * before.
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
  onSelectResult,
  onRequestMorePage,
}: AssistantTurnProps) {
  const { status, answer, sources, clarification, items, actions = [] } = response;
  const hasAnswer = answer.trim() !== '';
  /*
   * Result cards and a comparison table come only from the backend's own
   * `items`, and only for an answered turn: a notice status never grows a
   * result list. The two are mutually exclusive by construction
   * (`results/resultItems.ts`): a `type:"comparison"` item never becomes a
   * card, and `toComparisonModel` only succeeds for exactly one such item.
   */
  const cards = isNoticeStatus(status) ? null : toResultCards(items);
  const comparison = isNoticeStatus(status) ? null : toComparisonModel(items);
  const hasContent =
    hasAnswer ||
    sources.length > 0 ||
    clarification !== null ||
    cards !== null ||
    comparison !== null;
  const noticeStatus: NoticeStatus = isNoticeStatus(status) ? status : 'error';

  /*
   * V7 Day 4: eligible only when every card in the list carries the full
   * `{resultSetId, canonicalId, ordinal}` triple — today that means
   * Accommodation/Support, never Jobs/Events, and the check is generic
   * (no domain literal) so it tracks whichever domain the backend closes
   * contract gap G1 for next.
   */
  const selectionEligible =
    onSelectResult !== undefined &&
    cards !== null &&
    cards.length > 0 &&
    cards.every(
      (card) =>
        card.resultSetId !== null && card.canonicalId !== null && card.ordinal !== null,
    );

  function handleCardSelect(selection: ResultSelection) {
    const card = cards?.find((candidate) => candidate.recordId === selection.record_id);
    if (
      !onSelectResult ||
      !card ||
      card.resultSetId === null ||
      card.canonicalId === null ||
      card.ordinal === null
    ) {
      return;
    }
    /*
     * Identity travels structurally in `selected_result`, independent of the
     * composer text — RAG resolves it from that field before the domain
     * logic ever reads `question` (`main.py`'s `_state_with_verified_result_selection`
     * runs first). A "Tell me more about <title>" prefill is no longer a
     * "magic wording" shortcut the way it would have been before this
     * structured field existed (see Day 3 evidence): the text is just a
     * normal, editable follow-up question, and the student can replace it
     * with anything — the identity does not depend on what it says.
     */
    onSelectResult({
      prefillText: `Tell me more about ${card.title}`,
      selectedResult: {
        result_set_id: card.resultSetId,
        canonical_id: card.canonicalId,
        ordinal: card.ordinal,
      },
    });
  }

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
            {/*
              V7 Day 4: a validated official action (e.g. "Apply now") can
              accompany a useful-unknown abstention — never styled as part of
              the error/no-answer treatment above.
            */}
            <ResponseActions actions={actions} />
          </>
        ) : (
          <>
            {hasAnswer &&
              ((cards === null && comparison === null) || status === 'partial') && (
              /*
                A `partial` answer's text carries the caveat about what is
                missing, so it stays in full above any cards/comparison.
              */
              <AnswerBody answer={answer} />
            )}
            {cards !== null && (
              <ResultList
                cards={cards}
                onSelect={selectionEligible ? handleCardSelect : undefined}
                onShowMorePage={onRequestMorePage}
                resultPage={response.result_page ?? undefined}
              />
            )}
            {comparison !== null && (
              <ComparisonTable columns={comparison.columns} rows={comparison.rows} />
            )}
            {hasAnswer && (cards !== null || comparison !== null) && status !== 'partial' && (
              /*
                The backend's text for a list/comparison answer restates the
                same records shown above, one line each. It stays on the page
                — the backend wrote it — but collapsed, so the turn is not a
                second wall of text.
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
            <ResponseActions actions={actions} />
          </>
        )}
      </div>
    </li>
  );
}
