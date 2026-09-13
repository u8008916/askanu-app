import type { ComponentType } from 'react';
import {
  CalendarCheckIcon,
  CoursesIcon,
  DocumentIcon,
  PersonIcon,
  ScholarshipsIcon,
  SearchIcon,
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
      description: 'Explore honours requirements and official ANU information.',
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

/**
 * Scholarships.
 *
 * V3/V5 restrict the Scholarships domain to `study.anu.edu.au/scholarships`,
 * the official ANU Scholarships Finder. Both URLs below were opened and
 * confirmed to return HTTP 200 on Day 9, reached from the site's own nav —
 * neither is a guessed address. See docs/evidence/DAY_09_SCHOLARSHIPS_PAGE.md.
 *
 * Card copy stays a guided intent, not an answer: no dollar value, deadline
 * or eligibility claim is hard-coded here, since only the API/backend may
 * supply that fact (`CONVERSATION_CONTRACT.md` Scholarships; V3 "do not
 * infer/hard-code data the backend owns").
 */
export const SCHOLARSHIPS_DOMAIN: DomainLauncherConfig = {
  id: 'scholarships',
  title: 'Scholarships',
  intro:
    'Get help finding and understanding ANU scholarships through AskANU. Choose a question below to start a chat, or explore official resources.',
  Icon: ScholarshipsIcon,
  questions: [
    {
      id: 'find-scholarships',
      title: 'Find scholarships for me',
      description: 'Get a starting list of scholarships that could suit you.',
      prompt: 'Find scholarships for me',
      Icon: SearchIcon,
    },
    {
      id: 'check-eligibility',
      title: 'Check eligibility',
      description: 'Find out whether you meet the criteria for a scholarship.',
      prompt: 'Am I eligible for this scholarship?',
      Icon: PersonIcon,
    },
    {
      id: 'deadlines',
      title: 'Deadlines',
      description: 'Find out when a scholarship application closes.',
      prompt: 'When is the application deadline for this scholarship?',
      Icon: CalendarCheckIcon,
    },
    {
      id: 'scholarships-for-degree',
      title: 'Scholarships for my degree',
      description: 'Find scholarships available for your specific degree.',
      prompt: 'What scholarships are available for my degree?',
      Icon: DocumentIcon,
    },
  ],
  resourcesTitle: 'Official ANU scholarship search and navigation',
  resources: [
    {
      label: 'Find a scholarship',
      href: 'https://study.anu.edu.au/scholarships/find-scholarship',
    },
    {
      label: 'ANU Scholarships home',
      href: 'https://study.anu.edu.au/scholarships',
    },
  ],
  resourcesNote: 'These links open study.anu.edu.au in a new tab.',
};
