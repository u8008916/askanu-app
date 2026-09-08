import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { MOCK_SCENARIOS } from '../src/dev/mockTransport';
import type { AskResponse, AskStatus } from '../src/types/api';

/** The turn is an <li>; give it the list its markup expects. */
function renderTurn(response: AskResponse) {
  return render(
    <ul>
      <AssistantTurn response={response} />
    </ul>,
  );
}

const FROZEN_STATUSES: AskStatus[] = [
  'ok',
  'partial',
  'needs_clarification',
  'insufficient_evidence',
  'off_topic',
  'error',
];

describe('AssistantTurn', () => {
  it('covers every status in the frozen enum with a fixture', () => {
    const covered = new Set(
      MOCK_SCENARIOS.map((scenario) => scenario.response.status),
    );
    expect([...FROZEN_STATUSES].sort()).toEqual([...covered].sort());
  });

  it.each(FROZEN_STATUSES)('renders a non-empty turn for %s', (status) => {
    const scenario = MOCK_SCENARIOS.find((s) => s.response.status === status);
    const { container } = renderTurn(scenario!.response);

    const turn = container.querySelector('li');
    expect(turn).not.toBeNull();
    expect(turn!.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('shows the answer and its sources for ok', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'ok-multi')!;
    renderTurn(scenario.response);

    expect(
      screen.getByText(/Placeholder answer text drawing on more than one/),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('renders partial exactly like ok, with answer and sources', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'partial')!;
    renderTurn(scenario.response);

    expect(screen.getByText(scenario.response.answer)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('lists clarification options in contract order, not as controls', () => {
    const scenario = MOCK_SCENARIOS.find(
      (s) => s.id === 'needs-clarification',
    )!;
    renderTurn(scenario.response);

    const options = within(
      screen.getByRole('list', { name: 'Clarification options' }),
    ).getAllByRole('listitem');
    const labels = options.map((item) => item.textContent);
    // Order backs `first` / `second`.
    expect(labels[0]).toContain('COMP1110');
    expect(labels[1]).toContain('COMP1600');

    // Selectable controls are Day 13. Today the student replies in words.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Reply in the message box/),
    ).toBeInTheDocument();
  });

  it.each(['insufficient', 'off-topic'] as const)(
    'presents %s compactly and without error styling',
    (id) => {
      const scenario = MOCK_SCENARIOS.find((s) => s.id === id)!;
      renderTurn(scenario.response);

      expect(screen.getByText(scenario.response.answer)).toBeInTheDocument();
      // These fixtures carry no evidence, so there is no source block to show.
      expect(scenario.response.sources).toHaveLength(0);
      expect(
        screen.queryByRole('region', { name: 'Sources' }),
      ).not.toBeInTheDocument();
      // An abstention is correct behaviour, not a fault: it is not announced
      // as an alert.
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  /*
   * Regression, found during Day 3 integration against the real RAG service.
   *
   * "What are the prerequisites for COMP1110?" returns `insufficient_evidence`
   * together with the stored Programs and Courses record: the evidence exists,
   * it just does not establish the prerequisites. The turn previously rendered
   * the notice alone and dropped the source, which lost provenance the backend
   * had supplied and left the student with no official ANU link to check.
   */
  it('still shows evidence when an abstention carries sources', () => {
    renderTurn({
      status: 'insufficient_evidence',
      answer:
        'The stored evidence for COMP1110 (2026) does not establish its prerequisites.',
      items: [],
      sources: [
        {
          record_id: 'courses:course:COMP1110_2026',
          source_id: 'courses_programs_and_courses',
          title: 'COMP1110 representative fixture',
          url: 'https://programsandcourses.anu.edu.au/2026/course/COMP1110',
          domain: 'courses',
        },
      ],
      clarification: null,
      request_id: 'req_abstention_with_evidence',
    });

    const sources = screen.getByRole('region', { name: 'Sources' });
    const link = within(sources).getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      'https://programsandcourses.anu.edu.au/2026/course/COMP1110',
    );
    // Abstaining is still not a fault.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces the error state', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'error')!;
    renderTurn(scenario.response);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(scenario.response.answer)).toBeInTheDocument();
  });

  it('never renders a blank turn for an envelope with nothing to show', () => {
    const { container } = renderTurn({
      status: 'ok',
      answer: '   ',
      items: [],
      sources: [],
      clarification: null,
      request_id: 'req_empty',
    });

    expect(container.querySelector('li')!.textContent!.trim()).not.toBe('');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows no timestamp and no request_id', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'ok')!;
    const { container } = renderTurn(scenario.response);

    expect(container.textContent).not.toContain(scenario.response.request_id);
    expect(container.querySelector('time')).toBeNull();
  });
  /*
   * Day 4: a grounded answer arrives with structure — paragraphs, lists and
   * `**label**` emphasis. The turn must show that structure while keeping the
   * information hierarchy V3 fixed: answer, then clarification, then evidence.
   */
  it('renders a grounded answer as paragraphs and real lists', () => {
    const scenario = MOCK_SCENARIOS.find((s) => s.id === 'grounded')!;
    const { container } = renderTurn(scenario.response);

    // Scope inside the turn: renderTurn's own <ul> wrapper is not the answer.
    const turn = container.querySelector('li')!;
    expect(turn.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);

    const bullets = [...turn.querySelectorAll('ul')].find((list) =>
      list.textContent!.includes('First placeholder list item.'),
    )!;
    expect(within(bullets).getAllByRole('listitem')).toHaveLength(3);

    // The source block is an <ol> as well, so pick the list by its content.
    const numbered = [...turn.querySelectorAll('ol')].find((list) =>
      list.textContent!.includes('First placeholder step.'),
    )!;
    expect(within(numbered).getAllByRole('listitem')).toHaveLength(2);

    // Emphasis is a <strong> element built from parsed text, not parsed markup.
    const strong = container.querySelector('strong')!;
    expect(strong.textContent).toBe('Placeholder label:');

    // Markers are structure, not content: they are not printed.
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).not.toContain('- First placeholder');
  });

  it('keeps the hierarchy: answer, then clarification, then sources', () => {
    const { container } = renderTurn({
      status: 'needs_clarification',
      answer: 'Do you mean the first or the second?\n\n- one\n- two',
      items: [],
      sources: [
        {
          record_id: 'course:hierarchy:1',
          source_id: 'programs-and-courses',
          title: 'Placeholder record title',
          url: 'https://example.invalid/placeholder',
          domain: 'courses',
        },
      ],
      clarification: {
        id: 'clar-hierarchy',
        type: 'entity_selection',
        options: [
          { id: 'a', label: 'First option' },
          { id: 'b', label: 'Second option' },
        ],
        allow_multiple: false,
      },
      request_id: 'req_hierarchy',
    });

    const text = container.textContent!;
    expect(text.indexOf('Do you mean')).toBeLessThan(text.indexOf('First option'));
    expect(text.indexOf('First option')).toBeLessThan(text.indexOf('Sources'));
  });

  it('keeps a multi-paragraph abstention compact and structured', () => {
    const { container } = renderTurn({
      status: 'insufficient_evidence',
      answer: 'First line of the service message.\n\nSecond line.',
      items: [],
      sources: [],
      clarification: null,
      request_id: 'req_multiline_abstention',
    });

    // Two paragraphs plus the notice heading, not one run-together block.
    expect(container.querySelectorAll('p')).toHaveLength(3);
    expect(screen.getByText('Second line.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
