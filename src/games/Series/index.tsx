import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { demoNow } from '../../engine/days';
import { useT } from '../../i18n/useT';
import { SERIES_FEEDBACK_MS, playedMs } from '../../engine/timing';
import { seriesBank } from '../banks';
import { GameFrame } from '../shared/GameFrame';
import { mean, press, useEnd, useSessionClock, useTimeouts } from '../shared/hooks';
import type { GameProps } from '../types';
import s from './Series.module.css';


/**
 * Number series (logic). Pick the next number from 4 options; items get harder in a fixed order
 * (4 short warm-up items first, so a 15 s run measures ≥ 4 answers).
 * rawScore = correct answers. meta: correct, total (answered), accuracy, meanRtMs (per answer).
 * Training: generated items (`seed`), from tier `startLevel` (default 1), 12 items or the time cap.
 */
export function Series({ mode, form, seed, startLevel, onDone, durationMs, demoDayOffset = 0 }: GameProps) {
  const t = useT();
  const bank = useMemo(() => seriesBank(form, seed, startLevel), [form, seed, startLevel]);
  const [idx, setIdx] = useState(0);
  const [fb, setFb] = useState<{ choice: number; ok: boolean } | null>(null);
  const [over, setOver] = useState(false);
  const stats = useRef({ correct: 0, total: 0, rts: [] as number[] });
  const shownAt = useRef(0);
  const startedAt = useRef(0);
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
      meta: {
        correct,
        total,
        accuracy: total ? correct / total : 0,
        meanRtMs: Math.round(mean(rts)),
        durationMs: playedMs(startedAt.current, durationMs),
        mode,
      },
    });
  }, [demoDayOffset, durationMs, end, form, mode, timers]);

  useSessionClock(durationMs, finish);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

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
      ok ? SERIES_FEEDBACK_MS.ok : SERIES_FEEDBACK_MS.bad,
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
      <div key={idx} className={s.seq} data-testid="series-seq" data-answer={item.answer} data-tier={item.tier}>
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
