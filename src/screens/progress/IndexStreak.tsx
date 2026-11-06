import { navigate, PATHS, useRoute } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { CountUp } from '../../ui/CountUp';
import { Ring } from '../../ui/Ring';
import { Screen } from '../../ui/Screen';
import { Sparkline } from '../../ui/Sparkline';
import { FlameIcon } from './icons';
import { formatDay, livePlan, signed, sortedHistory, tone } from './model';
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

  const cta = () => navigate(from === 'onboarding' ? `${PATHS.line}?from=onboarding` : PATHS.today);
  const fmtDay = (d: string) => formatDay(state.lang, d, { month: 'numeric', day: 'numeric' });

  return (
    <Screen juryKey="index" className={s.page}>
      <Card className={s.hero} data-testid="index-hero">
        <p className={s.kicker}>{t('progress.index.name')}</p>
        <CountUp
          className={s.indexValue}
          from={arrived && delta ? index - delta : index}
          to={index}
          animate={arrived}
          delay={250}
          data-testid="index-value"
        />
        {delta !== undefined && (
          <span className={s.delta} data-testid="index-delta" data-tone={tone(delta)} data-delta={delta}>
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
        <Card className={s.tile} data-testid="index-streak">
          <span className={s.tileLabel}>{t('progress.index.streakLabel')}</span>
          <FlameIcon className={s.flame} />
          <span className={s.streakBig}>
            {state.streakDays > 0 ? t('progress.streak', { n: state.streakDays }) : t('progress.streakZero')}
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
            <span>{fmtDay(history[0].day)}</span>
            <span>{fmtDay(history[history.length - 1].day)}</span>
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
