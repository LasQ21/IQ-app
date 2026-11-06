import type { Ability } from '../state/types';
import { ABILITIES } from '../state/types';
import { useT } from '../i18n/useT';

/**
 * 4-axis radar (memory top, attention right, logic bottom, speed left).
 * `compare` draws a dashed second polygon (e.g. baseline vs retest).
 */
export function Radar({
  scores,
  compare,
  highlight,
  size = 260,
}: {
  scores: Record<Ability, number>;
  compare?: Record<Ability, number>;
  highlight?: Ability;
  size?: number;
}) {
  const t = useT();
  const c = size / 2;
  const r = size / 2 - 44;
  const angle = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / ABILITIES.length;
  const pt = (i: number, v: number) => {
    const a = angle(i);
    const k = (Math.max(0, Math.min(100, v)) / 100) * r;
    return [c + Math.cos(a) * k, c + Math.sin(a) * k] as const;
  };
  const poly = (sc: Record<Ability, number>) => ABILITIES.map((ab, i) => pt(i, sc[ab]).join(',')).join(' ');
  const label = ABILITIES.map((ab, i) => {
    const a = angle(i);
    return { ab, x: c + Math.cos(a) * (r + 24), y: c + Math.sin(a) * (r + 24) };
  });
  const desc = ABILITIES.map((ab) => `${t(`common.abilities.${ab}`)} ${Math.round(scores[ab])}`).join(', ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }} role="img" aria-label={desc}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={ABILITIES.map((_, i) => pt(i, k * 100).join(',')).join(' ')}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {ABILITIES.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      {compare && (
        <polygon points={poly(compare)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" />
      )}
      <polygon
        points={poly(scores)}
        fill="rgba(91,71,255,0.18)"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        style={{ transition: 'all .6s var(--ease)' }}
      />
      {ABILITIES.map((ab, i) => {
        const [x, y] = pt(i, scores[ab]);
        const hot = ab === highlight;
        return <circle key={ab} cx={x} cy={y} r={hot ? 6 : 4} fill={hot ? 'var(--risk)' : 'var(--accent)'} />;
      })}
      {label.map(({ ab, x, y }) => (
        <text
          key={ab}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={13}
          fontWeight={ab === highlight ? 700 : 500}
          fill={ab === highlight ? '#B6431B' : 'var(--muted)'}
        >
          {t(`common.abilities.${ab}`)}
        </text>
      ))}
    </svg>
  );
}
