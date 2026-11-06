import { useState } from 'react';
import { AssessmentRunner } from '../../app/AssessmentRunner';
import { navigate, PATHS } from '../../app/router';
import { DEMO_JUMP_DAYS } from '../../config';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Disclaimer } from '../../ui/Disclaimer';
import { Radar } from '../../ui/Radar';
import { Screen } from '../../ui/Screen';
import { Sparkline } from '../../ui/Sparkline';
import { daysSinceBaseline, daysUntilRetest, formatDay, signed, sortedHistory } from './model';
import { DeltaGrid, RadarLegend } from './parts';
import s from './progress.module.css';

export function Retest() {
  const t = useT();
  const { state, dispatch } = useStore();
  const [running, setRunning] = useState(false);
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
      <Screen juryKey="retest" className={s.page}>
        <div>
          <p className={s.kicker}>{t('progress.retest.runKicker', { n: since })}</p>
          <h1>{t('progress.retest.runTitle')}</h1>
        </div>
        <AssessmentRunner
          form="B"
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

  const history = sortedHistory(state).slice(-(since + 1));
  const values = history.map((p) => p.index);
  const weak = (state.current ?? retest).weakest;
  const fmtDay = (d: string) => formatDay(state.lang, d, { month: 'numeric', day: 'numeric' });

  return (
    <Screen juryKey="retest" className={s.page}>
      <div className="stack" style={{ gap: 4 }} data-testid="retest-result">
        <p className={s.kicker}>{t('progress.retest.resultKicker')}</p>
        <h1>{t('progress.retest.resultTitle', { n: since })}</h1>
      </div>

      <Card className="stack">
        <DeltaGrid now={retest.scores} then={baseline.scores} testIdPrefix="retest-delta-" />
        <Radar scores={retest.scores} compare={baseline.scores} highlight={retest.weakest} size={240} />
        <RadarLegend now={t('progress.retest.legendNow')} then={t('progress.retest.legendThen', { n: since })} />
        <p className="small muted">{t('progress.retest.honest')}</p>
      </Card>

      {values.length > 1 && (
        <Card className="stack" style={{ gap: 8 }}>
          <div className={s.sectionTitle}>
            <h3>{t('progress.retest.indexTitle', { n: since })}</h3>
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

      <Card tone="accent" className="stack" style={{ gap: 6 }}>
        <h3>{t('progress.retest.whyBack')}</h3>
        <p className="small">{t('progress.retest.next', { n: DEMO_JUMP_DAYS, ability: t(`common.abilities.${weak}`) })}</p>
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
