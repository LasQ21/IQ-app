import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameId } from '../../state/types';
import { useT } from '../../i18n/useT';
import { press } from './hooks';
import s from './GameFrame.module.css';

/**
 * Common chrome for every game: a status line, a slim countdown bar (assessment and training cap)
 * and, in training mode, a small always-visible "Finish" button.
 */
export function GameFrame({
  gameId,
  mode,
  durationMs,
  status,
  onFinish,
  children,
}: {
  gameId: GameId;
  mode: 'assessment' | 'training';
  durationMs?: number;
  status?: ReactNode;
  onFinish?: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const barRef = useRef<HTMLDivElement>(null);
  const total = durationMs && durationMs > 0 ? durationMs : 0;
  const [secs, setSecs] = useState(Math.ceil(total / 1000));

  useEffect(() => {
    if (!total) return;
    const start = performance.now();
    let raf = 0;
    let last = -1;
    const tick = () => {
      const left = Math.max(0, total - (performance.now() - start));
      if (barRef.current) barRef.current.style.transform = `scaleX(${left / total})`;
      const sec = Math.ceil(left / 1000);
      if (sec !== last) {
        last = sec;
        setSecs(sec);
      }
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  return (
    <div className={s.frame} data-testid="game" data-game={gameId} data-mode={mode}>
      <div className={s.top}>
        <div className={s.status}>{status}</div>
        {total > 0 && (
          <span className={s.secs} aria-hidden="true">
            {t('games.common.secondsLeft', { n: secs })}
          </span>
        )}
        {mode === 'training' && onFinish && (
          <button type="button" className={s.finish} data-testid="game-finish" {...press(onFinish)}>
            {t('games.common.finish')}
          </button>
        )}
      </div>
      {total > 0 && (
        <div
          className={s.bar}
          role="progressbar"
          aria-label={t('games.common.timeLeft')}
          aria-valuemin={0}
          aria-valuemax={Math.ceil(total / 1000)}
          aria-valuenow={secs}
        >
          <div ref={barRef} className={[s.barFill, mode === 'training' ? s.barTraining : ''].join(' ')} />
        </div>
      )}
      <div className={s.body}>{children}</div>
    </div>
  );
}
