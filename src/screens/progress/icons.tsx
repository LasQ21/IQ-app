// Tiny inline icons for the progress screens (decorative, aria-hidden).
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg {...base} strokeWidth={2.2} className={className}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function FlameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12.2 2c1.1 3.7-1.4 5.3-3 7.5C8 11.2 6.5 12.8 6.5 15a5.5 5.5 0 0 0 11 0c0-2.8-1.5-4.8-2.8-6 .1 1.7-.6 3-1.8 3.5.8-3.6.4-7.3-.7-10.5z"
      />
    </svg>
  );
}
