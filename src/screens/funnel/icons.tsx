import type { Ability } from '../../state/types';

/** Small hand-drawn line icons used across the funnel (24×24, currentColor). */
const common = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function AbilityIcon({ ability }: { ability: Ability }) {
  switch (ability) {
    case 'memory':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" fill="currentColor" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" />
        </svg>
      );
    case 'attention':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case 'logic':
      return (
        <svg {...common}>
          <path d="M5 18l7-6 7-6" />
          <circle cx="5" cy="18" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="19" cy="6" r="2" fill="currentColor" />
        </svg>
      );
    case 'speed':
      return (
        <svg {...common}>
          <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />
        </svg>
      );
  }
}

export function ClockIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5V6M12 18v2.5M3.5 12H6M18 12h2.5" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg {...common}>
      <path d="M4 12a8 8 0 0113.7-5.6L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
      <path d="M20 12a8 8 0 01-13.7 5.6L4 15.5" />
      <path d="M4 20v-4.5h4.5" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg {...common}>
      <path d="M4 18l5-6 4 3 7-9" />
      <path d="M15 6h5v5" />
    </svg>
  );
}
