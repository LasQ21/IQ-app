import { useId } from 'react';
import s from './Sparkline.module.css';

/**
 * Min/max-aware SVG sparkline (line + soft area + end dot). A flat series is drawn mid-height.
 * Scales to the container width; `height` is the drawing height in viewBox units.
 */
export function Sparkline({
  values,
  width = 320,
  height = 72,
  ariaLabel,
  area = true,
  animate = true,
  className,
  ...rest
}: {
  values: number[];
  width?: number;
  height?: number;
  ariaLabel: string;
  area?: boolean;
  animate?: boolean;
  className?: string;
  'data-testid'?: string;
}) {
  const gid = useId().replace(/:/g, '');
  const vals = values.length === 1 ? [values[0], values[0]] : values;
  if (vals.length === 0) return null;

  const pad = 6;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (vals.length - 1);
  const y = (v: number) => (range === 0 ? height / 2 : pad + (1 - (v - min) / range) * (height - pad * 2));
  const pts = vals.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const fill = `${line} L${x(vals.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  const [lx, ly] = pts[pts.length - 1];
  const [fx, fy] = pts[0];

  return (
    <svg
      className={[s.spark, animate ? s.animate : '', className ?? ''].join(' ')}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={ariaLabel}
      data-min={min}
      data-max={max}
      data-points={values.length}
      {...rest}
    >
      <defs>
        <linearGradient id={`sg${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {area && <path className={s.area} d={fill} fill={`url(#sg${gid})`} />}
      <path
        className={s.line}
        d={line}
        pathLength={1}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={fx} cy={fy} r={3} fill="var(--card)" stroke="var(--muted)" strokeWidth={1.5} />
      <circle className={s.dot} cx={lx} cy={ly} r={4.5} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
    </svg>
  );
}
