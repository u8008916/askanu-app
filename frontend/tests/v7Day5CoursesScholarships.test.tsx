import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { toComparisonModel, toResultCards } from '../src/chat/results/resultItems';
import {
  insufficientCoursePrerequisitesResponse,
  insufficientScholarshipFilterResponse,
  needsCourseYearClarificationResponse,
  needsScholarshipScopeClarificationResponse,
  okAccommodationResultsResponse,
  okCourseFactResponse,
  okScholarshipDiscoveryResponse,
  okScholarshipEligibilityResponse,
} from '../src/mocks/askResponses';
import type { AskResponse, ClarificationSelectionRequest } from '../src/types/api';

/**
 * V7 Day 5 — Courses + Scholarships, pre-contract.
 *
 * Carmen has not yet published a Day 5 RAG branch; her final Day 4 head
 * `d349e88` is the only backend available. At that SHA Course and
 * Scholarship answers carry no `items`, no public `answer_state`, no
 * `actions` and no `result_page` — only prose + sources (+ a clarification).
 *
 * This suite therefore (1) proves Accommodation-specific card rendering is
 * domain-gated so it cannot leak into Courses/Scholarships, and (2) locks
 * how the App presents the real `d349e88` Course/Scholarship shapes: a
 * concise answer with its sources, exact clarification option ids, neutral
 * unknowns, and no App-authored eligibility/recommendation/match wording.
 * It deliberately defines no Course/Scholarship item type, field key,
 * eligibility field or result state — those wait for Carmen's published
 * contract. Gap detail: `docs/evidence/V7_DAY_05_COURSES_SCHOLARSHIPS.md`.
 */

function renderTurn(
  response: AskResponse,
  onSelectClarification: (
    text: string,
    selection: ClarificationSelectionRequest,
  ) => void = vi.fn(),
) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onSelectClarification={onSelectClarification}
        onSelectResult={vi.fn()}
        response={response}
      />
    </ul>,
  );
}

/** A generic, frozen-contract `PublicResultItem` for a non-Accommodation domain. */
function resultItem(overrides: Record<string, unknown> = {}) {
  return {
    type: 'result',
    record_id: 'scholarships:scholarship:placeholder-scholarship-a',
    source_id: 'scholarships_anu_finder',
    canonical_id: 'placeholder-scholarship-a',
    title: 'Placeholder scholarship A',
    url: 'https://example.invalid/placeholder-scholarship-a',
    domain: 'scholarships',
    result_set_id: 'rs-placeholder',
    ordinal: 1,
    fields: {},
    qualifying_evidence: null,
    ...overrides,
  };
}

const APP_AUTHORED_VERDICTS =
  /\b(eligible|ineligible|you qualify|recommended|best match|perfect match|best for you|most suitable)\b/i;

describe('Accommodation card assumptions are domain-gated', () => {
  it('a non-Accommodation result item gets no Accommodation field rows', () => {
    const cards = toResultCards([resultItem()]);
    expect(cards).not.toBeNull();
    expect(cards![0].fields).toEqual([]);
    expect(cards![0].qualifyingEvidence).toBeNull();
  });

  it('renders such a card with its title and link, and no "Catering"/"Advertised rate" rows', () => {
    const response: AskResponse = {
      ...okScholarshipDiscoveryResponse,
      items: [resultItem()],
    };
    renderTurn(response);
    const list = screen.getByRole('list', { name: 'Results' });
    expect(
      within(list).getByRole('link', { name: /Placeholder scholarship A/ }),
    ).toBeInTheDocument();
    expect(within(list).queryByText('Catering')).not.toBeInTheDocument();
    expect(within(list).queryByText('Advertised rate')).not.toBeInTheDocument();
    expect(within(list).queryByText('Not published')).not.toBeInTheDocument();
    // No empty description list left behind.
    expect(list.querySelector('dl')).toBeNull();
  });

  it('refuses the list when a non-Accommodation item carries a field key the App has no frozen label for', () => {
    expect(
      toResultCards([resultItem({ fields: { closing_date: '2099-10-31' } })]),
    ).toBeNull();
  });

  it('refuses the list when a non-Accommodation item borrows an Accommodation key', () => {
    expect(toResultCards([resultItem({ fields: { catering_options: 'Catered' } })])).toBeNull();
  });

  it('refuses room-rate qualifying_evidence on a non-Accommodation item', () => {
    expect(
      toResultCards([
        resultItem({
          qualifying_evidence: {
            type: 'room_rate',
            room_name: 'Placeholder room',
            rate: '$1.00',
            cost_period: 'placeholder period',
            contract: null,
            inclusions: null,
            other_fees: null,
          },
        }),
      ]),
    ).toBeNull();
  });

  it('a refused list falls back to the backend answer text and its sources', () => {
    const response: AskResponse = {
      ...okScholarshipDiscoveryResponse,
      items: [resultItem({ fields: { closing_date: '2099-10-31' } })],
    };
    renderTurn(response);
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.getByText(/Placeholder scholarship A\. Official status: open/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('Accommodation cards are unchanged: all 7 fixed rows still render', () => {
    const cards = toResultCards(okAccommodationResultsResponse.items);
    expect(cards).not.toBeNull();
    expect(cards![0].fields.map((field) => field.label)).toEqual([
      'Category',
      'Location',
      'Catering',
      'Advertised rate',
      'Cost period',
      'Audience',
      'Features',
    ]);
  });

  it('comparison stays domain-neutral: backend-authored labels render for any domain', () => {
    const model = toComparisonModel([
      {
        type: 'comparison',
        result_set_id: 'rs-placeholder',
        records: [
          resultItem(),
          resultItem({
            record_id: 'scholarships:scholarship:placeholder-scholarship-b',
            canonical_id: 'placeholder-scholarship-b',
            title: 'Placeholder scholarship B',
            ordinal: 2,
          }),
        ],
        fields: [
          {
            name: 'placeholder_dimension',
            label: 'Backend-authored label',
            values: [
              {
                record_id: 'scholarships:scholarship:placeholder-scholarship-b',
                value: 'B value',
                state: 'published',
              },
              {
                record_id: 'scholarships:scholarship:placeholder-scholarship-a',
                value: null,
                state: 'not_published',
              },
            ],
          },
        ],
      },
    ]);
    expect(model).not.toBeNull();
    expect(model!.rows).toEqual([{ label: 'Backend-authored label', values: [null, 'B value'] }]);
  });
});

describe('Course answers at RAG d349e88 stay conversational', () => {
  it('a Course fact renders as the backend answer plus its one source — no cards, no table', () => {
    renderTurn(okCourseFactResponse);
    expect(screen.getByText(/PLAC1110 \(2026\) prerequisites: placeholder text/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const sources = screen.getByRole('region', { name: 'Sources' });
    expect(within(sources).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Ask about this/ })).not.toBeInTheDocument();
  });

  it('the academic-year clarification sends the exact backend option id, never the label or a year the App parsed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderTurn(needsCourseYearClarificationResponse, onSelect);

    await user.click(screen.getByRole('button', { name: 'PLAC1110 (2026)' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const [, selection] = onSelect.mock.calls[0];
    expect(selection).toEqual({
      clarification_id: 'clar-course-plac1110-academic-year',
      option_ids: ['courses:course:PLAC1110_2026'],
    });
  });

  it('an unestablished prerequisite is a neutral unknown, not an error and not "no prerequisites"', () => {
    renderTurn(insufficientCoursePrerequisitesResponse);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(
      screen.getByText(/does not establish its prerequisites/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no prerequisites|none required/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });
});

describe('Scholarship answers at RAG d349e88 carry no App-authored semantics', () => {
  it('discovery prose renders with every source, but no cards and no App-authored verdict', () => {
    renderTurn(okScholarshipDiscoveryResponse);
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    const sources = screen.getByRole('region', { name: 'Sources' });
    expect(within(sources).getAllByRole('listitem')).toHaveLength(2);
    expect(document.body.textContent ?? '').not.toMatch(APP_AUTHORED_VERDICTS);
  });

  it('the stored closing date inside the prose is shown exactly as sent — no reformatting, no invented time, no "Closed"', () => {
    renderTurn(okScholarshipDiscoveryResponse);
    expect(screen.getByText(/Closing date: 2099-10-31/)).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/\b\d{1,2}:\d{2}\s?(am|pm)\b/i);
    expect(screen.queryByText(/\bclosed\b/i)).not.toBeInTheDocument();
  });

  it('"am I eligible?" shows the backend non-determination verbatim and adds no eligibility badge', () => {
    renderTurn(okScholarshipEligibilityResponse);
    expect(
      screen.getByText(/I cannot determine your personal eligibility/),
    ).toBeInTheDocument();
    // The only occurrence of "eligib…" is the backend's own sentence.
    const text = document.body.textContent ?? '';
    expect(text.replace(/cannot determine your personal eligibility|Official eligibility information/g, '')).not.toMatch(
      APP_AUTHORED_VERDICTS,
    );
    expect(screen.queryByRole('status', { name: /eligib/i })).not.toBeInTheDocument();
  });

  it('the real scholarship_selection clarification sends the exact stored record id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderTurn(needsScholarshipScopeClarificationResponse, onSelect);

    await user.click(
      screen.getByRole('button', { name: /Placeholder scholarship B — placeholder-scholarship-b/ }),
    );

    const [, selection] = onSelect.mock.calls[0];
    expect(selection).toEqual({
      clarification_id: 'clar-scholarship-scope',
      option_ids: ['scholarships:scholarship:placeholder-scholarship-b'],
    });
  });

  it('no matching scholarship is a neutral unknown, not a "No scholarships" empty state or an error', () => {
    renderTurn(insufficientScholarshipFilterResponse);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByText(/no scholarships (found|available)/i)).not.toBeInTheDocument();
  });
});
