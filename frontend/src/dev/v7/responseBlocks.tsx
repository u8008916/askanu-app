import { ExternalLinkIcon, InfoIcon } from '../../ui/Icon';
import { isSafeHttpUrl } from '../../util/safeUrl';
import type {
  ComparisonField,
  EntitySummary,
  EntitySummaryAction,
  ResultItem,
  SelectedResultAction,
} from './proposedContract';
import styles from './V7StateGallery.module.css';

/**
 * Shared dev-only render blocks for the *proposed* V7 response shapes.
 *
 * Extracted out of `V7StateGallery.tsx` so `ResponseRenderer.tsx` (the
 * response-type dispatcher, `docs/V7_UI_CONTRACT.md` §8/§9) and the gallery
 * both render the exact same markup rather than two copies drifting apart.
 * Not a production module — see `V7StateGallery.tsx`'s doc comment for the
 * gate that keeps all of `dev/v7/` out of the production bundle.
 */

/**
 * One result card. A real `<button>`, not a `div onClick`, so it is reachable
 * by keyboard and has an accessible name from its own text — the same rule
 * `RecommendedQuestionCard` and `SourceCards` already follow. The action
 * receives the canonical `SelectedResultAction`, never a string derived from
 * the rendered title.
 */
function ResultCard({
  item,
  position,
  resultSetId,
  onSelect,
}: {
  item: ResultItem;
  position: number;
  resultSetId: string;
  onSelect: (action: SelectedResultAction) => void;
}) {
  return (
    <li>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{item.title}</span>
          <span className={styles.cardDomain}>{item.domain}</span>
        </div>
        <dl className={styles.fieldList}>
          {item.fields.map((field) => (
            <div className={styles.fieldRow} key={field.label}>
              <dt className={styles.fieldLabel}>{field.label}</dt>
              <dd className={styles.fieldValue}>
                {field.value ?? (
                  <span className={styles.unknown}>Not published in the stored record</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <button
          className={styles.cardAction}
          onClick={() =>
            onSelect({ result_set_id: resultSetId, entity_id: item.entity_id, position })
          }
          type="button"
        >
          Ask about this
        </button>
      </div>
    </li>
  );
}

/** Bounded, backend-ordered result cards. Order is `items` order — no App sort. */
export function ResultCards({
  resultSetId,
  items,
  onSelect,
}: {
  resultSetId: string;
  items: ResultItem[];
  onSelect: (action: SelectedResultAction) => void;
}) {
  return (
    <ol aria-label="Result set" className={styles.cardGrid}>
      {items.map((item, index) => (
        <ResultCard
          item={item}
          key={item.entity_id}
          onSelect={onSelect}
          position={index + 1}
          resultSetId={resultSetId}
        />
      ))}
    </ol>
  );
}

/**
 * Comparison table. Every dimension row appears exactly once, in the
 * backend's declared order; a `null` cell renders the same neutral unknown
 * label `ResultCard` uses — never blank, never the other entity's value.
 */
export function ComparisonTable({
  entities,
  fields,
}: {
  entities: ResultItem[];
  fields: ComparisonField[];
}) {
  return (
    <table className={styles.comparisonTable}>
      <caption className={styles.comparisonCaption}>Comparison</caption>
      <thead>
        <tr>
          <th scope="col">Dimension</th>
          {entities.map((entity) => (
            <th key={entity.entity_id} scope="col">
              {entity.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={field.label}>
            <th scope="row">{field.label}</th>
            {field.values.map((value, index) => (
              <td key={entities[index].entity_id}>
                {value ?? <span className={styles.unknown}>Unknown</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A dismissible chip naming the currently selected result. The composer
 * itself is out of scope for this dev-only page (there is no send path here);
 * the chip demonstrates the visual only. Real wiring is Day 2 work.
 */
export function SelectedResultChip({
  entityTitle,
  onDismiss,
}: {
  entityTitle: string;
  onDismiss: () => void;
}) {
  return (
    <div className={styles.chip}>
      <span>Selected: {entityTitle}</span>
      <button
        aria-label={`Clear selected result: ${entityTitle}`}
        className={styles.chipDismiss}
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

/**
 * The useful-unknown treatment: info icon + gold-tint surface, never the red
 * `StatusNotice` error treatment and never its "Not enough evidence" heading.
 * UNKNOWN must not read as a failure.
 */
export function UnknownWithNextAction({ label, url }: { label: string; url: string }) {
  const linkable = isSafeHttpUrl(url);
  return (
    <div className={styles.unknownNextAction}>
      <InfoIcon className={styles.unknownIcon} size={16} />
      {linkable ? (
        <a className={styles.nextActionLink} href={url} rel="noopener noreferrer" target="_blank">
          {label}
          <ExternalLinkIcon size={14} />
        </a>
      ) : (
        <span className={styles.nextActionLink}>{label}</span>
      )}
    </div>
  );
}

/**
 * Compact single-entity overview — the "Tell me about Warrumbul Lodge" shape
 * (`docs/V7_UI_CONTRACT.md` §8). A `description`/field `value` of `null`
 * renders the same neutral unknown label `ResultCard` uses, never blank.
 * Each action is a real `<button>` that only hands `prompt` back to the
 * caller to prefill the composer — the same prefill-only rule every other
 * card/option in this codebase follows; it is never a second send path.
 */
export function EntitySummaryBlock({
  entity,
  onSelectAction,
}: {
  entity: EntitySummary;
  onSelectAction: (action: EntitySummaryAction) => void;
}) {
  return (
    <div className={styles.entitySummary}>
      <h3 className={styles.entitySummaryTitle}>{entity.title}</h3>
      <p className={styles.entitySummaryDescription}>
        {entity.description ?? <span className={styles.unknown}>Not published in the stored record</span>}
      </p>
      <dl className={styles.fieldList}>
        {entity.fields.map((field) => (
          <div className={styles.fieldRow} key={field.label}>
            <dt className={styles.fieldLabel}>{field.label}</dt>
            <dd className={styles.fieldValue}>
              {field.value ?? (
                <span className={styles.unknown}>Not published in the stored record</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {entity.actions.length > 0 && (
        <div className={styles.entitySummaryActions}>
          {entity.actions.map((action) => (
            <button
              className={styles.cardAction}
              key={action.label}
              onClick={() => onSelectAction(action)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
