// Small presentational pieces shared by several progress screens.
import { useT } from '../../i18n/useT';
import type { Ability } from '../../state/types';
import { ABILITIES } from '../../state/types';
import { FlameIcon } from './icons';
import { signed, tone } from './model';
import s from './progress.module.css';

export function StreakChip({ days }: { days: number }) {
  const t = useT();
  return (
    <span className={[s.chip, s.chipStreak].join(' ')} data-testid="streak-chip" data-streak={days}>
      <FlameIcon />
      {days > 0 ? t('progress.streak', { n: days }) : t('progress.streakZero')}
    </span>
  );
}

/** Per-ability deltas "Attention +7"; positives green, zero "±0", negatives honest in muted. */
export function DeltaGrid({
  now,
  then,
  testIdPrefix,
  noiseBand = 0,
}: {
  now: Record<Ability, number>;
  then: Record<Ability, number>;
  testIdPrefix?: string;
  /** |delta| ≤ noiseBand is shown neutral with a "within measurement error" note (short tests are noisy). */
  noiseBand?: number;
}) {
  const t = useT();
  return (
    <div className={s.deltas}>
      {ABILITIES.map((ab) => {
        const d = Math.round(now[ab]) - Math.round(then[ab]);
        const noise = d !== 0 && Math.abs(d) <= noiseBand;
        return (
          <div
            key={ab}
            className={s.deltaCell}
            data-tone={noise ? 'zero' : tone(d)}
            data-noise={noise ? 'true' : undefined}
            data-delta={d}
            data-testid={testIdPrefix ? `${testIdPrefix}${ab}` : undefined}
          >
            <span>{t(`common.abilities.${ab}`)}</span>
            <b>{signed(d)}</b>
            <span className={s.deltaScore}>
              {Math.round(then[ab])} → {Math.round(now[ab])}
              {noise && <> · {t('progress.retest.withinNoise')}</>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RadarLegend({ now, then }: { now: string; then: string }) {
  return (
    <div className={s.legend}>
      <span>
        <i className={s.swatch} aria-hidden />
        {now}
      </span>
      <span>
        <i className={s.swatchDash} aria-hidden />
        {then}
      </span>
    </div>
  );
}
