import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DomainLauncher } from '../src/domains/DomainLauncher';
import {
  ACCOMMODATION_DOMAIN,
  COURSES_DOMAIN,
  EVENTS_DOMAIN,
  JOBS_DOMAIN,
  SCHOLARSHIPS_DOMAIN,
  SUPPORT_DOMAIN,
} from '../src/domains/domainConfig';
import type { DomainLauncherConfig } from '../src/domains/domainConfig';
import { StarIcon } from '../src/ui/Icon';
import { isSafeHttpUrl } from '../src/util/safeUrl';

/** A throwaway domain: proves the launcher is config-driven, not Courses-shaped. */
const DEMO_DOMAIN: DomainLauncherConfig = {
  id: 'demo',
  title: 'Demo domain',
  intro: 'An intro line.',
  Icon: StarIcon,
  questions: [
    {
      id: 'one',
      title: 'First question?',
      description: 'First description.',
      prompt: 'First prompt text',
      Icon: StarIcon,
    },
    {
      id: 'two',
      title: 'Second question?',
      description: 'Second description.',
      prompt: 'Second prompt text',
      Icon: StarIcon,
    },
    {
      id: 'three',
      title: 'Third question?',
      description: 'Third description.',
      prompt: 'Third prompt text',
      Icon: StarIcon,
    },
  ],
  resourcesTitle: 'Official demo resources',
  resources: [
    { label: 'Safe link', href: 'https://example.anu.edu.au/page' },
    { label: 'Unsafe link', href: 'javascript:alert(1)' },
  ],
  resourcesNote: 'Opens in a new tab.',
};

describe('DomainLauncher', () => {
  it('renders header, cards and resources from config', () => {
    render(<DomainLauncher config={DEMO_DOMAIN} onSelectQuestion={() => {}} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Demo domain' })).toBeInTheDocument();
    expect(screen.getByText('An intro line.')).toBeInTheDocument();

    const questions = screen.getByRole('region', { name: 'Recommended questions' });
    expect(within(questions).getAllByRole('button')).toHaveLength(3);
    expect(within(questions).getByText(/pre-filled prompt/)).toBeInTheDocument();

    const resources = screen.getByRole('region', { name: 'Official demo resources' });
    expect(within(resources).getByText('Opens in a new tab.')).toBeInTheDocument();
  });

  it('hands the card prompt, not the title, to the callback', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DomainLauncher config={DEMO_DOMAIN} onSelectQuestion={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Second question/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('Second prompt text');
  });

  it('cards are reachable by Tab in order and activate with Enter and Space', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DomainLauncher config={DEMO_DOMAIN} onSelectQuestion={onSelect} />);

    await user.tab();
    expect(document.activeElement).toHaveTextContent('First question?');
    await user.keyboard('{Enter}');

    await user.tab();
    expect(document.activeElement).toHaveTextContent('Second question?');
    await user.keyboard(' ');

    await user.tab();
    expect(document.activeElement).toHaveTextContent('Third question?');

    expect(onSelect.mock.calls).toEqual([['First prompt text'], ['Second prompt text']]);
  });

  it('renders only safe https resources as links, the rest as text', () => {
    render(<DomainLauncher config={DEMO_DOMAIN} onSelectQuestion={() => {}} />);

    const resources = screen.getByRole('region', { name: 'Official demo resources' });
    const links = within(resources).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.anu.edu.au/page');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0].getAttribute('rel')).toContain('noopener');

    // The unsafe entry is still visible but is not an anchor.
    expect(within(resources).getByText('Unsafe link').closest('a')).toBeNull();
  });

  it('contains no chat input', () => {
    render(<DomainLauncher config={DEMO_DOMAIN} onSelectQuestion={() => {}} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders a long card title and a long resource label without clipping', async () => {
    const longTitle =
      'A recommended question whose title is deliberately long enough to wrap onto several lines inside a card at 360px?';
    const longLabel =
      'An official resource label long enough to wrap in the compact resources row';
    const longHref =
      'https://example.anu.edu.au/a/very/long/path/segment-that-has-no-spaces-and-must-not-widen-the-page/at-all';
    const config: DomainLauncherConfig = {
      ...DEMO_DOMAIN,
      questions: [{ ...DEMO_DOMAIN.questions[0], title: longTitle }],
      resources: [{ label: longLabel, href: longHref }],
    };
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DomainLauncher config={config} onSelectQuestion={onSelect} />);

    const card = screen.getByRole('button', { name: new RegExp(longTitle.slice(0, 30)) });
    expect(card).toHaveTextContent(longTitle);
    await user.click(card);
    expect(onSelect).toHaveBeenCalledWith(DEMO_DOMAIN.questions[0].prompt);

    const link = screen.getByRole('link', { name: longLabel });
    expect(link).toHaveAttribute('href', longHref);
  });
});

/**
 * All six shipped domains through the one component. Anything that holds
 * for all six is a property of the shared launcher, not of a page. Support
 * is included symmetrically with the other four (Qasim, Day 12 review) even
 * though its official resources span two approved hosts, not one — see the
 * host check below.
 */
describe.each([
  ['Courses', COURSES_DOMAIN],
  ['Scholarships', SCHOLARSHIPS_DOMAIN],
  ['Jobs', JOBS_DOMAIN],
  ['Accommodation', ACCOMMODATION_DOMAIN],
  ['Support Services', SUPPORT_DOMAIN],
  ['Events', EVENTS_DOMAIN],
])('DomainLauncher — %s config', (_name, config) => {
  it('has four cards, each prompt non-empty and distinct', () => {
    render(<DomainLauncher config={config} onSelectQuestion={() => {}} />);

    const cards = within(
      screen.getByRole('region', { name: 'Recommended questions' }),
    ).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(config.questions).toHaveLength(4);
    const prompts = config.questions.map((q) => q.prompt.trim());
    expect(prompts.every((p) => p.length > 0)).toBe(true);
    expect(new Set(prompts).size).toBe(4);
    expect(new Set(config.questions.map((q) => q.id)).size).toBe(4);
  });

  it('Tab reaches every card in order, then the official links', async () => {
    const user = userEvent.setup();
    render(<DomainLauncher config={config} onSelectQuestion={() => {}} />);

    for (const question of config.questions) {
      await user.tab();
      expect(document.activeElement).toHaveTextContent(question.title);
    }
    for (const resource of config.resources) {
      await user.tab();
      expect(document.activeElement).toHaveAttribute('href', resource.href);
    }
  });

  it('every official resource is a safe https ANU/ANUSA link that opens in a new tab', () => {
    render(<DomainLauncher config={config} onSelectQuestion={() => {}} />);

    const links = within(
      screen.getByRole('region', { name: config.resourcesTitle }),
    ).getAllByRole('link');
    expect(links).toHaveLength(config.resources.length);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(isSafeHttpUrl(href)).toBe(true);
      const { protocol, hostname } = new URL(href);
      expect(protocol).toBe('https:');
      // V3 approves ANUSA Student Assistance alongside ANU's own domains for
      // Support; every other domain is *.anu.edu.au only.
      expect(hostname === 'anusa.com.au' || hostname.endsWith('.anu.edu.au')).toBe(
        true,
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('shows no invented data in card copy', () => {
    render(<DomainLauncher config={config} onSelectQuestion={() => {}} />);

    const region = screen.getByRole('region', { name: 'Recommended questions' });
    expect(within(region).queryByText(/\$[\d,]+/)).not.toBeInTheDocument();
    expect(
      within(region).queryByText(
        /\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
      ),
    ).not.toBeInTheDocument();
    // V6 Day 12: no card may imply a live vacancy check or a support hotline
    // promise — those facts, if any, must come from the backend, never here.
    expect(within(region).queryByText(/vacan(t|cy)|room(s)? available/i)).not.toBeInTheDocument();
    expect(within(region).queryByText(/24\/7|hotline|guaranteed response/i)).not.toBeInTheDocument();
    // V6 Day 12 review (Qasim): card/intro copy must not promise broader
    // persisted coverage than what is actually stored — the Support universe
    // is the six ANUSA Student Assistance categories only, not every ANU or
    // ANUSA service.
    expect(screen.queryByText(/ANU or ANUSA/i)).not.toBeInTheDocument();
  });
});
