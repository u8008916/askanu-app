import type { ComponentType } from 'react';
import {
  CalendarCheckIcon,
  CoursesIcon,
  DocumentIcon,
  JobsIcon,
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
 *
 * The two resources are navigation escape hatches (Scholarships home and the
 * Finder listing), not persisted Scholarship records. The Day 9 record
 * identity rule — `https://study.anu.edu.au/scholarships/find-scholarship/<slug>`,
 * `entity_id = <slug>` — applies only to evidence URLs that arrive in
 * `sources[]` from the RAG service. These links carry no slug and must not
 * be given one; the App never constructs a scholarship record URL or ID.
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

/**
 * Jobs.
 *
 * V3 names ANU Jobs as the approved source. All three URLs below were opened
 * on Day 10 and returned HTTP 200, reached from ANU's own navigation
 * (`www.anu.edu.au/jobs` → "Search Jobs" → `jobs.anu.edu.au/jobs/search`,
 * the listing the scraper collects from). See
 * docs/evidence/DAY_10_JOBS_PAGE.md.
 *
 * Card copy is a guided intent, not an answer: no role title, closing date
 * or open/closed claim is hard-coded here. Whether a role is current is a
 * server fact (`/api/v1/jobs/current` in API_CONTRACT.md); the App displays
 * what it is sent and never infers it.
 *
 * The resources are navigation escape hatches, not job records. Individual
 * roles live at `https://jobs.anu.edu.au/jobs/<slug>` and arrive only as
 * evidence URLs in `sources[]`; the App never constructs a job record URL
 * or ID.
 */
export const JOBS_DOMAIN: DomainLauncherConfig = {
  id: 'jobs',
  title: 'Jobs',
  intro:
    'Get help finding and understanding current ANU jobs through AskANU. Choose a question below to start a chat, or explore official resources.',
  Icon: JobsIcon,
  questions: [
    {
      id: 'current-jobs',
      title: 'Find current ANU jobs',
      description: 'See roles that are open right now, closest closing date first.',
      prompt: 'What ANU jobs are currently open?',
      Icon: SearchIcon,
    },
    {
      id: 'jobs-for-background',
      title: 'Jobs for my background or degree',
      description: 'Find current roles that could fit your study or experience.',
      prompt: 'Which current ANU jobs suit my background or degree?',
      Icon: PersonIcon,
    },
    {
      id: 'closing-soon',
      title: 'Closing soon',
      description: 'Check which current roles close next and when.',
      prompt: 'Which ANU jobs are closing soon?',
      Icon: CalendarCheckIcon,
    },
    {
      id: 'job-requirements',
      title: 'Job requirements',
      description: 'Find out what a role asks for before you apply.',
      prompt: 'What are the requirements for this ANU job?',
      Icon: DocumentIcon,
    },
  ],
  resourcesTitle: 'Official ANU jobs search and navigation',
  resources: [
    {
      label: 'Search ANU Jobs',
      href: 'https://jobs.anu.edu.au/jobs/search',
    },
    {
      label: 'Jobs at ANU',
      href: 'https://www.anu.edu.au/jobs',
    },
    {
      label: 'Applying for a position at ANU',
      href: 'https://www.anu.edu.au/jobs/applying-for-a-position-at-anu',
    },
  ],
  resourcesNote: 'These links open jobs.anu.edu.au and anu.edu.au in a new tab.',
};
