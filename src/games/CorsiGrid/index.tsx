import { useCallback, useEffect, useRef } from 'react';
import { demoNow } from '../../engine/days';
import { useT } from '../../i18n/useT';
import { CORSI_START_SPAN, CORSI_TIMING, playedMs } from '../../engine/timing';
import { CORSI_MAX, CORSI_MIN, CORSI_N, corsiBank } from '../banks';
import { GameFrame } from '../shared/GameFrame';
import { SeqGrid } from '../shared/SeqGrid';
import { mean, useEnd } from '../shared/hooks';
import { useSeqSession, type SeqStats } from '../shared/useSeqSession';
import type { GameProps } from '../types';
import s from './CorsiGrid.module.css';

const TRAINING_TRIALS = 10;

/**
 * Corsi block span (memory) on a 3×3 grid. Starts at span 4 (assessment, fast timing) or 3 (training); a correct repeat → span + 1;
 * the first miss at a span retries the same span, a second miss in a row → span − 1.
 * rawScore = longest span reproduced correctly (0 if none). meta: correct/total sequences,
 * accuracy, meanRtMs (mean time between taps).
 */
export function CorsiGrid({ mode, form, seed, onDone, durationMs, demoDayOffset = 0 }: GameProps) {
  const t = useT();
  const { end } = useEnd(onDone);
  const missedOnce = useRef(false);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  const advance = useCallback((span: number, ok: boolean) => {
    if (ok) {
      missedOnce.current = false;
      return Math.min(CORSI_MAX, span + 1);
    }
    if (!missedOnce.current) {
      missedOnce.current = true;
      return span;
    }
    missedOnce.current = false;
    return Math.max(CORSI_MIN, span - 1);
  }, []);

  const onFinish = useCallback(
    (st: SeqStats) =>
      end({
        gameId: 'corsi',
        ability: 'memory',
        rawScore: st.bestLen,
        form,
        playedAt: demoNow(demoDayOffset),
        meta: {
          correct: st.correct,
          total: st.total,
          accuracy: st.total ? st.correct / st.total : 0,
          meanRtMs: Math.round(mean(st.tapRts)),
          recalled: st.recalled,
          durationMs: playedMs(startedAt.current, durationMs),
          mode,
        },
      }),
    [demoDayOffset, durationMs, end, form, mode],
  );

  const g = useSeqSession({
    bank: corsiBank(form, seed),
    startLen: CORSI_START_SPAN[mode],
    advance,
    mode,
    durationMs,
    trainingTrials: TRAINING_TRIALS,
    timing: CORSI_TIMING[mode],
    onFinish,
  });

  return (
    <GameFrame
      gameId="corsi"
      mode={mode}
      durationMs={durationMs}
      onFinish={g.finish}
      status={
        <>
          <span className={s.span}>{t('games.corsi.span', { n: g.len })}</span>
          <span>{t('games.common.correctN', { n: g.stats.current.correct })}</span>
        </>
      }
    >
      <p className={s.hint} aria-live="polite">
        {g.phase === 'show'
          ? t('games.common.watch')
          : g.phase === 'input'
            ? t('games.common.yourTurn')
            : g.flash === 'ok'
              ? t('games.common.correct')
              : t('games.common.wrong')}
      </p>
      <SeqGrid
        n={CORSI_N}
        lit={g.lit}
        marks={g.marks}
        inputOn={g.phase === 'input' && !g.over}
        flash={g.flash}
        onCell={g.onCell}
        testId="corsi-grid"
      />
    </GameFrame>
  );
}
