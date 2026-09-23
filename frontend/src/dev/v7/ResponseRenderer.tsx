import { AnswerBody } from '../../chat/AnswerBody';
import type { EntitySummaryAction, ProposedResponse, SelectedResultAction } from './proposedContract';
import {
  ComparisonTable,
  EntitySummaryBlock,
  ResultCards,
  UnknownWithNextAction,
} from './responseBlocks';

/**
 * ARCHITECTURE PREP, not a production component.
 *
 * Demonstrates the pattern Qasim asked for on V7 Day 1 (`docs/V7_UI_CONTRACT.md`
 * §8): "prepare the response renderer so we're not permanently locked into one
 * generic Markdown response." Given a `response_type` discriminator, this
 * picks one of a small, fixed set of renderers instead of always falling
 * through to one text bubble. TypeScript's exhaustiveness check on the
 * `switch` below is the actual proof this is architecture-ready: adding a
 * seventh `ProposedResponse` member is a compile error here until a case
 * handles it, which is the property Qasim's ask is for.
 *
 * NOT wired into `AssistantTurn.tsx` or the real send path. The frozen v1
 * envelope (`docs/API_CONTRACT.md`) has no `response_type` field, and per
 * `docs/V7_UI_CONTRACT.md` §8/§9 that field is not expected until RAG's
 * retrieval/response work (Day 3+), well after the state contract this
 * reviews (askanu-rag PR #34, still open) lands. A real, untrusted
 * `response_type` value arriving over the network would need the same
 * runtime validation `chat/askResponse.ts`'s `parseAskResponse` already gives
 * every other envelope field before it reaches a component — that validation
 * is Day 2+ work once the field is frozen, not duplicated here.
 *
 * `clarification` is deliberately not a case here: that shape already works,
 * unchanged, through `AssistantTurn.tsx`'s own `ClarificationOptions` against
 * the real frozen `clarification` field.
 */
interface ResponseRendererProps {
  response: ProposedResponse;
  onSelectResult: (action: SelectedResultAction) => void;
  onSelectAction: (action: EntitySummaryAction) => void;
}

export function ResponseRenderer({
  response,
  onSelectResult,
  onSelectAction,
}: ResponseRendererProps) {
  switch (response.response_type) {
    case 'answer':
      return <AnswerBody answer={response.answer} />;

    case 'entity_summary':
      return <EntitySummaryBlock entity={response.entity} onSelectAction={onSelectAction} />;

    case 'result_set':
      return (
        <>
          {response.answer !== undefined && <AnswerBody answer={response.answer} />}
          <ResultCards
            items={response.resultSet.items}
            onSelect={onSelectResult}
            resultSetId={response.resultSet.result_set_id}
          />
        </>
      );

    case 'comparison':
      return (
        <>
          {response.answer !== undefined && <AnswerBody answer={response.answer} />}
          <ComparisonTable entities={response.entities} fields={response.fields} />
        </>
      );

    case 'unknown':
    case 'partial':
      return (
        <>
          <AnswerBody answer={response.answer} />
          {response.nextAction && (
            <UnknownWithNextAction label={response.nextAction.label} url={response.nextAction.url} />
          )}
        </>
      );
  }
}
