import type { ReactNode } from 'react';
import { isSafeHttpUrl } from '../util/safeUrl';
import { ExternalLinkIcon } from './Icon';
import styles from './ExternalLink.module.css';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  /** Secondary line under the label, e.g. what the page is for. */
  description?: string;
  /** `card` is the default block; `compact` is a one-line chip for link strips. */
  variant?: 'card' | 'compact';
  className?: string;
}

/**
 * An outbound link to an official source page.
 *
 * Same two guarantees the source cards already carry:
 * `rel="noopener noreferrer"` on every `target="_blank"`, and a URL that is
 * only rendered as a link once `isSafeHttpUrl` has accepted it. A URL that
 * fails is shown as plain text — never repaired, never guessed.
 */
export function ExternalLink({
  href,
  children,
  description,
  variant = 'card',
  className = '',
}: ExternalLinkProps) {
  const variantClass = variant === 'compact' ? styles.compact : '';
  const body = (
    <>
      <span className={styles.body}>
        <span className={styles.label}>{children}</span>
        {description !== undefined && (
          <span className={styles.description}>{description}</span>
        )}
      </span>
      <ExternalLinkIcon className={styles.icon} size={15} />
    </>
  );

  if (!isSafeHttpUrl(href)) {
    return (
      <span className={`${styles.unlinked} ${variantClass} ${className}`}>{body}</span>
    );
  }

  return (
    <a
      className={`${styles.link} ${variantClass} ${className}`}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {body}
    </a>
  );
}
