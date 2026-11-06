import { useEffect, useRef, useState } from 'react';
import { ASSESSMENT_MS } from '../config';
import { ASSESSMENT_ORDER, GAMES } from '../games';
import { useT } from '../i18n/useT';
import { useStore } from '../state/store';
import type { GameResult } from '../state/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import s from './app.module.css';

/**
 * Runs the 4 × 15 s assessment (Stroop → Corsi → Series → Go/No-Go) on one parallel form.
 * Shared by the funnel Quiz (form A) and the +30-day Retest (form B).
 */
const AUTO_START_S = 3;

export function AssessmentRunner({
  form,
  onComplete,
}: {
  form: 'A' | 'B';
  onComplete: (results: GameResult[]) => void;
}) {
  const t = useT();
  const { state } = useStore();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'play'>('intro');
  const results = useRef<GameResult[]>([]);
  const id = ASSESSMENT_ORDER[step];
  const def = GAMES[id];
  const Game = def.component;

  // After the first task the next one starts by itself after a short countdown (keeps the quiz ≈ 70 s);
  // "Start" skips the wait. The first task waits for a tap so people can read the first instruction.
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (phase !== 'intro' || step === 0) {
      setCount(null);
      return;
    }
    setCount(AUTO_START_S);
    const ids = Array.from({ length: AUTO_START_S }, (_, i) =>
      window.setTimeout(() => {
        const left = AUTO_START_S - i - 1;
        if (left <= 0) setPhase('play');
        else setCount(left);
      }, (i + 1) * 1000),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [phase, step]);

  const handleDone = (r: GameResult) => {
    results.current = [...results.current, { ...r, form, meta: { ...r.meta, mode: 'assessment' } }];
    if (step + 1 >= ASSESSMENT_ORDER.length) {
      onComplete(results.current);
    } else {
      setStep(step + 1);
      setPhase('intro');
    }
  };

  return (
    <div className={s.runner} data-testid="assessment" data-step={step} data-phase={phase}>
      <div className={s.segments} aria-label={t('app.progress', { n: step + 1, total: ASSESSMENT_ORDER.length })}>
        {ASSESSMENT_ORDER.map((g, i) => (
          <div key={g} className={s.segment}>
            <div
              className={s.segmentFill}
              style={
                i < step
                  ? { width: '100%' }
                  : i === step && phase === 'play'
                    ? { animation: `${s.fill} ${ASSESSMENT_MS}ms linear forwards` }
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
          <p className="muted small">{t('app.seconds', { n: ASSESSMENT_MS / 1000 })}</p>
          <Button block onClick={() => setPhase('play')} data-testid="game-start">
            {count ? `${t('common.start')} · ${count}` : t('common.start')}
          </Button>
        </Card>
      ) : (
        <div className={s.gameArea}>
          <Game
            key={`${id}-${form}`}
            mode="assessment"
            form={form}
            durationMs={ASSESSMENT_MS}
            demoDayOffset={state.demoDayOffset}
            onDone={handleDone}
          />
        </div>
      )}
    </div>
  );
}
