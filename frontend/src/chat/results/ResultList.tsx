import { useId, useState } from 'react';
import type { ResultPage, ResultPageRequest } from '../../types/api';
import { ExternalLinkIcon } from '../../ui/Icon';
import { isSafeHttpUrl } from '../../util/safeUrl';
import type { ResultCardModel, ResultSelection } from './resultItems';
import styles from './Results.module.css';

/** Shared neutral label for a field the source did not publish. */
export const MISSING_VALUE_LABEL = 'Not published';

/** Cards shown before "Show more". Display-only: hidden cards keep their position. */
export const INITIAL_VISIBLE_RESULTS = 5;

function ResultCard({
  card,
  position,
  onSelect,
}: {
  card: ResultCardModel;
  position: number;
  onSelect?: (selection: ResultSelection) => void;
}) {
  const linkable = isSafeHttpUrl(card.url);

  return (
    <li className={styles.card}>
      <div className={styles.cardHeader}>
        <span aria-hidden="true" className={styles.index}>
          {position}
        </span>
        <div className={styles.cardHeading}>
          {linkable ? (
            <a
              className={styles.cardTitleLink}
              href={card.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {card.title}
              <ExternalLinkIcon className={styles.external} size={14} />
            </a>
          ) : (
            <span className={styles.cardTitle}>{card.title}</span>
          )}
          {card.provenance !== null && (
            <span className={styles.provenance}>{card.provenance}</span>
          )}
        </div>
      </div>
      <dl className={styles.fieldList}>
        {card.fields.map((field) => (
          <div className={styles.fieldRow} key={field.label}>
            <dt className={styles.fieldLabel}>{field.label}</dt>
            <dd className={styles.fieldValue}>
              {field.value ?? <span className={styles.missing}>{MISSING_VALUE_LABEL}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {/*
        V7 Day 4: the one named room whose published rate satisfied an active
        price constraint. Deliberately muted, not a "confirmed"/positive
        badge — it proves only that one room, never affordability, cheapest,
        vacancy or obtainability for the residence as a whole.
      */}
      {card.qualifyingEvidence && (
        <p className={styles.qualifyingEvidence}>
          Matched room: {card.qualifyingEvidence.roomName} —{' '}
          {card.qualifyingEvidence.rate} ({card.qualifyingEvidence.costPeriod})
          {card.qualifyingEvidence.contract && `, ${card.qualifyingEvidence.contract}`}
          {card.qualifyingEvidence.inclusions && `, ${card.qualifyingEvidence.inclusions}`}
          {card.qualifyingEvidence.otherFees && `, ${card.qualifyingEvidence.otherFees}`}
        </p>
      )}
      {onSelect && (
        <button
          className={styles.cardAction}
          onClick={() =>
            onSelect({ record_id: card.recordId, domain: card.domain, position })
          }
          type="button"
        >
          {/* The accessible name starts with the visible label (WCAG 2.5.3)
              and names the card, so repeated buttons are distinguishable. */}
          Ask about this<span className="visually-hidden">: {card.title}</span>
        </button>
      )}
    </li>
  );
}

interface ResultListProps {
  cards: ResultCardModel[];
  /**
   * Selected-result action. Omitted for a domain the ask request has no
   * field to carry a selected identity for yet (Jobs/Events) — the button is
   * not rendered at all rather than faked with a title-text prefill.
   */
  onSelect?: (selection: ResultSelection) => void;
  /**
   * V7 Day 4: server-authored paging metadata for this exact response. When
   * provided, it fully replaces the local reveal toggle below — "Show more"
   * requests the next page from the server instead of revealing already-sent
   * cards. Omitted (Jobs/Events, which never carry `result_page`) keeps
   * today's local-reveal behaviour byte-for-byte, locked by
   * `tests/v7Day3Results.test.tsx`.
   */
  resultPage?: ResultPage;
  onShowMorePage?: (page: ResultPageRequest) => void;
}

/**
 * The one shared, bounded, backend-ordered result list for every domain.
 *
 * Order is `cards` order — which is `items` order — and nothing here sorts,
 * filters or reranks. Without `resultPage`, "Show more" only reveals the rest
 * in place; a card's number is its backend position whether or not earlier
 * cards are visible. With `resultPage`, "Show more" requests the next page —
 * the caller renders that page as a new turn (see `AssistantTurn`).
 */
export function ResultList({
  cards,
  onSelect,
  resultPage,
  onShowMorePage,
}: ResultListProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const paged = resultPage !== undefined;
  const hiddenCount = paged ? 0 : Math.max(0, cards.length - INITIAL_VISIBLE_RESULTS);
  const visible = paged || expanded ? cards : cards.slice(0, INITIAL_VISIBLE_RESULTS);
  const noun = cards.length === 1 ? 'result' : 'results';
  // A contract inconsistency (`has_more` true but no `next_ordinal`) never
  // crashes — it just means no further page can be requested.
  const canShowMorePage =
    paged && resultPage.has_more && resultPage.next_ordinal !== null;

  return (
    <section className={styles.root}>
      <h3 className={styles.heading}>
        {cards.length} {noun}
      </h3>
      <ol aria-label="Results" className={styles.list} id={listId}>
        {visible.map((card, index) => (
          <ResultCard
            card={card}
            key={card.recordId}
            onSelect={onSelect}
            position={index + 1}
          />
        ))}
      </ol>
      {!paged && hiddenCount > 0 && (
        <button
          aria-controls={listId}
          aria-expanded={expanded}
          className={styles.showMore}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? 'Show fewer' : `Show ${hiddenCount} more`}
        </button>
      )}
      {canShowMorePage && onShowMorePage && resultPage.next_ordinal !== null && (
        <button
          className={styles.showMore}
          onClick={() =>
            onShowMorePage({
              result_set_id: resultPage.result_set_id,
              start_ordinal: resultPage.next_ordinal as number,
              limit: 5,
            })
          }
          type="button"
        >
          Show more
        </button>
      )}
    </section>
  );
}
