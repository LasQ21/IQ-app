import { useCallback, useRef, useState } from 'react';
import { nextLevel } from '../../engine/adaptive';
import { demoNow } from '../../engine/days';
import { useT } from '../../i18n/useT';
import { FLASH_FIRST_LEVEL, FLASH_TIMING } from '../../engine/timing';
import { FLASH_MAX, FLASH_MIN, FLASH_N, flashBank } from '../banks';
import { GameFrame } from '../shared/GameFrame';
import { SeqGrid } from '../shared/SeqGrid';
import { clampInt, mean, useEnd } from '../shared/hooks';
import { useSeqSession, type SeqStats } from '../shared/useSeqSession';
import type { GameProps } from '../types';
import s from './FlashGrid41.module.css';

const TRAINING_TRIALS = 10;
const LEVELS = Array.from({ length: FLASH_MAX - FLASH_MIN + 1 }, (_, i) => FLASH_MIN + i);

/**
 * FlashGrid №41 (memory, adaptive). A sequence of `level` cells flashes on a 4×4 grid; repeat it.
 * Level 2–9 via the 2-up/1-down staircase `nextLevel`. Starts at `startLevel ?? 3` (Play: first session 3, later the last final level − 1).
 * rawScore = number of correct sequences; level = final level (after the last answer);
 * meta.maxLevel = highest level reached (played); meta.accuracy = correct / total.
 */
export function FlashGrid41({ mode, form, seed, onDone, durationMs, startLevel, demoDayOffset = 0 }: GameProps) {
  const t = useT();
  const { end } = useEnd(onDone);
  const start = clampInt(startLevel ?? FLASH_FIRST_LEVEL, FLASH_MIN, FLASH_MAX, FLASH_FIRST_LEVEL);
  const streak = useRef(0);
  const [shown, setShown] = useState({ level: start, dir: 0 as -1 | 0 | 1, n: 0 });

  const advance = useCallback((level: number, ok: boolean) => {
    streak.current = ok ? streak.current + 1 : 0;
    const next = nextLevel(level, ok, streak.current);
    if (next !== level) streak.current = 0;
    setShown((p) => ({ level: next, dir: next > level ? 1 : next < level ? -1 : 0, n: next !== level ? p.n + 1 : p.n }));
    return next;
  }, []);

  const onFinish = useCallback(
    (st: SeqStats) =>
      end({
        gameId: 'flash41',
        ability: 'memory',
        rawScore: st.correct,
        level: st.finalLen,
        form,
        playedAt: demoNow(demoDayOffset),
        meta: {
          correct: st.correct,
          total: st.total,
          accuracy: st.total ? st.correct / st.total : 0,
          meanRtMs: Math.round(mean(st.tapRts)),
          maxLevel: st.maxLen,
          mode,
        },
      }),
    [demoDayOffset, end, form, mode],
  );

  const g = useSeqSession({
    bank: flashBank(form, seed),
    startLen: start,
    advance,
    mode,
    durationMs,
    trainingTrials: TRAINING_TRIALS,
    timing: FLASH_TIMING,
    onFinish,
  });

  const total = g.stats.current.total;
  return (
    <GameFrame
      gameId="flash41"
      mode={mode}
      durationMs={durationMs}
      onFinish={g.finish}
      status={
        <span>
          {t('games.flash41.round', {
            n: Math.min(total + (g.phase === 'fb' ? 0 : 1), TRAINING_TRIALS),
            total: TRAINING_TRIALS,
          })}
        </span>
      }
    >
      <div className={s.levelRow}>
        <div className={s.levelBox} data-testid="flash-level" data-level={shown.level}>
          <span className={s.levelLabel}>{t('games.flash41.level')}</span>
          <span key={shown.n} className={[s.levelNum, shown.dir ? s.levelBump : ''].join(' ')} aria-live="polite">
            {t('games.flash41.lv', { n: shown.level })}
          </span>
          {shown.dir !== 0 && (
            <span
              key={`b${shown.n}`}
              className={[s.badge, shown.dir > 0 ? s.badgeUp : s.badgeDown].join(' ')}
              data-testid="flash-level-change"
            >
              {shown.dir > 0 ? t('games.flash41.up', { n: shown.level }) : t('games.flash41.down', { n: shown.level })}
            </span>
          )}
        </div>
        <div className={s.pips} aria-hidden="true">
          {LEVELS.map((l) => (
            <span key={l} className={[s.pip, l <= shown.level ? s.pipOn : ''].join(' ')} />
          ))}
        </div>
      </div>
      <p className={s.hint}>
        {g.phase === 'show'
          ? t('games.common.watch')
          : g.phase === 'input'
            ? t('games.common.yourTurn')
            : g.flash === 'ok'
              ? t('games.common.correct')
              : t('games.common.wrong')}
      </p>
      <SeqGrid
        n={FLASH_N}
        lit={g.lit}
        marks={g.marks}
        inputOn={g.phase === 'input' && !g.over}
        flash={g.flash}
        onCell={g.onCell}
        testId="flash-grid"
      />
    </GameFrame>
  );
}
