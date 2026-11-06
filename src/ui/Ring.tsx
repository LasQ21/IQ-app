import { useEffect, useState, type ReactNode } from 'react';
import s from './Ring.module.css';

/** SVG progress ring. `value` 0–1; the stroke animates from 0 on mount and on every change. */
export function Ring({
  value,
  size = 112,
  stroke = 10,
  label,
  sublabel,
  ariaLabel,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(v), 60);
    return () => window.clearTimeout(id);
  }, [v]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const complete = v >= 1;

  return (
    <div
      className={[s.ring, className ?? ''].join(' ')}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
      data-value={v}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          className={[s.bar, complete ? s.complete : ''].join(' ')}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ opacity: shown > 0 ? 1 : 0 }}
        />
      </svg>
      {(label !== undefined || sublabel !== undefined) && (
        <div className={s.center} aria-hidden="true">
          {label !== undefined && <span className={s.label}>{label}</span>}
          {sublabel !== undefined && <span className={s.sub}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
