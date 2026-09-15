import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, ExternalLinkIcon } from '../ui/Icon';
import { isSafeHttpUrl } from '../util/safeUrl';
import type { FeedState } from './FeedsProvider';
import styles from './Panel.module.css';

interface FeedItem {
  record_id: string;
  title: string;
  url: string;
}

interface FeedPanelProps<T extends FeedItem> {
  title: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  state: FeedState<T>;
  /** The secondary line under an item's title. Return null to show none. */
  renderMeta: (item: T) => ReactNode;
  /** Copy for a successful, empty list. Not a fault: the source lists nothing. */
  emptyText: string;
  /** Copy for an unavailable feed. Says the data is unavailable, never why. */
  unavailableText: string;
  /** In-app route for `View all`; omitted when no resource page exists yet. */
  viewAllTo?: string;
}

/**
 * Shared shape for the Upcoming Events and Current Jobs panels.
 *
 * Renders exactly one of: a loading line, the server's items in the server's
 * order, an honest "nothing listed" line, or an honest "unavailable" line.
 * There are no placeholder rows and no invented items in any state.
 *
 * `title` and `url` are untrusted stored strings: the title is a text child
 * and the URL is only made a link once `isSafeHttpUrl` accepts it — a record
 * whose stored URL fails is still shown, just not as an anchor. Same two
 * guarantees as the chat's source cards.
 */
export function FeedPanel<T extends FeedItem>({
  title,
  Icon,
  state,
  renderMeta,
  emptyText,
  unavailableText,
  viewAllTo,
}: FeedPanelProps<T>) {
  return (
    <section aria-label={title} className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>
          <Icon className={styles.panelTitleIcon} size={16} />
          {title}
        </h3>
        {viewAllTo !== undefined && (
          <Link className={styles.viewAll} to={viewAllTo}>
            View all
          </Link>
        )}
      </div>

      {state.kind === 'loading' && (
        <p aria-live="polite" className={styles.stateText}>
          Loading…
        </p>
      )}

      {state.kind === 'unavailable' && (
        <p className={styles.stateText}>{unavailableText}</p>
      )}

      {state.kind === 'ready' && state.items.length === 0 && (
        <p className={styles.stateText}>{emptyText}</p>
      )}

      {state.kind === 'ready' && state.items.length > 0 && (
        <ul className={styles.feed}>
          {state.items.map((item, index) => {
            const linkable = isSafeHttpUrl(item.url);
            const meta = renderMeta(item);
            const body = (
              <>
                <span className={styles.bullet} />
                <span className={styles.feedBody}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  {meta !== null && <span className={styles.itemMeta}>{meta}</span>}
                </span>
                {linkable ? (
                  <ExternalLinkIcon className={styles.chevron} size={15} />
                ) : (
                  <ChevronRightIcon className={styles.chevron} size={16} />
                )}
              </>
            );

            return (
              <li className={styles.feedItem} key={`${item.record_id}-${index}`}>
                {linkable ? (
                  <a
                    className={styles.itemLink}
                    href={item.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {body}
                  </a>
                ) : (
                  <span className={styles.itemLink}>{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
