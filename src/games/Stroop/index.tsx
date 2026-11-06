import { useCallback, useEffect, useRef, useState } from 'react';
import { demoNow } from '../../engine/days';
import { useT, type T } from '../../i18n/useT';
import { STROOP_BANK, STROOP_COLORS, STROOP_INK, type StroopColor } from '../banks';
import { GameFrame } from '../shared/GameFrame';
import { mean, press, useEnd, useSessionClock, useTimeouts } from '../shared/hooks';
import type { GameProps } from '../types';
import s from './Stroop.module.css';

/** Training: a session is this many answers (or the time cap). */
const TRAINING_TRIALS = 24;
const FEEDBACK_MS = 220;

function colorName(t: T, c: StroopColor): string {
  switch (c) {
    case 'red':
      return t('games.stroop.colors.red');
    case 'blue':
      return t('games.stroop.colors.blue');
    case 'green':
      return t('games.stroop.colors.green');
    case 'black':
      return t('games.stroop.colors.black');
  }
}

/**
 * Stroop (attention). A colour word is shown in a mismatched ink; tap the INK colour.
 * rawScore = correct answers. meta: correct, total, accuracy, meanRtMs (correct answers).
 */
export function Stroop({ mode, form, onDone, durationMs, demoDayOffset = 0 }: GameProps) {
  const t = useT();
  const bank = STROOP_BANK[form];
  const [idx, setIdx] = useState(0);
  const [fb, setFb] = useState<{ choice: StroopColor; ok: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const stats = useRef({ correct: 0, total: 0, rts: [] as number[] });
  const shownAt = useRef(0);
  const timers = useTimeouts();
  const { end } = useEnd(onDone);

  const finish = useCallback(() => {
    timers.clearAll();
    setOver(true);
    const { correct, total, rts } = stats.current;
    end({
      gameId: 'stroop',
      ability: 'attention',
      rawScore: correct,
      form,
      playedAt: demoNow(demoDayOffset),
      meta: { correct, total, accuracy: total ? correct / total : 0, meanRtMs: Math.round(mean(rts)), mode },
    });
  }, [demoDayOffset, end, form, mode, timers]);

  useSessionClock(durationMs, finish);

  useEffect(() => {
    shownAt.current = performance.now();
  }, [idx]);

  const item = bank[idx % bank.length];

  const answer = (c: StroopColor) => {
    if (fb || over) return;
    const rt = performance.now() - shownAt.current;
    const ok = c === item.ink;
    const st = stats.current;
    st.total += 1;
    if (ok) {
      st.correct += 1;
      st.rts.push(rt);
    }
    setScore(st.correct);
    setFb({ choice: c, ok });
    timers.set(() => {
      if (mode === 'training' && st.total >= TRAINING_TRIALS) return finish();
      setFb(null);
      setIdx((i) => i + 1);
    }, FEEDBACK_MS);
  };

  return (
    <GameFrame
      gameId="stroop"
      mode={mode}
      durationMs={durationMs}
      onFinish={finish}
      status={<span>{t('games.common.correctN', { n: score })}</span>}
    >
      <p className={s.prompt}>{t('games.stroop.prompt')}</p>
      <div
        className={[s.card, fb ? (fb.ok ? s.cardOk : s.cardBad) : ''].join(' ')}
        data-testid="stroop-word"
        data-ink={item.ink}
      >
        <span key={idx} className={s.word} style={{ color: STROOP_INK[item.ink] }}>
          {colorName(t, item.word)}
        </span>
      </div>
      <div className={s.options}>
        {STROOP_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={[s.option, fb?.choice === c ? (fb.ok ? s.optOk : s.optBad) : ''].join(' ')}
            style={{ background: STROOP_INK[c] }}
            data-color={c}
            disabled={over}
            {...press(() => answer(c))}
          >
            {colorName(t, c)}
          </button>
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {fb ? (fb.ok ? t('games.common.correct') : t('games.common.wrong')) : ''}
      </p>
    </GameFrame>
  );
}
