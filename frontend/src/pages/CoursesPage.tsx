import { CoursesIcon, InfoIcon, LinkIcon } from '../ui/Icon';
import { ExternalLink } from '../ui/ExternalLink';
import styles from './CoursesPage.module.css';

/**
 * Official Programs & Courses entry points.
 *
 * V3 restricts the Courses domain to `programsandcourses.anu.edu.au`. Every URL
 * below was opened and confirmed to return HTTP 200 before it was written here,
 * and each one is reachable from the site's own navigation — none is a guessed
 * address. See docs/evidence/DAY_05_COURSES_PAGE.md.
 */
const OFFICIAL_LINKS: {
  label: string;
  description: string;
  href: string;
}[] = [
  {
    label: 'Search Programs & Courses',
    description:
      'Search programs, majors, minors and courses in the current academic year and beyond.',
    href: 'https://programsandcourses.anu.edu.au/catalogue',
  },
  {
    label: 'Degree Builder',
    description:
      'Browse degrees by area of interest to find a study option that fits.',
    href: 'https://programsandcourses.anu.edu.au/degree-builder',
  },
  {
    label: 'Programs and Courses home',
    description: 'The official ANU catalogue for programs and courses.',
    href: 'https://programsandcourses.anu.edu.au/',
  },
  {
    label: 'Programs and Courses FAQ',
    description: 'ANU answers to common questions about the catalogue.',
    href: 'https://programsandcourses.anu.edu.au/Faq',
  },
];

/**
 * What a course record will show once the courses endpoint exists.
 *
 * API_CONTRACT.md defines no courses endpoint, so this page states the fields
 * rather than displaying values. Nothing here may become an invented course
 * code, title, session or requirement.
 */
const PLANNED_FIELDS: string[] = [
  'Course code and title',
  'Academic year and session',
  'Units and delivery mode',
  'Prerequisites and assumed knowledge',
  'Link to the official course page',
];

interface CoursesPageProps {
  /** Returns to the single AskANU chat with the question ready to edit. */
  onAskAboutCourses: (question: string) => void;
}

const COURSE_QUESTION = 'Tell me about COMP1110.';

export function CoursesPage({ onAskAboutCourses }: CoursesPageProps) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <CoursesIcon className={styles.titleIcon} size={22} />
          Courses
        </h1>
        <p className={styles.intro}>
          Programs and Courses is the official ANU catalogue. Use the links
          below to search it directly, or ask AskANU a course question and get
          an answer with the source page attached.
        </p>
      </header>

      {/*
        V3: a resource page is an information hub, not another bot. There is no
        chat input on this page — the call to action returns to the one chat.
      */}
      <section aria-labelledby="courses-ask" className={styles.askPanel}>
        <h2 className={styles.askTitle} id="courses-ask">
          Ask AskANU about a course
        </h2>
        <p className={styles.askBody}>
          Bring a course question back to the chat. AskANU answers from official
          ANU pages and links the source it used.
        </p>
        <button
          className={styles.askButton}
          onClick={() => onAskAboutCourses(COURSE_QUESTION)}
          type="button"
        >
          Ask a course question
        </button>
        <p className={styles.askNote}>
          Opens the chat with a question ready to edit. Nothing is sent until
          you send it.
        </p>
      </section>

      <section aria-labelledby="courses-official" className={styles.panel}>
        <h2 className={styles.panelTitle} id="courses-official">
          <LinkIcon className={styles.panelTitleIcon} size={16} />
          Official ANU search and navigation
        </h2>
        <ul className={styles.linkList}>
          {OFFICIAL_LINKS.map(({ label, description, href }) => (
            <li key={href}>
              <ExternalLink description={description} href={href}>
                {label}
              </ExternalLink>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          These links open programsandcourses.anu.edu.au in a new tab.
        </p>
      </section>

      <section aria-labelledby="courses-planned" className={styles.panel}>
        <h2 className={styles.panelTitle} id="courses-planned">
          <InfoIcon className={styles.panelTitleIcon} size={16} />
          Course details in AskANU
        </h2>
        <p className={styles.panelBody}>
          Course records are being added to AskANU. When a course is available,
          an answer will carry:
        </p>
        <ul className={styles.fieldList}>
          {PLANNED_FIELDS.map((field) => (
            <li className={styles.fieldItem} key={field}>
              <span className={styles.bullet} />
              {field}
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Placeholder only — awaiting the courses endpoint. AskANU does not show
          course information it cannot source from an official ANU page.
        </p>
      </section>
    </div>
  );
}
