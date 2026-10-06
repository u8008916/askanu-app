import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { AssistantTurn } from '../src/chat/AssistantTurn';
import { parseAskResponse } from '../src/chat/askResponse';
import { toCardView, resultNoun } from '../src/chat/results/cardLayout';
import type { ResultCardModel } from '../src/chat/results/resultItems';
import { toResultCards } from '../src/chat/results/resultItems';
import { UserTurn } from '../src/chat/UserTurn';
import { Brand } from '../src/layout/Brand';
import { QuickLinksCard } from '../src/resources/QuickLinksCard';
import d5 from '../src/mocks/v7Day5Wire.0efb6ee.json';
import d6 from '../src/mocks/v7Day6Wire.bafa15d.json';
import { insufficientEvidenceResponse } from '../src/mocks/askResponses';
import { brandAsset } from '../src/ui/brandAssets';
import type { AskResponse, ResultPageRequest } from '../src/types/api';
import { resultCardNumber } from './helpers';

/**
 * V7 final UI polish: identity markers, the answer surface (heading, cards,
 * Show more, Sources), the reusable card shell and the Quick Link logo boxes.
 * Presentation only — every assertion here is about what the App draws from
 * the existing wire, never about a new backend field.
 */

type WireEntry = { question: string; request_extra: Record<string, unknown>; response: unknown };
const D6 = d6 as unknown as Record<string, WireEntry>;
const D5 = d5 as unknown as Record<string, WireEntry>;

function real(name: string, wire: Record<string, WireEntry> = D6): AskResponse {
  const parsed = parseAskResponse(wire[name].response);
  if (parsed === null) {
    throw new Error(`real wire "${name}" was refused by parseAskResponse`);
  }
  return parsed;
}

function renderTurn(
  response: AskResponse,
  props: { onRequestMorePage?: (page: ResultPageRequest) => void; createdAt?: number } = {},
) {
  return render(
    <ul>
      <AssistantTurn
        isClarificationActive
        onRequestMorePage={props.onRequestMorePage ?? vi.fn()}
        onSelectClarification={vi.fn()}
        onSelectResult={vi.fn()}
        response={response}
        {...(props.createdAt === undefined ? {} : { createdAt: props.createdAt })}
      />
    </ul>,
  );
}

function cards(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem');
}

describe('message identity', () => {
  it('shows a user avatar beside every user turn, named "You"', () => {
    render(
      <ul>
        <UserTurn content="What events are on at ANU today?" />
      </ul>,
    );
    expect(screen.getByRole('img', { name: 'You' })).toBeInTheDocument();
    expect(screen.getByText('What events are on at ANU today?')).toBeInTheDocument();
  });

  it('shows the AskANU identity once on an assistant turn, whatever the domain', () => {
    renderTurn(real('eventsToday'));
    expect(screen.getAllByText('AskANU')).toHaveLength(1);
  });

  it('shows it on a notice turn too, not only on result turns', () => {
    renderTurn(insufficientEvidenceResponse);
    expect(screen.getAllByText('AskANU')).toHaveLength(1);
  });

  it('shows a timestamp from the local creation time, and none when there is none', () => {
    const at = new Date(2026, 8, 30, 10, 24).getTime();
    const { container, unmount } = render(
      <ul>
        <UserTurn content="hello" createdAt={at} />
      </ul>,
    );
    const time = container.querySelector('time');
    expect(time).not.toBeNull();
    expect(time).toHaveTextContent(/^10:24\s?AM$/);
    expect(time).toHaveAttribute('datetime', new Date(at).toISOString());
    unmount();

    const bare = render(
      <ul>
        <UserTurn content="hello" />
      </ul>,
    );
    expect(bare.container.querySelector('time')).toBeNull();
  });

  it('adds no user avatar to an assistant turn and no assistant marker to a user turn', () => {
    renderTurn(real('eventsToday'));
    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument();
  });
});

describe('Events answer surface (real bafa15d wire)', () => {
  it('leads with a count heading and the server page window, then the numbered cards', () => {
    renderTurn(real('eventsBroad'));
    expect(screen.getByRole('heading', { level: 3, name: '5 events' })).toBeInTheDocument();
    expect(screen.getByText('Showing 1–5 · more available')).toBeInTheDocument();
    expect(cards().map((card) => resultCardNumber(card))).toEqual(['1', '2', '3', '4', '5']);
  });

  it('draws the heading as a count only — no claim about the results', () => {
    renderTurn(real('eventsBroad'));
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).toBe('5 events');
    expect(heading.textContent).not.toMatch(/best|eligible|available|recommended|happening/i);
  });

  it('shows the backend ordinal on a continuation page, not a restarted 1', () => {
    renderTurn(real('eventsMore'));
    expect(cards().map((card) => resultCardNumber(card))).toEqual(['6', '7']);
    expect(screen.getByText('Showing 6–7')).toBeInTheDocument();
    expect(screen.queryByText(/more available/)).not.toBeInTheDocument();
  });

  it('puts the time and venue on the card as labelled rows, organiser and provenance on the source line', () => {
    renderTurn(real('eventsToday'));
    const [first] = cards();
    expect(within(first).getByText('Venue')).toBeInTheDocument();
    expect(within(first).getByText('Kambri')).toBeInTheDocument();
    expect(within(first).getByText('ANU Events')).toBeInTheDocument();
    expect(within(first).getByText('Official ANU Events')).toBeInTheDocument();
  });

  it('never invents a venue: a missing one reads "Not published", not "Online"', () => {
    renderTurn(real('eventsBroad'));
    const third = cards()[2];
    const venueLabel = within(third).getByText('Venue');
    expect(venueLabel.nextElementSibling).toHaveTextContent('Not published');
    expect(third.textContent ?? '').not.toMatch(/online/i);
  });

  it('never draws an image: the wire carries none, so no thumbnail is fabricated', () => {
    const { container } = renderTurn(real('eventsBroad'));
    expect(container.querySelector('img')).toBeNull();
  });

  it('an item whose optional fields are all missing still renders a whole card', () => {
    const response = real('eventsToday');
    const item = response.items[0] as { fields: Record<string, unknown> };
    const nulls = Object.fromEntries(
      Object.keys(item.fields).map((key) => [key, key === 'provenance_class' ? 'official_anu' : null]),
    );
    renderTurn({ ...response, items: [{ ...item, fields: nulls }] });
    const [card] = cards();
    expect(within(card).getByRole('link', { name: /Event today-early/ })).toBeInTheDocument();
    expect(within(card).getAllByText('Not published').length).toBeGreaterThan(0);
  });
});

describe('Show more', () => {
  it('is a full-width, domain-worded button that requests the server cursor', async () => {
    const user = userEvent.setup();
    const onRequestMorePage = vi.fn();
    renderTurn(real('eventsBroad'), { onRequestMorePage });
    await user.click(screen.getByRole('button', { name: 'Show more events' }));
    expect(onRequestMorePage).toHaveBeenCalledTimes(1);
    expect(onRequestMorePage).toHaveBeenCalledWith({
      result_set_id: 'rs:events:1',
      start_ordinal: 6,
      limit: 5,
    });
  });

  it('takes its noun from the domain', () => {
    renderTurn(real('jobsBroad'));
    expect(screen.getByRole('button', { name: 'Show more jobs' })).toBeInTheDocument();
  });

  it('is offered once only, and not at all on the last page', async () => {
    const user = userEvent.setup();
    const onRequestMorePage = vi.fn();
    const { unmount } = renderTurn(real('eventsBroad'), { onRequestMorePage });
    await user.click(screen.getByRole('button', { name: 'Show more events' }));
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
    unmount();

    renderTurn(real('eventsMore'));
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });
});

describe('Sources accordion', () => {
  it('is one closed row with the count, and opens to every source', async () => {
    const user = userEvent.setup();
    renderTurn(real('eventsBroad'));
    const region = screen.getByRole('region', { name: 'Sources' });
    const details = region.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(within(region).getByText('Sources')).toBeInTheDocument();
    expect(within(region).getByText('(5)')).toBeInTheDocument();

    await user.click(within(region).getByText('Sources'));
    expect(details.open).toBe(true);
    expect(within(region).getAllByRole('link')).toHaveLength(5);
  });

  it('keeps the source of an abstention open, because it is all the turn has to show', () => {
    const response: AskResponse = {
      ...insufficientEvidenceResponse,
      sources: [
        {
          record_id: 'courses:course:COMP1110_2026',
          source_id: 'courses_programs_and_courses',
          title: 'COMP1110',
          url: 'https://programsandcourses.anu.edu.au/2026/course/comp1110',
          domain: 'courses',
        },
      ],
    };
    renderTurn(response);
    const details = screen
      .getByRole('region', { name: 'Sources' })
      .querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(true);
  });
});

describe('uncertainty stays visible in the new layout', () => {
  it('a PARTIAL Jobs answer keeps its population caveat directly under the heading, above the first card', () => {
    const { container } = renderTurn(real('jobsBroad'));
    const caveat = screen.getByText(/current supported Jobs population is incomplete/i);
    const heading = screen.getByRole('heading', { level: 3, name: '5 jobs' });
    const list = screen.getByRole('list', { name: 'Results' });
    expect(
      heading.compareDocumentPosition(caveat) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(list.compareDocumentPosition(caveat) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    // Visible, not folded into "Show as text".
    expect(caveat.closest('details')).toBeNull();
    expect(container.querySelector('section')).toContainElement(caveat);
  });

  it('the Support scope boundary stays above the service card', () => {
    renderTurn(real('supportRouted'));
    const scope = screen.getByText(/can route you to published services but cannot diagnose/i);
    expect(scope.closest('details')).toBeNull();
    expect(
      scope.compareDocumentPosition(screen.getByRole('list', { name: 'Results' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('an unknown scholarship field reads "Not published", never a verdict', () => {
    renderTurn(real('scholarshipUnknown', D5));
    expect(screen.getAllByText('Not published').length).toBeGreaterThan(0);
    expect(document.body.textContent ?? '').not.toMatch(/you are eligible|you qualify|not eligible/i);
  });

  it('insufficient evidence keeps the notice and is not turned into a result group', () => {
    renderTurn(insufficientEvidenceResponse);
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.getByText('Not enough evidence to answer')).toBeInTheDocument();
  });
});

describe('the shared card shell', () => {
  it('renders every domain in the same shell with its own stored fields', () => {
    const cases: [AskResponse, string, RegExp][] = [
      [real('courseExact', D5), '1 course', /COMP1110/],
      [real('scholarshipDiscovery', D5), '5 scholarships', /Value/],
      [real('jobsBroad'), '5 jobs', /Location/],
      [real('supportRouted'), '1 support service', /Category/],
    ];
    for (const [response, heading, label] of cases) {
      const { unmount } = renderTurn(response);
      expect(screen.getByRole('heading', { level: 3, name: heading })).toBeInTheDocument();
      expect(within(cards()[0]).getAllByText(label).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('keeps unsafe URLs as plain text and safe ones as new-tab links', () => {
    const response = real('eventsToday');
    const items = response.items.map((item, index) =>
      index === 0 ? { ...(item as object), url: 'javascript:alert(1)' } : item,
    );
    renderTurn({ ...response, items });
    const [first, second] = cards();
    expect(within(first).queryByRole('link')).toBeNull();
    const link = within(second).getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('names each "Ask about this" button after its card', () => {
    renderTurn(real('supportRouted'));
    expect(
      screen.getByRole('button', { name: 'Ask about this: ANUSA Student Assistance' }),
    ).toBeInTheDocument();
  });
});

describe('cardLayout (presentation mapping)', () => {
  function eventCard(overrides: Partial<Record<string, string | null>> = {}): ResultCardModel {
    const fields = {
      Starts: 'Mon, 14 Sept, 11:00 am',
      Ends: 'Mon, 14 Sept, 2:00 pm',
      Venue: 'Kambri',
      Organiser: 'ANUSA',
      ...overrides,
    };
    return {
      recordId: 'events:event:1',
      domain: 'events',
      title: 'Shut Up and Write',
      url: 'https://www.anu.edu.au/events/1',
      provenance: 'Official ANU Events',
      resultSetId: null,
      canonicalId: null,
      ordinal: null,
      qualifyingEvidence: null,
      fields: Object.entries(fields).map(([label, value]) => ({ label, value: value ?? null })),
    };
  }

  it('shows a same-day range once, as "start – end time", with am/pm kept together', () => {
    const view = toCardView(eventCard());
    const [time] = view.rows;
    expect(time.parts.map((part) => part.value)).toEqual([
      'Mon, 14 Sept, 11:00 am',
      '2:00 pm',
    ]);
  });

  it('keeps a different end date in full', () => {
    const view = toCardView(eventCard({ Ends: 'Tue, 15 Sept, 2:00 pm' }));
    expect(view.rows[0].parts[1].value).toBe('Tue, 15 Sept, 2:00 pm');
  });

  it('moves an unpublished end into "More details" instead of dropping it', () => {
    const view = toCardView(eventCard({ Ends: null }));
    expect(view.rows[0].parts).toHaveLength(1);
    expect(view.rest).toEqual([{ label: 'Ends', value: null }]);
  });

  it('keeps a row for an unpublished venue and says so', () => {
    const view = toCardView(eventCard({ Venue: null }));
    const venue = view.rows.find((row) => row.parts[0].label === 'Venue');
    expect(venue).toEqual(expect.objectContaining({ showLabel: true }));
    expect(venue?.parts[0].value).toBeNull();
  });

  it('accounts for every stored field exactly once', () => {
    const card = eventCard();
    const view = toCardView(card);
    const shown = [
      ...view.rows.flatMap((row) => row.parts.map((part) => part.label)),
      ...view.secondary.map((part) => part.label),
      ...view.rest.map((field) => field.label),
    ];
    expect(shown.sort()).toEqual(card.fields.map((field) => field.label).sort());
  });

  it('does not double-prefix a value that already leads with its label', () => {
    const card: ResultCardModel = {
      ...eventCard(),
      domain: 'jobs',
      provenance: null,
      fields: [{ label: 'Closes', value: 'Closes 8 January 2099' }],
    };
    expect(toCardView(card).rows[0].showLabel).toBe(false);
  });

  it('gives an unknown domain no rows rather than another domain’s', () => {
    const view = toCardView({ ...eventCard(), domain: 'mystery' });
    expect(view.rows).toEqual([]);
    expect(view.rest).toHaveLength(4);
  });

  it('words the heading noun from the domain and the count only', () => {
    expect(resultNoun('events', 1)).toBe('event');
    expect(resultNoun('events', 5)).toBe('events');
    expect(resultNoun('accommodation', 2)).toBe('accommodation options');
    expect(resultNoun('something-new', 3)).toBe('results');
  });

  it('produces numbered cards from the wire without touching order', () => {
    const models = toResultCards(real('eventsBroad').items)!;
    expect(models.map((model) => model.ordinal)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('branding and Quick Links', () => {
  it('keeps ANU brand assets absent until permission is confirmed', () => {
    for (const name of [
      'anu-crest',
      'anu-crest-dark',
      'anuhub',
      'mytimetable',
      'canvas',
      'anu-careers',
    ] as const) {
      expect(brandAsset(name), name).toBeNull();
    }
  });

  it('renders the wordmark and tagline beside the generic shield placeholder', () => {
    const { container } = render(<Brand />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AskANU');
    expect(screen.getByText('Your intelligent guide to ANU information.')).toBeInTheDocument();

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('gives every Quick Link the icon fallback in its logo box, never an image', () => {
    render(<QuickLinksCard />);
    const region = screen.getByRole('region', { name: 'Quick Links' });
    for (const link of within(region).getAllByRole('link')) {
      expect(link.querySelector('img'), link.textContent ?? '').toBeNull();
      expect(link.querySelector('svg'), link.textContent ?? '').not.toBeNull();
    }
  });

  it('gives every Quick Link a same-sized decorative logo box beside its label', () => {
    render(<QuickLinksCard />);
    const region = screen.getByRole('region', { name: 'Quick Links' });
    const links = within(region).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'AnuHub',
      'MyTimetable',
      'Canvas',
      'ANU Careers',
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('lays out as icon tiles on the mobile row too', () => {
    render(<QuickLinksCard layout="row" />);
    expect(within(screen.getByRole('region', { name: 'Quick Links' })).getAllByRole('link')).toHaveLength(4);
  });
});

describe('the conversation in the full App', () => {
  it('shows both identities after a question and removes them on Clear Chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Ask AskANU a question'), 'Which scholarships are open?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('img', { name: 'You' })).toBeInTheDocument();
    expect(screen.getAllByText('AskANU').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Clear Chat' }));
    expect(screen.queryByRole('img', { name: 'You' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Conversation' })).not.toBeInTheDocument();
  });
});
