import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { toResultCards } from '../src/chat/results/resultItems';
import { useChatSession } from '../src/chat/useChatSession';
import { setMockScenarioId } from '../src/dev/mockTransport';
import {
  insufficientAccommodationVacancyResponse,
  needsAccommodationClarificationManyOptionsResponse,
  needsAccommodationClarificationResponse,
  okAccommodationCompareResponse,
  okAccommodationResponse,
} from '../src/mocks/askResponses';
import type { AskRequest, AskResponse } from '../src/types/api';

/**
 * V7 Day 4 — Accommodation vertical, verify-and-lock.
 *
 * `askanu-rag` `origin/main` @ `54d75f4` (Carmen's Day 3 #37, merged) sends no
 * Accommodation `items`, no comparison payload, no `answer_state`/ResultSet
 * status and no selected-result request field (gaps G1–G3, G5 from
 * `docs/evidence/V7_DAY_03_RESULTS_COMPARISON_UNKNOWN.md`, re-verified against
 * this SHA). Building cards, a comparison table or a next-action control for
 * Accommodation today would mean inventing wire data the backend never sent —
 * exactly what `docs/v7/DAY_04.md` forbids ("no hidden backend defect via UI
 * workaround"). This suite instead locks how the existing shared shell
 * renders the *real* Accommodation wire shapes: discovery clarification
 * (`accommodation_selection`, `allow_multiple: true`), compare (prose, no
 * cards), vacancy unknown (`insufficient_evidence`, no next-action control),
 * and that state/Clear Chat behave the same for Accommodation as any other
 * domain. See the plan file / evidence doc for the full gap table (G1–G9).
 */

function renderTurn(response: AskResponse) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onSelectClarification={vi.fn()}
        response={response}
      />
    </ul>,
  );
}

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(screen.getByLabelText('Ask AskANU a question'), question);
  await user.click(screen.getByRole('button', { name: 'Send' }));
}

describe('Accommodation discovery clarification (real wire shape)', () => {
  it('renders checkboxes, not a single-select button, matching allow_multiple: true', () => {
    renderTurn(needsAccommodationClarificationResponse);
    expect(
      screen.getByRole('checkbox', { name: /Placeholder residence A/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Placeholder residence B/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Placeholder residence A/ }),
    ).not.toBeInTheDocument();
  });

  it('shows all 20 options in backend order, never trimmed or reordered', () => {
    renderTurn(needsAccommodationClarificationManyOptionsResponse);
    const options = within(
      screen.getByRole('list', { name: 'Clarification options' }),
    ).getAllByRole('checkbox');
    expect(options).toHaveLength(20);
    expect(options[0]).toHaveAccessibleName(/Placeholder residence 1$/);
    expect(options[19]).toHaveAccessibleName(/Placeholder residence 20$/);
  });

  it('a single checked option prefills the composer with exactly the backend label, on Use selection (not auto-sent)', async () => {
    const user = userEvent.setup();
    render(<App />);
    setMockScenarioId('needs-clarification-accommodation');
    await ask(user, 'Tell me about accommodation');

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: /Placeholder residence A/ }),
      ).toBeInTheDocument(),
    );
    const repliesBefore = screen.getAllByText('AskANU').length;
    await user.click(
      screen.getByRole('checkbox', { name: /Placeholder residence A/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Use selection' }));

    expect(screen.getByLabelText('Ask AskANU a question')).toHaveValue(
      'Placeholder residence A',
    );
    // Prefill only — no second message was sent for this selection.
    expect(screen.getAllByText('AskANU')).toHaveLength(repliesBefore);
    expect(
      screen.queryByRole('button', { name: 'Send' }),
    ).toBeEnabled();
  });

  it('is keyboard-operable: Tab reaches a checkbox, Space toggles it, Tab reaches Use selection', async () => {
    const user = userEvent.setup();
    renderTurn(needsAccommodationClarificationResponse);

    await user.tab();
    const first = screen.getByRole('checkbox', { name: /Placeholder residence A/ });
    expect(first).toHaveFocus();
    await user.keyboard(' ');
    expect(first).toBeChecked();

    await user.tab();
    expect(
      screen.getByRole('checkbox', { name: /Placeholder residence B/ }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Use selection' })).toHaveFocus();
  });

  it('never shows the backend record_id as visible text', () => {
    renderTurn(needsAccommodationClarificationResponse);
    expect(
      screen.queryByText('accommodation:residence:placeholder-residence-a'),
    ).not.toBeInTheDocument();
  });
});

describe('Accommodation compare (prose only — no comparison payload on the wire, gap G2)', () => {
  it('renders the backend prose and both sources, and builds no comparison table or result list', () => {
    renderTurn(okAccommodationCompareResponse);

    expect(
      screen.getByText(/Placeholder comparison answer/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ask about this/ }),
    ).not.toBeInTheDocument();

    const sources = screen.getByRole('region', { name: 'Sources' });
    const titles = within(sources)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(titles[0]).toContain('Placeholder residence record title A');
    expect(titles[1]).toContain('Placeholder residence record title B');
  });

  it('toResultCards refuses accommodation items (always empty on this wire), so no card path is reachable', () => {
    expect(toResultCards(okAccommodationCompareResponse.items)).toBeNull();
  });
});

describe('Accommodation vacancy unknown (insufficient_evidence, gap G3/G7/G8)', () => {
  it('is not styled or announced as an error', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the backend text verbatim, including the application link as plain text (no structured next action exists on the wire)', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    expect(
      screen.getByText(/A null vacancy status means unknown, not available or unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Published application link: https:\/\/example\.invalid\/placeholder-apply/),
    ).toBeInTheDocument();
    // No App-authored link element was built from that URL — it is plain text
    // inside the answer, not an anchor (URL linkification is out of Day 4 scope).
    expect(
      screen.queryByRole('link', { name: /placeholder-apply/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps the source evidence and renders no result cards', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('the App never authors its own vacancy verdict wording', () => {
    renderTurn(insufficientAccommodationVacancyResponse);
    // Gap G8: today this can only read as the generic "Not enough evidence"
    // abstention heading (no `answer_state`/ResultSet status on the wire to
    // render a distinct useful-unknown state) — locked here so a change to
    // that heading is a deliberate, visible diff, not a silent one.
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByText(/no vacanc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rooms? available/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fully booked|sold out/i)).not.toBeInTheDocument();
  });
});

/**
 * Interruption/return and Clear Chat, driven directly against `useChatSession`
 * with a scripted transport (same pattern as `tests/conversationState.test.tsx`),
 * because `conversation_state` is opaque by contract and none of the shared
 * mock fixtures above happen to set it. The property under test is that an
 * Accommodation session behaves under the same state rules as any other
 * domain — Day 4 introduces no accommodation-specific state handling.
 */
describe('Accommodation session: interruption/return and Clear Chat', () => {
  function buildResponse(overrides: Partial<AskResponse> = {}): AskResponse {
    return {
      status: 'ok',
      answer: 'Placeholder answer.',
      items: [],
      sources: [],
      clarification: null,
      request_id: 'req_test',
      ...overrides,
    };
  }

  it('echoes state byte-for-byte across an accommodation -> course -> accommodation interruption', async () => {
    const requests: AskRequest[] = [];
    const accommodationState = { schema_version: 1, focus: { domain: 'accommodation' } };
    const courseState = { schema_version: 1, focus: { domain: 'courses' } };
    const backToAccommodationState = {
      schema_version: 1,
      focus: { domain: 'accommodation' },
      recent_entities: ['courses'],
    };
    const scripted = [
      buildResponse({ conversation_state: accommodationState, request_id: 'r1' }),
      buildResponse({ conversation_state: courseState, request_id: 'r2' }),
      buildResponse({ conversation_state: backToAccommodationState, request_id: 'r3' }),
    ];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return scripted.shift() as AskResponse;
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('Which residences are self-catered?');
    });
    expect(requests[0].conversation_state).toEqual({ pending_clarification: null });

    await act(async () => {
      await result.current.sendMessage('Actually, what are the prerequisites for COMP1110?');
    });
    // The course interruption still echoes the accommodation state that was
    // held — the App never drops or swaps state based on what the question
    // is about; only RAG's own response changes what is held.
    expect(requests[1].conversation_state).toBe(accommodationState);

    await act(async () => {
      await result.current.sendMessage('Back to accommodation — what about cost?');
    });
    expect(requests[2].conversation_state).toBe(courseState);

    // The turn history itself also survived the interruption unclipped.
    const userTurns = result.current.turns.filter(
      (turn): turn is Extract<typeof turn, { kind: 'user' }> => turn.kind === 'user',
    );
    expect(userTurns.map((turn) => turn.content)).toEqual([
      'Which residences are self-catered?',
      'Actually, what are the prerequisites for COMP1110?',
      'Back to accommodation — what about cost?',
    ]);
  });

  it('Clear Chat mid-accommodation-journey sends empty history and no state on the next turn', async () => {
    const requests: AskRequest[] = [];
    const heldState = { schema_version: 1, focus: { domain: 'accommodation' } };
    const scripted = [buildResponse({ conversation_state: heldState, request_id: 'r1' })];
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(request);
      return scripted.shift() as AskResponse;
    });

    const { result } = renderHook(() => useChatSession(transport));

    await act(async () => {
      await result.current.sendMessage('Which residences allow pets?');
    });
    expect(result.current.turns.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.turns).toEqual([]);

    scripted.push(buildResponse({ conversation_state: { schema_version: 1 }, request_id: 'r2' }));
    await act(async () => {
      await result.current.sendMessage('What is the application process?');
    });

    expect(requests[1].history).toEqual([]);
    expect(requests[1].conversation_state).toEqual({ pending_clarification: null });
  });

  it('Clear Chat through the UI mid-accommodation-journey resets visible turns and announces it', async () => {
    const user = userEvent.setup();
    render(<App />);
    setMockScenarioId('ok-accommodation');
    await ask(user, 'Tell me about Accommodation options');
    expect(screen.getByText('Tell me about Accommodation options')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));

    expect(
      screen.queryByText('Tell me about Accommodation options'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Try asking' }),
    ).toBeInTheDocument();
  });
});

describe('Accommodation regression guard: no card path exists yet', () => {
  it('the shared item adapter refuses every accommodation response fixture (items always empty on this wire)', () => {
    for (const response of [
      okAccommodationResponse,
      okAccommodationCompareResponse,
      insufficientAccommodationVacancyResponse,
    ]) {
      expect(toResultCards(response.items)).toBeNull();
    }
  });

  it('AssistantTurn never renders a result list or an Ask-about action for any accommodation fixture', () => {
    for (const response of [
      okAccommodationResponse,
      okAccommodationCompareResponse,
      insufficientAccommodationVacancyResponse,
    ]) {
      const { unmount } = renderTurn(response);
      expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Ask about this/ }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });
});
