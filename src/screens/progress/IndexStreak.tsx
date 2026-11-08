import { navigate, PATHS, useRoute } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { COUNT_UP_MS, CountUp, prefersReducedMotion } from '../../ui/CountUp';
import { Ring } from '../../ui/Ring';
import { Screen } from '../../ui/Screen';
import { Sparkline } from '../../ui/Sparkline';
import { FlameIcon } from './icons';
import { formatDay, livePlan, signed, sortedHistory, tone } from './model';
import { streakText } from './parts';
import s from './progress.module.css';

export function IndexStreak() {
  const t = useT();
  const { state } = useStore();
  const route = useRoute();
  const from = route.query.get('from');
  const arrived = from === 'onboarding' || from === 'today';

  const index = state.current?.index ?? 0;
  const delta = state.lastIndexDelta;
  const items = livePlan(state);
  const done = items.filter((it) => it.done).length;
  const total = items.length || 3;
  const history = sortedHistory(state).slice(-31);
  const values = history.map((p) => p.index);
  if (values.length === 0) values.push(index);

  // "Wow" moment after a game: the number counts up from the previous value, then the "+N" chip pops
  // with a short haptic tick. Reduced motion: final values at once, no pop, no vibration.
  const counting = arrived && delta !== undefined && delta !== 0;
  const countDelay = 250;
  const prev = delta !== undefined ? index - delta : undefined;
  const onCounted = (animated: boolean) => {
    if (!animated || !counting || (delta ?? 0) <= 0 || prefersReducedMotion()) return;
    try {
      navigator.vibrate?.(20);
    } catch {
      /* not supported */
    }
  };
  const sameDay = history.length > 1 && history[0].day === history[history.length - 1].day;

  const cta = () => navigate(from === 'onboarding' ? `${PATHS.line}?from=onboarding` : PATHS.today);
  const fmtDay = (d: string) => formatDay(state.lang, d, { month: 'numeric', day: 'numeric' });

  return (
    <Screen juryKey="index" className={s.page}>
      <Card className={s.hero} data-testid="index-hero">
        <p className={s.kicker}>{t('progress.index.name')}</p>
        <CountUp
          className={s.indexValue}
          from={counting && prev !== undefined ? prev : index}
          to={index}
          animate={counting}
          delay={countDelay}
          onDone={onCounted}
          data-testid="index-value"
        />
        {prev !== undefined && delta !== 0 && (
          <p className={s.anchor} data-testid="index-anchor">
            <span>{prev}</span>
            <span className={s.anchorArrow}>→</span>
            <b>{index}</b>
          </p>
        )}
        {delta !== undefined && (
          <span
            className={[s.delta, counting ? s.deltaPop : ''].join(' ')}
            style={counting ? { animationDelay: `${countDelay + COUNT_UP_MS - 150}ms` } : undefined}
            data-testid="index-delta"
            data-tone={tone(delta)}
            data-delta={delta}
          >
            {signed(delta)}
            <span className={s.deltaNote}>{arrived ? t('progress.index.deltaNow') : t('progress.index.deltaLast')}</span>
          </span>
        )}
        <p className="small muted">{t('progress.index.scale')}</p>
      </Card>

      <div className={s.twoCol}>
        <Card className={s.tile}>
          <span className={s.tileLabel}>{t('progress.index.todayPlan')}</span>
          <Ring
            value={done / total}
            size={88}
            stroke={9}
            label={`${done}/${total}`}
            ariaLabel={t('progress.today.ringAria', { done, total })}
          />
        </Card>
        <Card className={s.tile} data-testid="index-streak" data-streak={state.streakDays}>
          <span className={s.tileLabel}>{t('progress.index.streakLabel')}</span>
          <FlameIcon className={s.flame} />
          <span className={s.streakBig}>
            {streakText(t, state.streakDays)}
          </span>
        </Card>
      </div>

      <Card className="stack" style={{ gap: 8 }}>
        <div className={s.sectionTitle}>
          <h3>{t('progress.index.history')}</h3>
          {values.length > 1 && <span className="small muted">{signed(values[values.length - 1] - values[0])}</span>}
        </div>
        <Sparkline
          values={values}
          height={80}
          data-testid="index-sparkline"
          ariaLabel={t('progress.index.sparkAria', { from: values[0], to: values[values.length - 1] })}
        />
        {history.length > 1 && (
          <div className={s.axis} aria-hidden>
            {/* Day 1: both points are today — "before / after training" says more than two equal dates */}
            <span>{sameDay ? t('progress.index.before') : fmtDay(history[0].day)}</span>
            <span>{sameDay ? t('progress.index.after') : fmtDay(history[history.length - 1].day)}</span>
          </div>
        )}
        <p className="small muted">{t('progress.index.explain')}</p>
      </Card>

      <Button block onClick={cta} data-testid="index-continue">
        {from === 'onboarding' ? t('progress.index.ctaOnboarding') : t('progress.index.ctaToday')}
      </Button>
    </Screen>
  );
}
