import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { demoNow } from '../../engine/days';
import { useT } from '../../i18n/useT';
import { gonogoBank } from '../banks';
import { usePageHidden } from '../shared/activeClock';
import { GameFrame } from '../shared/GameFrame';
import { mean, press, useEnd, useSessionClock } from '../shared/hooks';
import type { GameProps } from '../types';
import s from './GoNoGo.module.css';

/** Go stimulus stays up until tapped or this many ms (then it is an omission). */
const GO_WINDOW_MS = 800;
/** No-Go stimulus is shown this long; tapping it is a commission error. */
const NOGO_MS = 700;
const FB_OK_MS = 250;
const FB_BAD_MS = 450;
const TRAINING_STIMULI = 30;

type Phase = 'isi' | 'stim' | 'fb';
type Outcome = 'hit' | 'miss' | 'fa' | 'cr';

/**
 * Go/No-Go (speed). Green circle → tap as fast as possible; red circle → don't tap.
 * rawScore = mean RT (ms) of correct Go taps (0 if there were none).
 * meta.accuracy = balanced accuracy = (hit rate + correct-rejection rate) / 2, so both omission
 * and commission errors count (tapping everything → 0.5). meta.correct = hits + correct
 * rejections, meta.total = stimuli resolved, meta.meanRtMs = rawScore.
 */
export function GoNoGo({ mode, form, seed = 0, onDone, durationMs, demoDayOffset = 0 }: GameProps) {
  const t = useT();
  const bank = useMemo(() => gonogoBank(form, seed), [form, seed]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('isi');
  const [fb, setFb] = useState<{ o: Outcome; rt?: number } | null>(null);
  const [over, setOver] = useState(false);
  const stats = useRef({ hits: 0, misses: 0, fa: 0, cr: 0, rts: [] as number[] });
  const shownAt = useRef(0);
  const resolvedIdx = useRef(-1);
  const { end } = useEnd(onDone);

  const finish = useCallback(() => {
    setOver(true);
    const { hits, misses, fa, cr, rts } = stats.current;
    const goN = hits + misses;
    const nogoN = fa + cr;
    const total = goN + nogoN;
    const hitRate = goN ? hits / goN : 0;
    const crRate = nogoN ? cr / nogoN : 1;
    const meanRt = Math.round(mean(rts));
    end({
      gameId: 'gonogo',
      ability: 'speed',
      rawScore: meanRt,
      form,
      playedAt: demoNow(demoDayOffset),
      meta: {
        correct: hits + cr,
        total,
        accuracy: total ? (hitRate + crRate) / 2 : 0,
        meanRtMs: meanRt,
        mode,
      },
    });
  }, [demoDayOffset, end, form, mode]);

  useSessionClock(durationMs, finish);

  const item = bank[idx % bank.length];

  const resolve = useCallback(
    (tapped: boolean) => {
      if (resolvedIdx.current === idx) return;
      resolvedIdx.current = idx;
      const st = stats.current;
      let o: Outcome;
      let rt: number | undefined;
      if (item.kind === 'go') {
        if (tapped) {
          rt = Math.round(performance.now() - shownAt.current);
          st.rts.push(rt);
          st.hits += 1;
          o = 'hit';
        } else {
          st.misses += 1;
          o = 'miss';
        }
      } else if (tapped) {
        st.fa += 1;
        o = 'fa';
      } else {
        st.cr += 1;
        o = 'cr';
      }
      setFb({ o, rt });
      setPhase('fb');
    },
    [idx, item.kind],
  );

  // Paused while the page is hidden: no trials run (or count as misses) in the background.
  const hidden = usePageHidden();
  useEffect(() => {
    if (over || hidden) return;
    let id = 0;
    if (phase === 'isi') {
      id = window.setTimeout(() => setPhase('stim'), item.isiMs);
    } else if (phase === 'stim') {
      shownAt.current = performance.now();
      id = window.setTimeout(() => resolve(false), item.kind === 'go' ? GO_WINDOW_MS : NOGO_MS);
    } else {
      const okFb = fb?.o === 'hit' || fb?.o === 'cr';
      id = window.setTimeout(
        () => {
          const st = stats.current;
          const n = st.hits + st.misses + st.fa + st.cr;
          if ((mode === 'training' && n >= TRAINING_STIMULI) || n >= bank.length) return finish();
          setFb(null);
          setIdx((i) => i + 1);
          setPhase('isi');
        },
        okFb ? FB_OK_MS : FB_BAD_MS,
      );
    }
    return () => window.clearTimeout(id);
  }, [phase, idx, over, hidden, item, resolve, fb, mode, bank.length, finish]);

  const onTap = () => {
    if (over || phase !== 'stim') return;
    resolve(true);
  };

  const st = stats.current;
  const shownStim = phase === 'stim' ? item.kind : null;
  return (
    <GameFrame
      gameId="gonogo"
      mode={mode}
      durationMs={durationMs}
      onFinish={finish}
      status={
        <>
          <span>{t('games.common.correctN', { n: st.hits + st.cr })}</span>
          {st.rts.length > 0 && <span>{t('games.gonogo.avg', { n: Math.round(mean(st.rts)) })}</span>}
        </>
      }
    >
      <div
        className={[s.stage, fb && (fb.o === 'fa' || fb.o === 'miss') ? s.stageBad : ''].join(' ')}
        data-testid="gonogo-stage"
        data-stim={shownStim ?? 'none'}
        role="button"
        tabIndex={0}
        aria-label={t('games.gonogo.stage')}
        {...press(onTap)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onTap();
          }
        }}
      >
        {shownStim === 'go' && <span className={[s.circle, s.go].join(' ')} />}
        {shownStim === 'nogo' && (
          <span className={[s.circle, s.nogo].join(' ')}>
            <span className={s.stopBar} />
          </span>
        )}
        {phase === 'isi' && <span className={s.fix}>+</span>}
        {phase === 'fb' && fb && (
          <span className={[s.fb, fb.o === 'hit' || fb.o === 'cr' ? s.fbOk : s.fbBad].join(' ')} aria-live="polite">
            {fb.o === 'hit'
              ? t('games.gonogo.ms', { n: fb.rt ?? 0 })
              : fb.o === 'cr'
                ? t('games.common.correct')
                : fb.o === 'fa'
                  ? t('games.gonogo.dontTap')
                  : t('games.gonogo.tooSlow')}
          </span>
        )}
      </div>
      <div className={s.legend} aria-hidden="true">
        <span className={s.legendItem}>
          <span className={[s.dot, s.go].join(' ')} /> {t('games.gonogo.legendGo')}
        </span>
        <span className={s.legendItem}>
          <span className={[s.dot, s.nogo].join(' ')} /> {t('games.gonogo.legendNoGo')}
        </span>
      </div>
    </GameFrame>
  );
}
