import type { Source } from '../types/api';
import { ChevronDownIcon, DocumentIcon, ExternalLinkIcon } from '../ui/Icon';
import { isSafeHttpUrl } from '../util/safeUrl';
import styles from './SourceCards.module.css';

interface SourceCardsProps {
  sources: Source[];
  /**
   * Starts expanded. Closed by default under an answer that already shows its
   * records; the abstention path passes `true`, because there the source is
   * the only thing the turn has to show.
   */
  defaultOpen?: boolean;
}

/**
 * The evidence block under an answer: a collapsible "Sources (n)" row that
 * lists every source the backend sent.
 *
 * Order is the order the backend sent: the contract prescribes no sort, and the
 * App must not reorder evidence. `title` and `url` are untrusted stored strings
 * — the title is rendered as a text child, and the URL is only made a link once
 * `isSafeHttpUrl` accepts it.
 */
export function SourceCards({ sources, defaultOpen = false }: SourceCardsProps) {
  // The envelope allows `ok` with no sources. Render nothing rather than an
  // empty "Sources" container.
  if (sources.length === 0) {
    return null;
  }

  return (
    <section aria-label="Sources" className={styles.root}>
      <details className={styles.disclosure} open={defaultOpen}>
        <summary className={styles.summary}>
          <DocumentIcon aria-hidden="true" className={styles.summaryIcon} size={18} />
          <span className={styles.summaryLabel}>Sources</span>
          <span className={styles.count}>({sources.length})</span>
          <ChevronDownIcon aria-hidden="true" className={styles.chevron} size={18} />
        </summary>
        <ol className={styles.list}>
          {sources.map((source, index) => {
            const linkable = isSafeHttpUrl(source.url);
            const body = (
              <>
                <span aria-hidden="true" className={styles.index}>
                  {index + 1}
                </span>
                <span className={styles.body}>
                  <span className={styles.title}>{source.title}</span>
                  <span className={styles.domain}>{source.domain}</span>
                </span>
                {linkable && (
                  <ExternalLinkIcon className={styles.external} size={15} />
                )}
              </>
            );

            return (
              <li key={`${source.record_id}-${index}`}>
                {linkable ? (
                  <a
                    className={styles.card}
                    href={source.url}
                    /* Opens the original ANU page in a new tab; `noopener` keeps
                       it from reaching back into this window. */
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {body}
                  </a>
                ) : (
                  <span className={`${styles.card} ${styles.cardUnlinked}`}>
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}
