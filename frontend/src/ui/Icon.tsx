import type { SVGProps } from 'react';

/**
 * Inline stroke icons at 24x24, drawn in `currentColor`.
 *
 * Kept in-repo rather than added as a dependency: the set is small and the
 * bundle stays free of an icon library. Icons are decorative — every one is
 * paired with a text label — so they are hidden from assistive technology.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
      width={size}
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * Placeholder brand mark. A generic shield outline, not the ANU crest — the
 * real crest asset has not been supplied and must not be approximated.
 */
export function CrestPlaceholder({ size = 32 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path
        d="M12 2.75 20 5.5v6.2c0 4.6-3.2 8.3-8 9.55-4.8-1.25-8-4.95-8-9.55V5.5z"
        fill="var(--gold-tint)"
        stroke="var(--gold)"
        strokeWidth={1.4}
      />
      <path
        d="M7.5 13.5c1.5-1.1 3-1.1 4.5 0s3 1.1 4.5 0"
        fill="none"
        stroke="var(--gold)"
        strokeLinecap="round"
        strokeWidth={1.4}
      />
      <circle cx="12" cy="8.4" fill="var(--gold)" r="1.15" />
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1h-4v-5.5h-7V20h-4a1 1 0 0 1-1-1z" />
  </Svg>
);

export const CoursesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </Svg>
);

export const ScholarshipsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4 2.75 8.25 12 12.5l9.25-4.25z" />
    <path d="M6.5 10.5V15c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.5" />
  </Svg>
);

export const AccommodationIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V9.5L12 4l8 5.5V20" />
    <path d="M9.5 20v-5.5h5V20" />
  </Svg>
);

export const JobsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect height="12" rx="2" width="18" x="3" y="7" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M3 12h18" />
  </Svg>
);

export const EventsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect height="16" rx="2" width="17" x="3.5" y="4.5" />
    <path d="M3.5 9.5h17M8 3v3M16 3v3" />
  </Svg>
);

export const SupportIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" />
    <path d="M12 16.6h.01" />
  </Svg>
);

export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5" />
    <path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5l1.5-1.5" />
  </Svg>
);

export const ExternalLinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" />
  </Svg>
);

export const ClearChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </Svg>
);

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const SendIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 4 3.5 10.6l6.4 2.4 2.4 6.4z" />
    <path d="M20 4 9.9 13" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
);

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M4.35 4.35l1.55 1.55M18.1 18.1l1.55 1.55M2.6 12h2.2M19.2 12h2.2M4.35 19.65l1.55-1.55M18.1 5.9l1.55-1.55" />
  </Svg>
);

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2" />
  </Svg>
);

export const StarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z" />
  </Svg>
);
