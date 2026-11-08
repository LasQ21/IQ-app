import { useState } from 'react';
import { AssessmentRunner, type AssessmentPhase } from '../../app/AssessmentRunner';
import { navigate, PATHS } from '../../app/router';
import { DEMO_JUMP_DAYS } from '../../config';
import { classifyChange } from '../../engine';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Disclaimer } from '../../ui/Disclaimer';
import { Radar } from '../../ui/Radar';
import { Screen } from '../../ui/Screen';
import { Sparkline } from '../../ui/Sparkline';
import { EconomicsLink } from '../economics';
import { daysSinceBaseline, daysUntilRetest, diffDays, formatDay, signed, sortedHistory, today } from './model';
import { RadarLegend } from './parts';
import { ChangeList, joinList, outcomeOf, PracticeIllustration, previousAssessment } from './RetestParts';
import s from './progress.module.css';

export function Retest() {
  const t = useT();
  const { state, dispatch } = useStore();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<AssessmentPhase>('intro');
  const { baseline, retest } = state;
  const until = daysUntilRetest(state);
  const since = daysSinceBaseline(state);

  const start = () => {
    // Not due yet → jump the demo clock (simulated daily training), then measure for real on form B.
    if (until > 0) dispatch({ type: 'demoAdvance', days: DEMO_JUMP_DAYS });
    setRunning(true);
    window.scrollTo(0, 0);
  };

  if (running) {
    return (
      <Screen juryKey="retest" className={s.page} hideJury={phase === 'play'}>
        <div>
          <p className={s.kicker}>{t('progress.retest.runKicker', { n: since })}</p>
          <h1>{t('progress.retest.runTitle')}</h1>
        </div>
        <AssessmentRunner
          form="B"
          onPhaseChange={setPhase}
          onComplete={(results) => {
            dispatch({ type: 'assessmentDone', kind: 'retest', results });
            setRunning(false);
            window.scrollTo(0, 0);
          }}
        />
        <Disclaimer />
      </Screen>
    );
  }

  if (!baseline) return null;

  if (!retest) {
    return (
      <Screen juryKey="retest" className={s.page}>
        <div className="stack" style={{ gap: 8 }}>
          <h1>{t('progress.retest.title')}</h1>
          <p>{t('progress.retest.intro')}</p>
        </div>
        <Card className="stack" data-testid="retest-intro">
          <div className={s.sectionTitle}>
            <h3>{until > 0 ? t('progress.today.retestIn', { n: until }) : t('progress.today.retestDue')}</h3>
          </div>
          <Radar scores={baseline.scores} highlight={baseline.weakest} size={230} />
          <p className="small muted center">{t('progress.retest.baselineCaption')}</p>
        </Card>
        <Card tone="accent" className="stack" style={{ gap: 12 }}>
          <p className="small">{until > 0 ? t('progress.retest.simulate', { n: DEMO_JUMP_DAYS }) : t('progress.retest.dueNote')}</p>
          <Button block onClick={start} data-testid="retest-advance">
            {until > 0 ? t('progress.retest.advance', { n: DEMO_JUMP_DAYS }) : t('progress.retest.start')}
          </Button>
        </Card>
        <Disclaimer />
      </Screen>
    );
  }

  const prev = previousAssessment(state);
  if (!prev) return null;
  // Honest comparison: a change counts only outside the ability's error band.
  const changes = classifyChange(prev.profile, retest);
  const outcome = outcomeOf(changes);
  const gap = prev.isBaseline || !prev.day ? since : Math.max(0, diffDays(prev.day, today(state)));
  // demoDayOffset > 0 → the days were simulated by the demo jump (index only); the measurement just happened.
  const simulated = state.demoDayOffset > 0;
  const history = sortedHistory(state).slice(-(gap + 1));
  const values = history.map((p) => p.index);
  const weak = (state.current ?? retest).weakest;
  const weakChanged = weak !== prev.profile.weakest;
  const fmtDay = (d: string) => formatDay(state.lang, d, { month: 'numeric', day: 'numeric' });
  const better = changes.filter((c) => c.cls === 'better').map((c) => t(`common.abilities.${c.ability}`));

  return (
    <Screen juryKey="retest" className={s.page}>
      <EconomicsLink from="retest" />
      <div className="stack" style={{ gap: 4 }} data-testid="retest-result" data-outcome={outcome} data-simulated={simulated}>
        <p className={s.kicker}>{t('progress.retest.resultKicker')}</p>
        <h1>{simulated ? t('progress.retest.demoTitle', { n: gap }) : t('progress.retest.resultTitle', { n: gap })}</h1>
      </div>

      <Card className="stack">
        <ChangeList changes={changes} testIdPrefix="retest-delta-" />
        <Radar scores={retest.scores} compare={prev.profile.scores} highlight={retest.weakest} size={240} />
        <RadarLegend
          now={t('progress.retest.legendNow')}
          then={prev.isBaseline ? t('progress.retest.legendThen', { n: gap }) : t('progress.retest.legendPrev')}
        />
        <p className="small muted">
          {t('progress.retest.honest')} {t('progress.retest.rangeNote')}
        </p>
      </Card>

      {state.juryMode && <PracticeIllustration from={prev.profile} days={DEMO_JUMP_DAYS} />}

      {values.length > 1 && (
        <Card className="stack" style={{ gap: 8 }}>
          <div className={s.sectionTitle}>
            <h3>{t('progress.retest.indexTitle', { n: gap })}</h3>
            <span className="small muted">{signed(values[values.length - 1] - values[0])}</span>
          </div>
          <Sparkline
            values={values}
            height={80}
            data-testid="retest-sparkline"
            ariaLabel={t('progress.index.sparkAria', { from: values[0], to: values[values.length - 1] })}
          />
          <div className={s.axis} aria-hidden>
            <span>{fmtDay(history[0].day)}</span>
            <span>{fmtDay(history[history.length - 1].day)}</span>
          </div>
        </Card>
      )}

      <Card tone="accent" className="stack" style={{ gap: 6 }} data-testid="retest-why">
        <h3>
          {outcome === 'better'
            ? t('progress.retest.whyBetter', { abilities: joinList(state.lang, better) })
            : outcome === 'lower'
              ? t('progress.retest.whyLower', { n: DEMO_JUMP_DAYS })
              : t('progress.retest.whyStable')}
        </h3>
        <p className="small">
          {t(weakChanged ? 'progress.retest.next' : 'progress.retest.nextSame', {
            n: DEMO_JUMP_DAYS,
            ability: t(`common.abilities.${weak}`),
          })}
        </p>
      </Card>

      <div className="stack" style={{ gap: 8 }}>
        <Button block onClick={() => navigate(PATHS.today)} data-testid="retest-today">
          {t('progress.retest.cta')}
        </Button>
        <Button block variant="ghost" onClick={start} data-testid="retest-again">
          {t('progress.retest.again', { n: DEMO_JUMP_DAYS })}
        </Button>
      </div>
      <Disclaimer />
    </Screen>
  );
}
