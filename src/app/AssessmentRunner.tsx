import { useEffect, useRef, useState } from 'react';
import { assessmentMs } from '../config';
import { ASSESSMENT_ORDER, GAMES } from '../games';
import type { GameProps } from '../games/types';
import { useT } from '../i18n/useT';
import { useStore } from '../state/store';
import type { GameResult } from '../state/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import s from './app.module.css';

export type AssessmentPhase = 'intro' | 'play';

/**
 * Runs the 4-task assessment (Stroop → Corsi → Series → Go/No-Go) on one parallel form.
 * Shared by the funnel Quiz (form A) and the 30-day Retest.
 *
 * Task length comes from `assessmentMs(fastMode)` (15 s, or 10 s in the fast jury mode).
 * No auto-start (`ASSESSMENT_AUTOSTART_MS = 0`): every task waits for "Start" so people can read the instruction.
 * `onPhaseChange` lets the parent screen hide the jury strip while a task is being played.
 */
export function AssessmentRunner({
  form,
  onComplete,
  onPhaseChange,
}: {
  form: GameProps['form'];
  onComplete: (results: GameResult[]) => void;
  onPhaseChange?: (phase: AssessmentPhase) => void;
}) {
  const t = useT();
  const { state } = useStore();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<AssessmentPhase>('intro');
  const results = useRef<GameResult[]>([]);
  const id = ASSESSMENT_ORDER[step];
  const def = GAMES[id];
  const Game = def.component;
  const durationMs = assessmentMs(state.fastMode);

  const phaseCb = useRef(onPhaseChange);
  phaseCb.current = onPhaseChange;
  // Report the phase in the same event as the change, so the parent hides the jury strip before the task paints.
  const go = (next: AssessmentPhase) => {
    setPhase(next);
    phaseCb.current?.(next);
  };
  // Leaving mid-task (unmount) must not leave the parent thinking a task is still running.
  useEffect(() => () => phaseCb.current?.('intro'), []);

  const handleDone = (r: GameResult) => {
    results.current = [...results.current, { ...r, form, meta: { ...r.meta, mode: 'assessment' } }];
    if (step + 1 >= ASSESSMENT_ORDER.length) {
      onComplete(results.current);
    } else {
      setStep(step + 1);
      go('intro');
    }
  };

  return (
    <div className={s.runner} data-testid="assessment" data-step={step} data-phase={phase} data-task-ms={durationMs}>
      <div className={s.segments} aria-label={t('app.progress', { n: step + 1, total: ASSESSMENT_ORDER.length })}>
        {ASSESSMENT_ORDER.map((g, i) => (
          <div key={g} className={s.segment}>
            <div
              className={s.segmentFill}
              style={
                i < step
                  ? { width: '100%' }
                  : i === step && phase === 'play'
                    ? { animation: `${s.fill} ${durationMs}ms linear forwards` }
                    : { width: 0 }
              }
            />
          </div>
        ))}
      </div>
      <p className="muted small">
        {t('app.progress', { n: step + 1, total: ASSESSMENT_ORDER.length })} · {t(`common.abilities.${def.ability}`)}
      </p>

      {phase === 'intro' ? (
        <Card className="stack">
          <h2>{t(`games.${id}.name`)}</h2>
          <p>{t(`games.${id}.howto`)}</p>
          <p className="muted small">{t('app.seconds', { n: durationMs / 1000 })}</p>
          <Button block onClick={() => go('play')} data-testid="game-start">
            {t('common.start')}
          </Button>
        </Card>
      ) : (
        <div className={s.gameArea}>
          <Game
            key={`${id}-${form}`}
            mode="assessment"
            form={form}
            durationMs={durationMs}
            demoDayOffset={state.demoDayOffset}
            onDone={handleDone}
          />
        </div>
      )}
    </div>
  );
}
