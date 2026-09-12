import type { ComponentType } from 'react';
import {
  CalendarCheckIcon,
  CoursesIcon,
  DocumentIcon,
  PersonIcon,
  ScholarshipsIcon,
} from '../ui/Icon';

export type DomainIcon = ComponentType<{ size?: number; className?: string }>;

/**
 * A guided intent, not an answer. Choosing it places `prompt` in the single
 * chat composer for the student to edit and send — nothing is sent on click.
 */
export interface RecommendedQuestion {
  id: string;
  title: string;
  description: string;
  /** The text placed in the composer. Editable before sending. */
  prompt: string;
  Icon: DomainIcon;
}

/** An official ANU entry point. Must be a verified `https://` URL. */
export interface OfficialResource {
  label: string;
  href: string;
}

/**
 * Everything a domain launcher page needs. Adding a domain is a new config
 * plus a route, not a new page implementation.
 */
export interface DomainLauncherConfig {
  id: string;
  title: string;
  intro: string;
  Icon: DomainIcon;
  questions: RecommendedQuestion[];
  /** Heading for the official-resources section, announced as the region name. */
  resourcesTitle: string;
  resources: OfficialResource[];
  /** Short note under the resources, e.g. which host the links open. */
  resourcesNote?: string;
}

/**
 * Courses.
 *
 * V3/V5 restrict the Courses domain to `programsandcourses.anu.edu.au`. Every
 * URL below was opened and confirmed to return HTTP 200 on Day 5 and is
 * reachable from the site's own navigation — none is a guessed address. See
 * docs/evidence/DAY_05_COURSES_PAGE.md.
 */
export const COURSES_DOMAIN: DomainLauncherConfig = {
  id: 'courses',
  title: 'Courses',
  intro:
    'Get help with ANU courses through AskANU. Choose a question below to start a chat, or explore official resources.',
  Icon: CoursesIcon,
  questions: [
    {
      id: 'degree-requirements',
      title: 'What courses do I need for my degree?',
      description: 'Get help with course requirements for your degree at ANU.',
      prompt: 'What courses do I need for my degree?',
      Icon: ScholarshipsIcon,
    },
    {
      id: 'prerequisites',
      title: 'What are the prerequisites for this course?',
      description: 'Find out what you need before enrolling in a course.',
      prompt: 'What are the prerequisites for this course?',
      Icon: DocumentIcon,
    },
    {
      id: 'honours',
      title: 'Can I still qualify for honours?',
      description: 'Check your eligibility and what you need to apply.',
      prompt: 'Can I still qualify for honours?',
      Icon: PersonIcon,
    },
    {
      id: 'study-plan',
      title: 'Can I take this course in my study plan?',
      description:
        'Find out if a course can be included in your current study plan.',
      prompt: 'Can I take this course in my study plan?',
      Icon: CalendarCheckIcon,
    },
  ],
  resourcesTitle: 'Official ANU search and navigation',
  resources: [
    {
      label: 'Search Programs & Courses',
      href: 'https://programsandcourses.anu.edu.au/catalogue',
    },
    {
      label: 'Degree Builder',
      href: 'https://programsandcourses.anu.edu.au/degree-builder',
    },
    {
      label: 'Programs and Courses home',
      href: 'https://programsandcourses.anu.edu.au/',
    },
    {
      label: 'Programs and Courses FAQ',
      href: 'https://programsandcourses.anu.edu.au/Faq',
    },
  ],
  resourcesNote: 'These links open programsandcourses.anu.edu.au in a new tab.',
};
