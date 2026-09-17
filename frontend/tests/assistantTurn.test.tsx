import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { MOCK_SCENARIOS } from '../src/dev/mockTransport';
import { needsClarificationManyOptionsResponse } from '../src/mocks/askResponses';
import type { AskResponse, AskStatus } from '../src/types/api';

/**
 * The turn is an <li>; give it the list its markup expects. Defaults to the
 * active turn — the shape every pre-existing test in this file exercises —
 * so only tests about the lifecycle itself need to pass `isClarificationActive`.
 */
function renderTurn(
  response: AskResponse,
  onSelectClarification: (text: string) => void = vi.fn(),
  isClarificationActive = true,
) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive={isClarificationActive}
        onSelectClarification={onSelectClarification}
        response={response}
      />
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

  it('lists clarification options in contract order, as selectable controls', () => {
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

    // The student can still ignore the controls and reply in words.
    expect(
      screen.getByText(/reply in the message box/),
    ).toBeInTheDocument();
  });

  it('a single-select option fills the composer without sending', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderTurn(needsClarificationManyOptionsResponse, onSelect);

    // A single-select clarification renders real buttons, not radios.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /COMP1100/ }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('COMP1100');
  });

  it('a single-select option activates with the keyboard, not just a pointer', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderTurn(needsClarificationManyOptionsResponse, onSelect);

    const button = screen.getByRole('button', { name: /COMP1600/ });
    button.focus();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('COMP1600');
  });

  it('a multi-select checkbox toggles with the keyboard Space key', async () => {
    const user = userEvent.setup();
    const scenario = MOCK_SCENARIOS.find(
      (s) => s.id === 'needs-clarification',
    )!;
    renderTurn(scenario.response);

    const checkbox = screen.getByRole('checkbox', { name: /COMP1110/ });
    checkbox.focus();
    expect(checkbox).toHaveFocus();
    await user.keyboard(' ');

    expect(checkbox).toBeChecked();
  });

  it('a multi-select clarification builds "both" from two checked options', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const scenario = MOCK_SCENARIOS.find(
      (s) => s.id === 'needs-clarification',
    )!;
    renderTurn(scenario.response, onSelect);

    const useSelection = screen.getByRole('button', { name: 'Use selection' });
    expect(useSelection).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /COMP1110/ }));
    await user.click(screen.getByRole('checkbox', { name: /COMP1600/ }));
    expect(useSelection).toBeEnabled();

    await user.click(useSelection);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(
      'Both COMP1110 and COMP1600',
    );
  });

  it('a multi-select clarification also supports picking exactly one', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const scenario = MOCK_SCENARIOS.find(
      (s) => s.id === 'needs-clarification',
    )!;
    renderTurn(scenario.response, onSelect);

    await user.click(screen.getByRole('checkbox', { name: /COMP1110/ }));
    await user.click(screen.getByRole('button', { name: 'Use selection' }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('COMP1110');
  });

  /*
   * `isClarificationActive` is how ChatPanel tells an older, resolved or
   * superseded clarification turn from the one `useChatSession` still
   * considers pending. A single AssistantTurn can't exercise the "resolved by
   * a later turn" lifecycle itself — that is `clarificationLifecycle.test.tsx`
   * — but it owns what an inactive turn renders like on its own.
   */
  it('an inactive single-select clarification disables its buttons and drops the prompt', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderTurn(
      needsClarificationManyOptionsResponse,
      onSelect,
      /* isClarificationActive */ false,
    );

    const button = screen.getByRole('button', { name: /COMP1100/ });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSelect).not.toHaveBeenCalled();

    // No message-box prompt: it would invite an answer to a turn no reply can reach.
    expect(
      screen.queryByText(/reply in the message box/),
    ).not.toBeInTheDocument();
    // The options themselves are still shown as conversation history.
    expect(screen.getByText('COMP1100')).toBeInTheDocument();
  });

  it('an inactive multi-select clarification disables its checkboxes and hides "Use selection"', () => {
    const scenario = MOCK_SCENARIOS.find(
      (s) => s.id === 'needs-clarification',
    )!;
    renderTurn(scenario.response, vi.fn(), /* isClarificationActive */ false);

    expect(screen.getByRole('checkbox', { name: /COMP1110/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /COMP1600/ })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Use selection' }),
    ).not.toBeInTheDocument();
  });

  /*
   * Day 11 V6 breadth audit: every earlier clarification fixture used exactly
   * two options. A broad course-catalogue search can plausibly match many
   * similarly-named courses, so the read-only option list must show every
   * option the service sends, in order, not a two-item assumption baked into
   * the component.
   */
  it('lists every option for a broad clarification, in contract order', () => {
    renderTurn(needsClarificationManyOptionsResponse);

    const options = within(
      screen.getByRole('list', { name: 'Clarification options' }),
    ).getAllByRole('listitem');
    expect(options).toHaveLength(
      needsClarificationManyOptionsResponse.clarification!.options.length,
    );
    expect(options.length).toBeGreaterThan(2);
    options.forEach((option, index) => {
      expect(option).toHaveTextContent(
        needsClarificationManyOptionsResponse.clarification!.options[index].label,
      );
    });
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
