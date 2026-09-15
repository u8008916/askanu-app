import type { EventItem, JobItem } from '../types/api';

/**
 * Fixtures for the two list endpoints, shaped to the reviewed contracts.
 *
 * Same rules as `askResponses.ts`: placeholder copy only, `example.invalid`
 * URLs, dates in 2099 so nothing can be mistaken for a real ANU closing date,
 * and never imported by a component — only by the dev feed mock and tests.
 *
 * Order is the server's deterministic order (nearest closing date first,
 * undated roles last) and the App renders it as sent. `status: 'current'` is
 * the server's verdict, carried through untouched.
 */
export const mockCurrentJobs: JobItem[] = [
  {
    record_id: 'jobs:job:900001',
    source_id: 'jobs_anu_search',
    job_id: '900001',
    title: 'Placeholder role A',
    employment_types: ['Full time', 'Continuing'],
    location: 'Placeholder location',
    classification: 'Placeholder classification',
    salary: null,
    closing_text: 'Closes 1 January 2099',
    closing_date: '2099-01-01',
    closing_at: '2099-01-01T23:55:00+11:00',
    status: 'current',
    url: 'https://example.invalid/placeholder-job-a',
    domain: 'jobs',
  },
  {
    record_id: 'jobs:job:900002',
    source_id: 'jobs_anu_search',
    job_id: '900002',
    title: 'Placeholder role B',
    employment_types: ['Part time'],
    location: 'Placeholder location',
    classification: null,
    salary: null,
    closing_text: 'Closes 8 January 2099',
    closing_date: '2099-01-08',
    closing_at: null,
    status: 'current',
    url: 'https://example.invalid/placeholder-job-b',
    domain: 'jobs',
  },
  {
    record_id: 'jobs:job:900003',
    source_id: 'jobs_anu_search',
    job_id: '900003',
    title:
      'Placeholder role C with a deliberately long title so that wrapping inside the panel is visible at narrow widths',
    employment_types: ['Fixed term'],
    location: null,
    classification: null,
    salary: null,
    closing_text: 'Closes 15 January 2099',
    closing_date: '2099-01-15',
    closing_at: null,
    status: 'current',
    url: 'https://example.invalid/placeholder-job-c',
    domain: 'jobs',
  },
  {
    record_id: 'jobs:job:900004',
    source_id: 'jobs_anu_search',
    job_id: '900004',
    title: 'Placeholder role D',
    employment_types: [],
    location: 'Placeholder location',
    classification: null,
    salary: null,
    closing_text: 'Closes 22 January 2099',
    closing_date: '2099-01-22',
    closing_at: null,
    status: 'current',
    url: 'https://example.invalid/placeholder-job-d',
    domain: 'jobs',
  },
  {
    // Undated: the server lists it last and publishes no closing wording.
    record_id: 'jobs:job:900005',
    source_id: 'jobs_anu_search',
    job_id: '900005',
    title: 'Placeholder role E',
    employment_types: ['Casual'],
    location: 'Placeholder location',
    classification: null,
    salary: null,
    closing_text: null,
    closing_date: null,
    closing_at: null,
    status: 'current',
    url: 'https://example.invalid/placeholder-job-e',
    domain: 'jobs',
  },
];

/**
 * Upcoming events in ascending `start_at`, `Australia/Canberra`. The RAG
 * service does not serve this endpoint until the Events build day, so this
 * fixture exists to prove the panel renders the contract shape — including a
 * venue-less item — before real records exist.
 */
export const mockUpcomingEvents: EventItem[] = [
  {
    record_id: 'events:event:placeholder-1',
    source_id: 'events_anu',
    title: 'Placeholder event A',
    start_at: '2099-03-02T10:00:00+11:00',
    end_at: '2099-03-02T11:00:00+11:00',
    venue: 'Placeholder venue',
    organiser: 'Placeholder organiser',
    url: 'https://example.invalid/placeholder-event-a',
    domain: 'events',
  },
  {
    record_id: 'events:event:placeholder-2',
    source_id: 'events_anu',
    title: 'Placeholder event B with a long title that wraps inside the panel at narrow widths',
    start_at: '2099-03-03T18:30:00+11:00',
    end_at: null,
    venue: null,
    organiser: null,
    url: 'https://example.invalid/placeholder-event-b',
    domain: 'events',
  },
];
