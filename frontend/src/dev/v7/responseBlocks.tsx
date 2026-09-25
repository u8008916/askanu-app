import { ExternalLinkIcon, InfoIcon } from '../../ui/Icon';
import { isSafeHttpUrl } from '../../util/safeUrl';
import type {
  ComparisonField,
  EntitySummary,
  EntitySummaryAction,
  ResultItem,
  SelectedResultAction,
} from './proposedContract';
import { ComparisonTable as SharedComparisonTable } from '../../chat/results/ComparisonTable';
import { ResultList } from '../../chat/results/ResultList';
import type { ResultCardModel } from '../../chat/results/resultItems';
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
 * V7 Day 3: the gallery's result cards and comparison table now delegate to
 * the shared production primitives in `chat/results/`, so the mock states
 * and real turns cannot drift apart. These wrappers only adapt the
 * *proposed* contract shapes to the shared props — `entity_id` is passed as
 * the stored identity, and the selection is mapped straight back without
 * reading the rendered title.
 */
function toCardModel(item: ResultItem): ResultCardModel {
  return {
    recordId: item.entity_id,
    domain: item.domain,
    title: item.title,
    url: item.url,
    provenance: null,
    fields: item.fields,
  };
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
    <ResultList
      cards={items.map(toCardModel)}
      onSelect={(selection) =>
        onSelect({
          result_set_id: resultSetId,
          entity_id: selection.record_id,
          position: selection.position,
        })
      }
    />
  );
}

/** Comparison table: the shared primitive, fed the proposed-contract shapes. */
export function ComparisonTable({
  entities,
  fields,
}: {
  entities: ResultItem[];
  fields: ComparisonField[];
}) {
  return (
    <SharedComparisonTable
      columns={entities.map((entity) => ({ id: entity.entity_id, title: entity.title }))}
      rows={fields}
    />
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
