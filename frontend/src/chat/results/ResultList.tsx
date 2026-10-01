import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import type { ResultPage, ResultPageRequest } from '../../types/api';
import { PlusIcon } from '../../ui/Icon';
import { resultNoun } from './cardLayout';
import { ResultCard } from './ResultCard';
import type { ResultCardModel, ResultSelection } from './resultItems';
import styles from './Results.module.css';

/** Cards shown before "Show more". Display-only: hidden cards keep their position. */
export const INITIAL_VISIBLE_RESULTS = 5;

interface ResultListProps {
  cards: ResultCardModel[];
  /**
   * Selected-result action. Omitted for a domain the ask request has no
   * field to carry a selected identity for yet — the button is not rendered
   * at all rather than faked with a title-text prefill.
   */
  onSelect?: (selection: ResultSelection) => void;
  /**
   * V7 Day 4: server-authored paging metadata for this exact response. When
   * provided, it fully replaces the local reveal toggle below — "Show more"
   * requests the next page from the server instead of revealing already-sent
   * cards. Omitted (legacy untyped lists, which never carry `result_page`)
   * keeps the local-reveal behaviour byte-for-byte, locked by
   * `tests/v7Day3Results.test.tsx`.
   */
  resultPage?: ResultPage;
  onShowMorePage?: (page: ResultPageRequest) => void;
  /**
   * The backend's own prose for this answer (a PARTIAL/UNKNOWN caveat, the
   * Support scope boundary), placed directly under the heading and above the
   * cards. Never written by the App.
   */
  intro?: ReactNode;
}

/**
 * The one shared, bounded, backend-ordered result group for every domain:
 * heading, optional backend prose, numbered cards, then "Show more".
 *
 * Order is `cards` order — which is `items` order — and nothing here sorts,
 * filters or reranks. Without `resultPage`, "Show more" only reveals the rest
 * in place; a card's number is its backend position whether or not earlier
 * cards are visible. With `resultPage`, "Show more" requests the next page —
 * the caller renders that page as a new turn (see `AssistantTurn`).
 *
 * The heading is a count and a domain noun and nothing else ("5 events"): it
 * makes no claim about the results being best, eligible, open or available.
 */
export function ResultList({
  cards,
  onSelect,
  resultPage,
  onShowMorePage,
  intro,
}: ResultListProps) {
  const [expanded, setExpanded] = useState(false);
  // Consumed once this exact page's own "Show more" is clicked, so an older
  // turn's button cannot be clicked twice — the retained cursor it would
  // resend has already advanced server-side, and RAG safely 400s a reused
  // one rather than silently accepting it.
  const [pageRequested, setPageRequested] = useState(false);
  const listId = useId();
  const paged = resultPage !== undefined;
  /*
   * V7 Day 5: when RAG numbered every card (a ResultSet page, a selected
   * result, a refined child set that restarts at 1), the visible number is
   * the backend ordinal — "the second one" must read "2", not "1" because it
   * is the only card in this turn. Only a list the backend did not number
   * falls back to position.
   */
  const backendNumbered = cards.every((card) => card.ordinal !== null);
  const hiddenCount = paged ? 0 : Math.max(0, cards.length - INITIAL_VISIBLE_RESULTS);
  const visible = paged || expanded ? cards : cards.slice(0, INITIAL_VISIBLE_RESULTS);
  const domain = cards[0]?.domain ?? '';
  const plural = resultNoun(domain, 2);
  // A contract inconsistency (`has_more` true but no `next_ordinal`) never
  // crashes — it just means no further page can be requested.
  const canShowMorePage =
    paged && !pageRequested && resultPage.has_more && resultPage.next_ordinal !== null;
  // The server's own page window, worded from its metadata alone.
  const range =
    paged && resultPage.start_ordinal >= 1 && resultPage.returned >= 1
      ? resultPage.returned === 1
        ? `Showing ${resultPage.start_ordinal}`
        : `Showing ${resultPage.start_ordinal}–${resultPage.start_ordinal + resultPage.returned - 1}`
      : null;

  return (
    <section className={styles.root}>
      <h3 className={styles.heading}>
        {cards.length} {resultNoun(domain, cards.length)}
      </h3>
      {intro}
      {range !== null && (
        <p className={styles.range}>
          {range}
          {resultPage?.has_more ? ' · more available' : ''}
        </p>
      )}
      <ol aria-label="Results" className={styles.list} id={listId}>
        {visible.map((card, index) => (
          <ResultCard
            card={card}
            displayNumber={
              (paged || backendNumbered) && card.ordinal !== null ? card.ordinal : index + 1
            }
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
          {!expanded && <PlusIcon aria-hidden="true" size={16} />}
          {expanded ? 'Show fewer' : `Show ${hiddenCount} more ${resultNoun(domain, hiddenCount)}`}
        </button>
      )}
      {canShowMorePage && onShowMorePage && resultPage.next_ordinal !== null && (
        <button
          className={styles.showMore}
          onClick={() => {
            setPageRequested(true);
            onShowMorePage({
              result_set_id: resultPage.result_set_id,
              start_ordinal: resultPage.next_ordinal as number,
              limit: 5,
            });
          }}
          type="button"
        >
          <PlusIcon aria-hidden="true" size={16} />
          Show more {plural}
        </button>
      )}
    </section>
  );
}
