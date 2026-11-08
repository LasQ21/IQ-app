import { useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n/useT';
import { usePageHidden } from './activeClock';
import { press } from './hooks';
import s from './SeqGrid.module.css';

export type CellMark = 'tap' | 'ok' | 'bad' | 'hint';

/**
 * Plays `seq` (cell indices) while `playing` is true: each cell lights for `onMs`, one every `stepMs`,
 * after `leadMs`. Calls `onEnd` when finished. Re-runs for every new `trialKey`.
 * StrictMode-safe: all timers belong to the effect and are cleared in its cleanup.
 * If the page is hidden mid-playback, playback stops and the whole sequence replays on return.
 */
export function useFlashPlayback(
  seq: number[],
  playing: boolean,
  trialKey: number,
  onEnd: () => void,
  { onMs, stepMs, leadMs }: { onMs: number; stepMs: number; leadMs: number },
): number | null {
  const [lit, setLit] = useState<number | null>(null);
  const hidden = usePageHidden();
  const run = playing && !hidden;
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  });
  useEffect(() => {
    if (!run) return;
    const ids: number[] = [];
    seq.forEach((cell, i) => {
      ids.push(window.setTimeout(() => setLit(cell), leadMs + i * stepMs));
      ids.push(window.setTimeout(() => setLit(null), leadMs + i * stepMs + onMs));
    });
    ids.push(window.setTimeout(() => endRef.current(), leadMs + seq.length * stepMs));
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      setLit(null);
    };
  }, [run, trialKey, seq, onMs, stepMs, leadMs]);
  return lit;
}

export function SeqGrid({
  n,
  lit,
  marks,
  inputOn,
  flash,
  onCell,
  testId,
}: {
  n: number;
  lit: number | null;
  marks: Record<number, CellMark>;
  inputOn: boolean;
  /** whole-grid feedback after a trial */
  flash: 'ok' | 'bad' | null;
  onCell: (cell: number) => void;
  testId: string;
}) {
  const t = useT();
  return (
    <div
      className={[s.grid, n === 4 ? s.grid4 : s.grid3, flash === 'ok' ? s.gridOk : flash === 'bad' ? s.gridBad : '', inputOn ? s.live : ''].join(' ')}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      data-testid={testId}
      data-input={inputOn ? 'on' : 'off'}
    >
      {Array.from({ length: n * n }, (_, i) => {
        const m = marks[i];
        const cls = [s.cell, lit === i ? s.lit : '', m ? s[m] : ''].join(' ');
        return (
          <button
            key={i}
            type="button"
            className={cls}
            data-cell={i}
            data-lit={lit === i ? '1' : undefined}
            aria-label={t('games.common.cell', { n: i + 1 })}
            aria-disabled={!inputOn}
            {...press(() => {
              if (inputOn) onCell(i);
            })}
          />
        );
      })}
    </div>
  );
}
