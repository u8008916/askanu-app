import { AssistantTurn } from '../../chat/AssistantTurn';
import turnStyles from '../../chat/AssistantTurn.module.css';
import { UserTurn } from '../../chat/UserTurn';
import {
  V7_STATE_FIXTURES,
  hostileUsefulUnknownFixture,
  warrumbulEntitySummaryFixture,
} from './v7StateFixtures';
import type { V7StateFixture } from './v7StateFixtures';
import { ResponseRenderer } from './ResponseRenderer';
import {
  ComparisonTable,
  ResultCards,
  SelectedResultChip,
  UnknownWithNextAction,
} from './responseBlocks';
import styles from './V7StateGallery.module.css';

/**
 * Dev-only Day 1 acceptance gallery.
 *
 * Renders the three V7 target mock states (`docs/V7_UI_CONTRACT.md` §3) inside
 * the real chat chrome (`AssistantTurn`, `AnswerBody`, `UserTurn`), plus a
 * fourth state (`entity_summary`, §8/§9) rendered through the
 * `ResponseRenderer` dispatcher to prove the response-type architecture
 * generalises beyond the three states Day 1 originally modeled. The
 * dev-only render blocks (`ResultCards`, `ComparisonTable`,
 * `UnknownWithNextAction`, `EntitySummaryBlock`) live in `responseBlocks.tsx`
 * so this gallery and `ResponseRenderer.tsx` share one implementation.
 * Nothing here is a production component: this module and its fixtures are
 * reachable only from the `/dev/v7-states` route, itself gated the same way
 * `FixturePicker`/`askMock` already are, so a production build drops all of
 * it. See `App.tsx` for the gate and
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
 * The fourth state: `entity_summary`, rendered through `ResponseRenderer`
 * rather than the fixed per-field markup `StateBlock` uses for the other
 * three. This is the architectural point of this block — it proves the
 * dispatcher (§8/§9) picks the right renderer for a response type Day 1 did
 * not originally model, not just the three it started with.
 */
function EntitySummaryStateBlock() {
  return (
    <li className={styles.state}>
      <h2 className={styles.stateTitle}>{warrumbulEntitySummaryFixture.title}</h2>
      <ul aria-label="Conversation" className={styles.turns}>
        <UserTurn content={warrumbulEntitySummaryFixture.question} />
        <li className={turnStyles.root}>
          <span className={turnStyles.label}>AskANU</span>
          <div className={turnStyles.body}>
            <ResponseRenderer
              onSelectAction={() => {
                // Dev-only: no composer on this page to prefill.
              }}
              onSelectResult={() => {
                // Dev-only: no session to write the selection into.
              }}
              response={warrumbulEntitySummaryFixture.response}
            />
          </div>
        </li>
      </ul>
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
        <EntitySummaryStateBlock />
        <StateBlock fixture={hostileUsefulUnknownFixture} />
      </ul>
    </div>
  );
}
