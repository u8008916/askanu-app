import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DomainLauncher } from '../src/domains/DomainLauncher';
import type { DomainLauncherConfig } from '../src/domains/domainConfig';
import { StarIcon } from '../src/ui/Icon';

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
});
