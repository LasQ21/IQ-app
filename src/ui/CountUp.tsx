import { useEffect, useState, type HTMLAttributes } from 'react';

let reduced: boolean | undefined;
/** `prefers-reduced-motion: reduce` (read once; safe outside browsers). */
export function prefersReducedMotion(): boolean {
  if (reduced === undefined) {
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduced = false;
    }
  }
  return reduced;
}

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * requestAnimationFrame counter from `from` to `to` (ease-out). Jumps straight to `to` when
 * `animate` is false or the user prefers reduced motion. Extra props (e.g. data-testid) go on the
 * visible number; screen readers get the final value only.
 */
export function CountUp({
  from,
  to,
  duration = 900,
  delay = 0,
  animate = true,
  format = (n: number) => String(n),
  className,
  ...rest
}: {
  from: number;
  to: number;
  duration?: number;
  delay?: number;
  animate?: boolean;
  format?: (n: number) => string;
} & HTMLAttributes<HTMLSpanElement>) {
  const run = animate && from !== to && !prefersReducedMotion();
  const [value, setValue] = useState(run ? from : to);

  useEffect(() => {
    if (!run) {
      setValue(to);
      return;
    }
    let raf = 0;
    let start = 0;
    setValue(from);
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (to - from) * easeOutCubic(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [run, from, to, duration, delay]);

  return (
    <span className={className}>
      <span aria-hidden="true" data-final={to} data-animating={value !== to || undefined} {...rest}>
        {format(value)}
      </span>
      <span className="visually-hidden">{format(to)}</span>
    </span>
  );
}
