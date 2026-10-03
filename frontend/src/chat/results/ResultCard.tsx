import type { ComponentType, CSSProperties } from 'react';
import { Fragment } from 'react';
import {
  AccommodationIcon,
  CalendarCheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CoursesIcon,
  EventsIcon,
  ExternalLinkIcon,
  InfoIcon,
  JobsIcon,
  PersonIcon,
  PinIcon,
  ScholarshipsIcon,
  StarIcon,
  SupportIcon,
} from '../../ui/Icon';
import { isSafeHttpUrl } from '../../util/safeUrl';
import type { CardView, RowIcon } from './cardLayout';
import { toCardView } from './cardLayout';
import type { ResultCardModel, ResultSelection } from './resultItems';
import styles from './ResultCard.module.css';

/** Shared neutral label for a field the source did not publish. */
export const MISSING_VALUE_LABEL = 'Not published';

type IconComponent = ComponentType<{ size?: number; className?: string }>;

/** One icon family for row metadata (24px stroke set from `ui/Icon.tsx`). */
const ROW_ICONS: Readonly<Record<RowIcon, IconComponent>> = {
  clock: ClockIcon,
  pin: PinIcon,
  calendar: EventsIcon,
  briefcase: JobsIcon,
  book: CoursesIcon,
  award: StarIcon,
  home: AccommodationIcon,
  info: InfoIcon,
  person: PersonIcon,
};

/** The leading tile, a domain glyph. No image data exists on the wire, so it is never a fake photo. */
const DOMAIN_ICONS: Readonly<Record<string, IconComponent>> = {
  events: CalendarCheckIcon,
  jobs: JobsIcon,
  courses: CoursesIcon,
  scholarships: ScholarshipsIcon,
  accommodation: AccommodationIcon,
  support: SupportIcon,
};

function domainIcon(domain: string): IconComponent {
  return Object.prototype.hasOwnProperty.call(DOMAIN_ICONS, domain)
    ? DOMAIN_ICONS[domain]
    : InfoIcon;
}

/**
 * Icon rows as a description list, so every stored field stays a real
 * label/value pair for assistive technology. A label is shown when it is not
 * obvious from the value ("Closes:"), and kept screen-reader-only otherwise.
 */
function MetaRows({ view }: { view: CardView }) {
  if (view.rows.length === 0) {
    return null;
  }
  return (
    <dl className={styles.rows}>
      {view.rows.map((row) => {
        const Icon = ROW_ICONS[row.icon];
        return (
          <div className={styles.row} key={row.parts.map((part) => part.label).join('/')}>
            <Icon className={styles.rowIcon} size={16} />
            {row.parts.map((part, index) => {
              /*
               * The separator between two fields of one row is drawn just
               * before the second field: on its label when labels are shown
               * ("$300 · Cost period: weekly"), on its value otherwise
               * ("11:00 am – 2:00 pm").
               */
              const joinStyle =
                index > 0 ? ({ '--join': `"${row.join}"` } as CSSProperties) : undefined;
              return (
                <Fragment key={part.label}>
                  <dt
                    className={
                      row.showLabel
                        ? `${styles.rowLabel} ${index > 0 ? styles.joined : ''}`
                        : 'visually-hidden'
                    }
                    style={row.showLabel ? joinStyle : undefined}
                  >
                    {part.label}
                  </dt>
                  <dd
                    className={`${styles.rowValue} ${index > 0 && !row.showLabel ? styles.joined : ''}`}
                    style={row.showLabel ? undefined : joinStyle}
                  >
                    {part.value ?? <span className={styles.missing}>{MISSING_VALUE_LABEL}</span>}
                  </dd>
                </Fragment>
              );
            })}
          </div>
        );
      })}
    </dl>
  );
}

/** The muted source line: organiser-style fields, then the record's provenance. */
function SourceLine({ view }: { view: CardView }) {
  if (view.secondary.length === 0 && view.provenance === null) {
    return null;
  }
  return (
    <div className={styles.secondary}>
      {view.secondary.length > 0 && (
        <dl className={styles.secondaryFields}>
          {view.secondary.map((part) => (
            <div className={styles.secondaryField} key={part.label}>
              <dt className={part.showLabel ? styles.secondaryLabel : 'visually-hidden'}>
                {part.label}
              </dt>
              <dd className={styles.secondaryValue}>{part.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {view.provenance !== null && <span className={styles.provenance}>{view.provenance}</span>}
    </div>
  );
}

interface ResultCardProps {
  card: ResultCardModel;
  position: number;
  /** The visible card number — the backend ordinal when RAG numbered the cards, `position` otherwise. */
  displayNumber: number;
  onSelect?: (selection: ResultSelection) => void;
}

/**
 * One result, in the same shell for every domain: domain tile, numbered title,
 * a few icon rows, a muted source line, then any remaining stored fields under
 * "More details". Which fields become rows is `cardLayout.ts`; this component
 * only draws them. The number is the backend's, so "the third one" reads the
 * same on screen as it does to RAG.
 */
export function ResultCard({ card, position, displayNumber, onSelect }: ResultCardProps) {
  const linkable = isSafeHttpUrl(card.url);
  const view = toCardView(card);
  const DomainIcon = domainIcon(card.domain);

  return (
    <li className={styles.card} data-domain={card.domain}>
      <span aria-hidden="true" className={styles.tile}>
        <DomainIcon size={22} />
      </span>
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <span aria-hidden="true" className={styles.ordinal} data-ordinal={displayNumber}>
            {displayNumber}.
          </span>
          {linkable ? (
            <a
              className={styles.title}
              href={card.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {card.title}
              <ExternalLinkIcon className={styles.external} size={14} />
            </a>
          ) : (
            <span className={styles.title}>{card.title}</span>
          )}
        </div>
        <MetaRows view={view} />
        <SourceLine view={view} />
        {/*
          V7 Day 4: the one named room whose published rate satisfied an active
          price constraint. Deliberately muted, not a "confirmed"/positive
          badge — it proves only that one room, never affordability, cheapest,
          vacancy or obtainability for the residence as a whole.
        */}
        {card.qualifyingEvidence && (
          <p className={styles.qualifyingEvidence}>
            Matched room: {card.qualifyingEvidence.roomName} —{' '}
            {card.qualifyingEvidence.rate} ({card.qualifyingEvidence.costPeriod})
            {card.qualifyingEvidence.contract && `, ${card.qualifyingEvidence.contract}`}
            {card.qualifyingEvidence.inclusions && `, ${card.qualifyingEvidence.inclusions}`}
            {card.qualifyingEvidence.otherFees && `, ${card.qualifyingEvidence.otherFees}`}
          </p>
        )}
        {view.rest.length > 0 && (
          <details className={styles.more}>
            <summary className={styles.moreSummary}>More details</summary>
            <dl className={styles.fieldList}>
              {view.rest.map((field) => (
                <div className={styles.fieldRow} key={field.label}>
                  <dt className={styles.fieldLabel}>{field.label}</dt>
                  <dd className={styles.fieldValue}>
                    {field.value ?? <span className={styles.missing}>{MISSING_VALUE_LABEL}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
      {onSelect && (
        <button
          aria-label={`Ask about this: ${card.title}`}
          className={styles.action}
          onClick={() =>
            onSelect({ record_id: card.recordId, domain: card.domain, position })
          }
          title="Ask about this"
          type="button"
        >
          <ChevronRightIcon aria-hidden="true" size={18} />
        </button>
      )}
    </li>
  );
}
