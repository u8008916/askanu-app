import type { ResponseAction } from '../types/api';
import { ExternalLinkIcon, InfoIcon } from '../ui/Icon';
import { isSafeHttpUrl } from '../util/safeUrl';
import styles from './ResponseActions.module.css';

/**
 * V7 Day 4 (`askanu-rag` PR #38, not yet merged): renders the response's
 * validated `actions` — today, only `type:"application"` ("Apply now").
 *
 * `actions` is only ever built from a stored, model-validated
 * `application_url`, but this app's own security baseline never trusts a
 * server claim about a URL blindly — `isSafeHttpUrl` still decides here
 * exactly like it does for `sources[].url` and a card's own `url`. `label`
 * and `url` are untrusted stored strings, rendered as React text/attribute
 * values only.
 *
 * Renders in both the notice branch and the answer branch of `AssistantTurn`,
 * so an action can appear alongside `insufficient_evidence` (a useful
 * unknown, e.g. "vacancy not published — Apply now") without borrowing
 * `StatusNotice`'s red/alert error treatment.
 */
export function ResponseActions({ actions }: { actions: ResponseAction[] }) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      {actions.map((action, index) => {
        const linkable = isSafeHttpUrl(action.url);
        return (
          <div className={styles.action} key={`${action.record_id}-${index}`}>
            <InfoIcon className={styles.icon} size={16} />
            {linkable ? (
              <a
                className={styles.link}
                href={action.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {action.label}
                <ExternalLinkIcon size={14} />
              </a>
            ) : (
              <span className={styles.link}>{action.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
