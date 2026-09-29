import { act, render, renderHook, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { parseAskResponse } from '../src/chat/askResponse';
import { toComparisonModel, toResultCards } from '../src/chat/results/resultItems';
import { useChatSession } from '../src/chat/useChatSession';
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
import wire from '../src/mocks/v7Day5Wire.0efb6ee.json';
import type {
  AskRequest,
  AskResponse,
  ClarificationSelectionRequest,
  ResultPageRequest,
  SelectedResultRequest,
} from '../src/types/api';

/**
 * V7 Day 5 — Courses + Scholarships, integrated against Carmen's published
 * Day 5 RAG `0efb6ee98f1d364a26edb74d60729d21af3debc3`.
 *
 * `v7Day5Wire.0efb6ee.json` holds verbatim `/api/v1/ask` response bodies
 * captured by running Carmen's own `tests/test_v7_day5_courses_scholarships.py`
 * harness (synthetic fixtures, not ANU facts). Every real-wire test below
 * pushes those bytes through the App's own response boundary
 * (`parseAskResponse`) first, so a wire the App cannot parse fails here, not
 * in a browser.
 *
 * The public wire *types* did not change between `d349e88` and `0efb6ee`
 * (`models/` is byte-identical); what changed is that Course and Scholarship
 * answers now carry `items`, `answer_state` and (Scholarships) `result_page`,
 * and `selected_result`/`result_page` requests are accepted for Scholarship
 * ResultSets. Gap remap: `docs/evidence/V7_DAY_05_COURSES_SCHOLARSHIPS.md`.
 */

type WireEntry = {
  question: string;
  request_extra: Record<string, unknown>;
  response: unknown;
};
const WIRE = wire as unknown as Record<string, WireEntry>;

function real(name: string): AskResponse {
  const parsed = parseAskResponse(WIRE[name].response);
  if (parsed === null) {
    throw new Error(`real 0efb6ee wire "${name}" was refused by parseAskResponse`);
  }
  return parsed;
}

function renderTurn(
  response: AskResponse,
  {
    onSelectClarification = vi.fn(),
    onSelectResult = vi.fn(),
    onRequestMorePage = vi.fn(),
  }: {
    onSelectClarification?: (text: string, selection: ClarificationSelectionRequest) => void;
    onSelectResult?: (payload: { prefillText: string; selectedResult: SelectedResultRequest }) => void;
    onRequestMorePage?: (page: ResultPageRequest) => void;
  } = {},
) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onRequestMorePage={onRequestMorePage}
        onSelectClarification={onSelectClarification}
        onSelectResult={onSelectResult}
        response={response}
      />
    </ul>,
  );
}

/** Visible text of each `<dt>`/`<dd>` pair on one card, in DOM order. */
function cardFields(card: HTMLElement): [string, string][] {
  return Array.from(card.querySelectorAll('dt')).map((dt) => [
    dt.textContent ?? '',
    dt.nextElementSibling?.textContent ?? '',
  ]);
}

function cards(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem');
}

/** The visible number badge of one card (the backend ordinal or the position). */
function cardNumber(card: HTMLElement): string {
  return card.querySelector('[aria-hidden="true"]')?.textContent ?? '';
}

/** A generic `PublicResultItem` in a domain RAG does not have, so no key set exists for it. */
function unlabelledItem(overrides: Record<string, unknown> = {}) {
  return {
    type: 'result',
    record_id: 'unlisted:service:placeholder-service-a',
    source_id: 'unlisted_placeholder',
    canonical_id: 'placeholder-service-a',
    title: 'Placeholder unlisted item A',
    url: 'https://example.invalid/placeholder-service-a',
    domain: 'unlisted',
    result_set_id: 'rs-placeholder',
    ordinal: 1,
    fields: {},
    qualifying_evidence: null,
    ...overrides,
  };
}

const APP_AUTHORED_VERDICTS =
  /\b(you are eligible|ineligible|you qualify|recommended|best match|perfect match|best for you|most suitable|easier|harder|better)\b/i;

const COURSE_LABELS = [
  'Entity type',
  'Code',
  'Academic year',
  'Units',
  'Description',
  'Prerequisites',
  'Corequisites',
  'Incompatibilities',
  'Assumed knowledge',
  'Offerings',
];

const SCHOLARSHIP_LABELS = [
  'Official status',
  'Featured',
  'Application required',
  'Study stage',
  'Student type',
  'Study level',
  'Area of study',
  'Value',
  'Selection basis',
  'Opening date',
  'Closing date',
  'Published eligibility criteria',
];

describe('the real 0efb6ee wire passes the App response boundary', () => {
  it.each(Object.keys(WIRE).filter((key) => !key.startsWith('_')))('%s parses', (name) => {
    expect(parseAskResponse(WIRE[name].response)).not.toBeNull();
  });

  it('every Course/Scholarship item becomes cards or one comparison, never refused', () => {
    for (const [name, entry] of Object.entries(WIRE)) {
      if (name.startsWith('_')) continue;
      const response = real(name);
      if (response.items.length === 0) continue;
      const rendered = toResultCards(response.items) ?? toComparisonModel(response.items);
      expect(rendered, `${name}: ${entry.question}`).not.toBeNull();
    }
  });
});

describe('field-label domain gate (published key sets only)', () => {
  it('Courses and Scholarships use exactly the key sets and labels RAG published in journey_presentation.py', () => {
    expect(toResultCards(real('courseExact').items)![0].fields.map((f) => f.label)).toEqual(
      COURSE_LABELS,
    );
    expect(
      toResultCards(real('scholarshipDiscovery').items)![0].fields.map((f) => f.label),
    ).toEqual(SCHOLARSHIP_LABELS);
  });

  it('Accommodation cards are unchanged: all 7 fixed rows still render', () => {
    expect(toResultCards(okAccommodationResultsResponse.items)![0].fields.map((f) => f.label)).toEqual([
      'Category',
      'Location',
      'Catering',
      'Advertised rate',
      'Cost period',
      'Audience',
      'Features',
    ]);
    // …and from the real 0efb6ee cross-domain journey, too.
    expect(toResultCards(real('crossAccommodation').items)![0].fields).toHaveLength(7);
  });

  it('a domain with no published key set still gets no field rows and no empty <dl>', () => {
    const models = toResultCards([unlabelledItem()]);
    expect(models![0].fields).toEqual([]);
    renderTurn({ ...okScholarshipDiscoveryResponse, items: [unlabelledItem()] });
    expect(screen.getByRole('list', { name: 'Results' }).querySelector('dl')).toBeNull();
  });

  it('refuses a key outside the domain’s published set — including another domain’s key', () => {
    const course = (real('courseExact').items as Record<string, unknown>[])[0];
    expect(toResultCards([{ ...course, fields: { closing_date: '2099-10-31' } }])).toBeNull();
    expect(toResultCards([{ ...course, fields: { catering_options: 'Catered' } }])).toBeNull();
    expect(toResultCards([unlabelledItem({ fields: { units: '6' } })])).toBeNull();
  });

  it('refuses room-rate qualifying_evidence on a non-Accommodation item', () => {
    const scholarship = (real('scholarshipDiscovery').items as Record<string, unknown>[])[0];
    expect(
      toResultCards([
        {
          ...scholarship,
          qualifying_evidence: {
            type: 'room_rate',
            room_name: 'Placeholder room',
            rate: '$1.00',
            cost_period: 'placeholder period',
            contract: null,
            inclusions: null,
            other_fees: null,
          },
        },
      ]),
    ).toBeNull();
  });

  it('a refused list falls back to the backend answer text and its sources', () => {
    const scholarship = (real('scholarshipDiscovery').items as Record<string, unknown>[])[0];
    renderTurn({ ...real('scholarshipDiscovery'), items: [{ ...scholarship, fields: { bogus: 'x' } }] });
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.getByText(/Day 5 International Computing Scholarship 1\. Official status: open/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });
});

describe('Courses (real 0efb6ee wire)', () => {
  it('exact lookup: one card with every published field, the academic year, and "Not published" for the rest', () => {
    renderTurn(real('courseExact'));
    const [card] = cards();
    expect(within(card).getByRole('link', { name: /Structured Programming/ })).toHaveAttribute(
      'href',
      'https://programsandcourses.anu.edu.au/2026/course/comp1110',
    );
    expect(cardFields(card)).toEqual([
      ['Entity type', 'course'],
      ['Code', 'COMP1110'],
      ['Academic year', '2026'],
      ['Units', '6'],
      ['Description', 'Structured programming with object-oriented design.'],
      ['Prerequisites', 'COMP1100 OR COMP1130 OR COMP1730'],
      ['Corequisites', 'Not published'],
      ['Incompatibilities', 'Not published'],
      ['Assumed knowledge', 'Not published'],
      ['Offerings', 'First Semester, 2026; In Person, Second Semester, 2026; In Person'],
    ]);
    // Not-published never reads as "No", "None" or "0".
    expect(within(card).queryByText(/^(No|None|0)$/)).not.toBeInTheDocument();
  });

  it('a single lookup is not in a ResultSet, so there is no "Ask about this" and no invented ordinal', () => {
    const response = real('courseExact');
    const [model] = toResultCards(response.items)!;
    expect([model.resultSetId, model.ordinal]).toEqual([null, null]);
    renderTurn(response);
    expect(screen.queryByRole('button', { name: /Ask about this/ })).not.toBeInTheDocument();
  });

  it('COMP1110 2025 and COMP1110 2026 stay two identities: different record ids and years', () => {
    const [y2026] = toResultCards(real('courseExact').items)!;
    const [y2025] = toResultCards(real('course2025').items)!;
    expect(y2026.canonicalId).toBe(y2025.canonicalId); // RAG's canonical_id is the bare code
    expect(y2026.recordId).not.toBe(y2025.recordId);
    expect(y2025.fields.find((f) => f.label === 'Academic year')!.value).toBe('2025');
    expect(y2025.fields.find((f) => f.label === 'Prerequisites')!.value).toBe('COMP1000');
  });

  it('follow-up and "Back to COMP1110" render the backend’s re-resolved record, not a retained App copy', () => {
    renderTurn(real('courseFollowUp'));
    expect(screen.getByText(/COMP1100 OR COMP1130 OR COMP1730/, { selector: 'dd' })).toBeInTheDocument();
    const [returned] = toResultCards(real('courseReturn').items)!;
    expect(returned.recordId).toBe('courses:course:COMP1110_2026');
  });

  it('comparison: backend rows and labels, record-keyed cells, not_published stays "Not published", no easier/harder', () => {
    const response = real('courseComparison');
    expect(response.answer_state).toBe('PARTIAL');
    renderTurn(response);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers.slice(1)).toEqual(['Structured Programming', 'Software Engineering']);
    const rowLabels = within(table).getAllByRole('rowheader').map((th) => th.textContent);
    expect(rowLabels).toEqual(COURSE_LABELS);
    const coreq = within(table).getByRole('rowheader', { name: 'Corequisites' }).closest('tr')!;
    expect(within(coreq).getAllByText('Not published')).toHaveLength(2);
    expect(document.body.textContent ?? '').not.toMatch(APP_AUTHORED_VERDICTS);
  });

  it('comparison columns key on record_id, so a same-code/different-year pair is never collapsed or refused', () => {
    const [comparison] = real('courseComparison').items as Record<string, unknown>[];
    const records = comparison.records as Record<string, unknown>[];
    const sameCode = {
      ...comparison,
      records: [records[0], { ...records[1], canonical_id: records[0].canonical_id }],
    };
    const model = toComparisonModel([sameCode]);
    expect(model).not.toBeNull();
    expect(model!.columns.map((c) => c.id)).toEqual([
      'courses:course:COMP1110_2026',
      'courses:course:COMP2120_2026',
    ]);
  });

  it('a PARTIAL comparison keeps the backend prose visible above the table', () => {
    const { container } = renderTurn(real('courseComparison'));
    expect(container.querySelector('details')).toBeNull();
  });
});

describe('Scholarships (real 0efb6ee wire)', () => {
  it('discovery: backend ResultSet order and ordinals 1–5, no App filtering or ranking', () => {
    const response = real('scholarshipDiscovery');
    renderTurn(response);
    const rendered = cards();
    const wireTitles = (response.items as { title: string }[]).map((item) => item.title);
    expect(rendered.map((card) => within(card).getByRole('link').textContent)).toEqual(wireTitles);
    expect(rendered.map(cardNumber)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('discovery is PARTIAL: the backend text stays visible, and nothing says "you are eligible"', () => {
    const response = real('scholarshipDiscovery');
    expect(response.answer_state).toBe('PARTIAL');
    const { container } = renderTurn(response);
    expect(container.querySelector('details')).toBeNull();
    expect(document.body.textContent ?? '').not.toMatch(APP_AUTHORED_VERDICTS);
  });

  it('"Ask about this" on card 2 sends the exact wire triple, never a title or a local index', async () => {
    const user = userEvent.setup();
    const onSelectResult = vi.fn();
    const response = real('scholarshipDiscovery');
    renderTurn(response, { onSelectResult });
    await user.click(within(cards()[1]).getByRole('button', { name: /Ask about this/ }));
    const second = (response.items as Record<string, unknown>[])[1];
    expect(onSelectResult.mock.calls[0][0].selectedResult).toEqual({
      result_set_id: second.result_set_id,
      canonical_id: second.canonical_id,
      ordinal: 2,
    });
  });

  it('"Show more" sends the server cursor for this ResultSet (start 6), not a fresh search', async () => {
    const user = userEvent.setup();
    const onRequestMorePage = vi.fn();
    renderTurn(real('scholarshipDiscovery'), { onRequestMorePage });
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(onRequestMorePage).toHaveBeenCalledWith({
      result_set_id: 'rs:scholarships:1',
      start_ordinal: 6,
      limit: 5,
    });
  });

  it('"the second one" shows backend ordinal 2 on its one card, not a re-numbered "1"', () => {
    renderTurn(real('scholarshipSecond'));
    const [card] = cards();
    expect(cardNumber(card)).toBe('2');
    expect(within(card).getByRole('link').textContent).toContain('Scholarship 2');
  });

  it('closing date is the stored string, verbatim — no reformatting, no invented time, no "Closed"', () => {
    renderTurn(real('scholarshipClosing'));
    const [card] = cards();
    expect(cardFields(card)).toContainEqual(['Closing date', '2026-10-31']);
    expect(document.body.textContent ?? '').not.toMatch(/\b\d{1,2}:\d{2}\s?(am|pm)\b/i);
    expect(within(card).queryByText(/\bclosed\b/i)).not.toBeInTheDocument();
  });

  it('"Am I eligible?" is PARTIAL: RAG’s non-determination stays in view, and the App adds no verdict', () => {
    const response = real('scholarshipEligibility');
    expect(response.answer_state).toBe('PARTIAL');
    const { container } = renderTurn(response);
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByText(/I cannot determine your personal eligibility/)).toBeVisible();
    expect(document.body.textContent ?? '').not.toMatch(APP_AUTHORED_VERDICTS);
    expect(screen.queryByRole('status', { name: /eligib/i })).not.toBeInTheDocument();
  });

  it('UNKNOWN: missing criteria/status/date stay "Not published", never "No", "Closed" or ineligible', () => {
    const response = real('scholarshipUnknown');
    expect(response.answer_state).toBe('UNKNOWN');
    renderTurn(response);
    const [card] = cards();
    const fields = Object.fromEntries(cardFields(card));
    expect(fields['Official status']).toBe('Not published');
    expect(fields['Closing date']).toBe('Not published');
    expect(fields['Published eligibility criteria']).toBe('Not published');
    expect(screen.getByText(/I cannot determine your personal eligibility/)).toBeVisible();
    expect(document.body.textContent ?? '').not.toMatch(APP_AUTHORED_VERDICTS);
  });

  it('refinement renders the backend’s child ResultSet exactly, including its restarted ordinals', () => {
    const response = real('scholarshipRefined');
    expect(response.answer_state).toBe('PARTIAL');
    renderTurn(response);
    expect(cards().map(cardNumber)).toEqual(['1', '2', '3', '4', '5']);
    expect(response.result_page!.result_set_id).toBe('rs:scholarships:5');
    expect(screen.getByText(/this refinement is incomplete/)).toBeVisible();
  });

  it('comparison of "the first two" of the refined set: backend labels, no App winner', () => {
    renderTurn(real('scholarshipComparison'));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('rowheader').map((th) => th.textContent)).toEqual(
      SCHOLARSHIP_LABELS,
    );
    expect(document.body.textContent ?? '').not.toMatch(APP_AUTHORED_VERDICTS);
  });

  it('continuation ("Any more?") shows backend ordinal 6 of the same ResultSet and ends the paging', () => {
    const response = real('scholarshipContinuation');
    renderTurn(response);
    expect(cards().map(cardNumber)).toEqual(['6']);
    expect(response.result_page).toMatchObject({ result_set_id: 'rs:scholarships:5', has_more: false });
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('a structured page 2 keeps the backend ordinals 6–8', () => {
    renderTurn(real('scholarshipPage2'));
    expect(cards().map(cardNumber)).toEqual(['6', '7', '8']);
  });

  /*
   * Residual RAG mismatch R1 (reported, not patched): a structured
   * `selected_result` sent with the App's "Tell me more about <title>" prefill
   * comes back as the right record but with no `result_set_id`/`ordinal` and
   * `PARTIAL`. The App renders exactly that — it never re-attaches the
   * ordinal it sent.
   */
  it('R1: renders the structured-selection response exactly as sent, without re-attaching an ordinal', () => {
    const response = real('scholarshipStructuredSelection');
    renderTurn(response);
    const [card] = cards();
    expect(within(card).getByRole('link').textContent).toContain('Scholarship 2');
    expect(cardNumber(card)).toBe('1');
    expect(screen.queryByRole('button', { name: /Ask about this/ })).not.toBeInTheDocument();
  });
});

describe('conversation_state stays opaque across a real Day 5 journey', () => {
  const JOURNEY = [
    'scholarshipDiscovery',
    'scholarshipSecond',
    'scholarshipClosing',
    'scholarshipEligibility',
    'scholarshipRefined',
    'scholarshipComparison',
    'scholarshipContinuation',
  ];

  function replay() {
    const requests: AskRequest[] = [];
    let next = 0;
    let fail = false;
    const transport = vi.fn(async (request: AskRequest) => {
      requests.push(structuredClone(request));
      if (fail) throw new TypeError('Failed to fetch');
      return real(JOURNEY[next++]);
    });
    const { result } = renderHook(() => useChatSession(transport));
    return { requests, result, failNext: (value: boolean) => (fail = value) };
  }

  it('each request echoes the previous authoritative response’s state byte-for-byte', async () => {
    const { requests, result } = replay();
    for (const name of JOURNEY) {
      await act(async () => {
        await result.current.sendMessage(WIRE[name].question);
      });
    }
    for (let i = 1; i < JOURNEY.length; i += 1) {
      expect(requests[i].conversation_state).toEqual(real(JOURNEY[i - 1]).conversation_state);
    }
  });

  it('a transport failure keeps the last valid state; Clear Chat then drops it and every stale reference', async () => {
    const { requests, result, failNext } = replay();
    await act(async () => {
      await result.current.sendMessage(WIRE.scholarshipDiscovery.question);
    });
    failNext(true);
    await act(async () => {
      await result.current.sendMessage('Tell me about the second one');
    });
    failNext(false);
    await act(async () => {
      await result.current.sendMessage('Tell me about the second one');
    });
    const held = real('scholarshipDiscovery').conversation_state;
    expect(requests[1].conversation_state).toEqual(held);
    expect(requests[2].conversation_state).toEqual(held);

    act(() => result.current.clearChat());
    expect(result.current.turns).toHaveLength(0);
    expect(result.current.pendingClarification).toBeNull();
    await act(async () => {
      await result.current.sendMessage('When does it close?');
    });
    const afterClear = requests[requests.length - 1];
    expect(afterClear.conversation_state ?? {}).not.toHaveProperty('result_sets');
    expect(afterClear.history).toEqual([]);
    expect(afterClear.selected_result).toBeUndefined();
    expect(afterClear.result_page).toBeUndefined();
  });
});

describe('legacy prose envelopes (items: []) still render safely', () => {
  it('a Course answer with no items is the backend text plus its source — no cards, no table', () => {
    renderTurn(okCourseFactResponse);
    expect(screen.getByText(/PLAC1110 \(2026\) prerequisites: placeholder text/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('the academic-year clarification sends the exact backend option id', async () => {
    const user = userEvent.setup();
    const onSelectClarification = vi.fn();
    renderTurn(needsCourseYearClarificationResponse, { onSelectClarification });
    await user.click(screen.getByRole('button', { name: 'PLAC1110 (2026)' }));
    expect(onSelectClarification.mock.calls[0][1]).toEqual({
      clarification_id: 'clar-course-plac1110-academic-year',
      option_ids: ['courses:course:PLAC1110_2026'],
    });
  });

  it('an unestablished prerequisite is a neutral unknown, not "no prerequisites"', () => {
    renderTurn(insufficientCoursePrerequisitesResponse);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByText(/no prerequisites|none required/i)).not.toBeInTheDocument();
  });

  it('eligibility prose with no items keeps the backend non-determination and adds no badge', () => {
    renderTurn(okScholarshipEligibilityResponse);
    expect(screen.getByText(/I cannot determine your personal eligibility/)).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /eligib/i })).not.toBeInTheDocument();
  });

  it('the scholarship_selection clarification sends the exact stored record id', async () => {
    const user = userEvent.setup();
    const onSelectClarification = vi.fn();
    renderTurn(needsScholarshipScopeClarificationResponse, { onSelectClarification });
    await user.click(
      screen.getByRole('button', { name: /Placeholder scholarship B — placeholder-scholarship-b/ }),
    );
    expect(onSelectClarification.mock.calls[0][1]).toEqual({
      clarification_id: 'clar-scholarship-scope',
      option_ids: ['scholarships:scholarship:placeholder-scholarship-b'],
    });
  });

  it('no matching scholarship is a neutral unknown, not an empty "No scholarships" state', () => {
    renderTurn(insufficientScholarshipFilterResponse);
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
    expect(screen.queryByText(/no scholarships (found|available)/i)).not.toBeInTheDocument();
  });
});
