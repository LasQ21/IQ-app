import { useCallback, useEffect, useRef, useState } from 'react';
import { demoNow } from '../../engine/days';
import { useT } from '../../i18n/useT';
import { SERIES_BANK } from '../banks';
import { GameFrame } from '../shared/GameFrame';
import { mean, press, useEnd, useSessionClock, useTimeouts } from '../shared/hooks';
import type { GameProps } from '../types';
import s from './Series.module.css';

const FEEDBACK_OK_MS = 450;
const FEEDBACK_BAD_MS = 900;

/**
 * Number series (logic). Pick the next number from 4 options; items get harder in a fixed order.
 * rawScore = correct answers. meta: correct, total (answered), accuracy, meanRtMs (per answer).
 * Training: the whole bank (12 items) or the time cap.
 */
export function Series({ mode, form, onDone, durationMs, demoDayOffset = 0 }: GameProps) {
  const t = useT();
  const bank = SERIES_BANK[form];
  const [idx, setIdx] = useState(0);
  const [fb, setFb] = useState<{ choice: number; ok: boolean } | null>(null);
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
      gameId: 'series',
      ability: 'logic',
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

  const answer = (pos: number) => {
    if (fb || over) return;
    const st = stats.current;
    st.rts.push(performance.now() - shownAt.current);
    st.total += 1;
    const ok = pos === item.answerPos;
    if (ok) st.correct += 1;
    setFb({ choice: pos, ok });
    timers.set(
      () => {
        if (st.total >= bank.length) return finish();
        setFb(null);
        setIdx((i) => i + 1);
      },
      ok ? FEEDBACK_OK_MS : FEEDBACK_BAD_MS,
    );
  };

  return (
    <GameFrame
      gameId="series"
      mode={mode}
      durationMs={durationMs}
      onFinish={finish}
      status={
        <>
          <span>{t('games.series.item', { n: idx + 1 })}</span>
          <span>{t('games.common.correctN', { n: stats.current.correct })}</span>
        </>
      }
    >
      <p className={s.prompt}>{t('games.series.prompt')}</p>
      <div key={idx} className={s.seq} data-testid="series-seq" data-answer={item.answer}>
        {item.shown.map((v, i) => (
          <span key={i} className={s.term}>
            {v}
          </span>
        ))}
        <span className={[s.term, s.ask, fb ? (fb.ok ? s.askOk : s.askBad) : ''].join(' ')}>
          {fb ? item.answer : '?'}
        </span>
      </div>
      <div className={s.options}>
        {item.options.map((v, pos) => {
          const cls = [
            s.option,
            fb && fb.choice === pos ? (fb.ok ? s.optOk : s.optBad) : '',
            fb && !fb.ok && pos === item.answerPos ? s.optHint : '',
          ].join(' ');
          return (
            <button key={`${idx}-${pos}`} type="button" className={cls} data-value={v} disabled={over} {...press(() => answer(pos))}>
              {v}
            </button>
          );
        })}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {fb ? (fb.ok ? t('games.common.correct') : t('games.common.wrong')) : ''}
      </p>
    </GameFrame>
  );
}
