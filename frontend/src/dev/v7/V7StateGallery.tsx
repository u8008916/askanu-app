import { AssistantTurn } from '../../chat/AssistantTurn';
import { UserTurn } from '../../chat/UserTurn';
import { ExternalLinkIcon, InfoIcon } from '../../ui/Icon';
import { isSafeHttpUrl } from '../../util/safeUrl';
import {
  V7_STATE_FIXTURES,
  hostileUsefulUnknownFixture,
} from './v7StateFixtures';
import type { V7StateFixture } from './v7StateFixtures';
import type { ResultItem, SelectedResultAction } from './proposedContract';
import styles from './V7StateGallery.module.css';

/**
 * Dev-only Day 1 acceptance gallery.
 *
 * Renders the three V7 target mock states (`docs/V7_UI_CONTRACT.md` §3) inside
 * the real chat chrome (`AssistantTurn`, `AnswerBody`, `UserTurn`) plus three
 * small dev-only blocks (`ResultCards`, `ComparisonTable`,
 * `UnknownWithNextAction`) for the *proposed* fields nothing in `types/api.ts`
 * defines yet. Nothing here is a production component: this module and its
 * fixtures are reachable only from the `/dev/v7-states` route, itself gated
 * the same way `FixturePicker`/`askMock` already are, so a production build
 * drops all of it. See `App.tsx` for the gate and
 * `docs/evidence/V7_DAY_01_UX_CONTRACT_FREEZE.md` for the bundle-exclusion
 * proof.
 *
 * `onSelectClarification` from `AssistantTurn` is unused by any of these
 * fixtures (none carries a `clarification`), so a no-op satisfies the prop
 * without adding a second composer or send path.
 */
function noop() {
  // No fixture on this page carries a clarification; nothing to prefill.
}

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
function ResultCards({
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
function ComparisonTable({
  entities,
  fields,
}: {
  entities: ResultItem[];
  fields: { label: string; values: (string | null)[] }[];
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
function SelectedResultChip({
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
function UnknownWithNextAction({
  label,
  url,
}: {
  label: string;
  url: string;
}) {
  const linkable = isSafeHttpUrl(url);
  return (
    <div className={styles.unknownNextAction}>
      <InfoIcon className={styles.unknownIcon} size={16} />
      {linkable ? (
        <a
          className={styles.nextActionLink}
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {label}
          <ExternalLinkIcon size={14} />
        </a>
      ) : (
        <span className={styles.nextActionLink}>{label}</span>
      )}
    </div>
  );
}

function StateBlock({ fixture }: { fixture: V7StateFixture }) {
  return (
    <li className={styles.state}>
      <h2 className={styles.stateTitle}>{fixture.title}</h2>
      <ul aria-label="Conversation" className={styles.turns}>
        <UserTurn content={fixture.question} />
        <AssistantTurn
          isClarificationActive={false}
          onSelectClarification={noop}
          response={fixture.response}
        />
      </ul>
      {fixture.resultSet && (
        <ResultCards
          items={fixture.resultSet.items}
          onSelect={() => {
            // Dev-only: no session to write the selection into.
          }}
          resultSetId={fixture.resultSet.result_set_id}
        />
      )}
      {fixture.comparison && (
        <>
          <ComparisonTable
            entities={fixture.comparison.entities}
            fields={fixture.comparison.fields}
          />
          {fixture.selectedResult && (
            <SelectedResultChip
              entityTitle={
                fixture.comparison.entities.find(
                  (entity) => entity.entity_id === fixture.selectedResult?.entity_id,
                )?.title ?? fixture.selectedResult.entity_id
              }
              onDismiss={() => {
                // Dev-only: no session to clear.
              }}
            />
          )}
        </>
      )}
      {fixture.nextAction && (
        <UnknownWithNextAction label={fixture.nextAction.label} url={fixture.nextAction.url} />
      )}
    </li>
  );
}

/**
 * The gallery page. Rendered only behind the same dev + mock-transport gate
 * `App.tsx` already uses for `FixturePicker`. Includes the hostile-strings
 * variant so safe rendering can be checked live in a real browser, matching
 * `hostileStringsResponse` in `mocks/askResponses.ts`.
 */
export function V7StateGallery() {
  return (
    <div className={styles.root}>
      <h1 className={styles.pageTitle}>V7 Day 1 — target mock states</h1>
      <p className={styles.pageCaption}>
        Dev-only acceptance references for docs/V7_UI_CONTRACT.md §3. Not part
        of any production route.
      </p>
      <ul className={styles.stateList}>
        {V7_STATE_FIXTURES.map((fixture) => (
          <StateBlock fixture={fixture} key={fixture.id} />
        ))}
        <StateBlock fixture={hostileUsefulUnknownFixture} />
      </ul>
    </div>
  );
}
