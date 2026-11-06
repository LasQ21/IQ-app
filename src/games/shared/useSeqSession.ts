import { useCallback, useRef, useState } from 'react';
import { seqFor, type SeqBank } from '../banks';
import { useFlashPlayback, type CellMark } from './SeqGrid';
import { useSessionClock, useTimeouts } from './hooks';

export interface SeqStats {
  correct: number;
  total: number;
  /** longest sequence reproduced correctly (0 if none) */
  bestLen: number;
  /** cells recalled in the right order across all trials (full length if correct, else the correct prefix) */
  recalled: number;
  /** longest sequence presented */
  maxLen: number;
  /** length the next trial would use (after the last answer) */
  finalLen: number;
  /** ms between taps during input */
  tapRts: number[];
}

export type SeqPhase = 'show' | 'input' | 'fb';

/**
 * Shared loop for "watch the cells flash, then repeat them" games.
 * `advance(len, correct)` decides the next sequence length (Corsi rule or the 2-up/1-down staircase).
 */
export function useSeqSession({
  bank,
  startLen,
  advance,
  mode,
  durationMs,
  trainingTrials,
  timing,
  onFinish,
}: {
  bank: SeqBank;
  startLen: number;
  advance: (len: number, correct: boolean) => number;
  mode: 'assessment' | 'training';
  durationMs?: number;
  trainingTrials: number;
  timing: { onMs: number; stepMs: number; leadMs: number };
  onFinish: (stats: SeqStats) => void;
}) {
  const attempts = useRef<Record<number, number>>({ [startLen]: 1 });
  const [len, setLen] = useState(startLen);
  const [seq, setSeq] = useState(() => seqFor(bank, startLen, 0));
  const [trial, setTrial] = useState(0);
  const [phase, setPhase] = useState<SeqPhase>('show');
  const [marks, setMarks] = useState<Record<number, CellMark>>({});
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<number[]>([]);
  const lastTap = useRef(0);
  const stats = useRef<SeqStats>({ correct: 0, total: 0, bestLen: 0, recalled: 0, maxLen: startLen, finalLen: startLen, tapRts: [] });
  const timers = useTimeouts();

  const finish = useCallback(() => {
    timers.clearAll();
    setOver(true);
    setPhase('fb');
    onFinish({ ...stats.current });
  }, [onFinish, timers]);

  useSessionClock(durationMs, finish);

  const lit = useFlashPlayback(
    seq,
    phase === 'show' && !over,
    trial,
    () => {
      input.current = [];
      lastTap.current = performance.now();
      setPhase('input');
    },
    timing,
  );

  const startTrial = (nextLen: number) => {
    const k = attempts.current[nextLen] ?? 0;
    attempts.current[nextLen] = k + 1;
    stats.current.maxLen = Math.max(stats.current.maxLen, nextLen);
    setLen(nextLen);
    setSeq(seqFor(bank, nextLen, k));
    setMarks({});
    setFlash(null);
    setTrial((x) => x + 1);
    setPhase('show');
  };

  const conclude = (correct: boolean) => {
    const st = stats.current;
    st.total += 1;
    st.recalled += correct ? len : input.current.length;
    if (correct) {
      st.correct += 1;
      st.bestLen = Math.max(st.bestLen, len);
    }
    const nextLen = advance(len, correct);
    st.finalLen = nextLen;
    setFlash(correct ? 'ok' : 'bad');
    setPhase('fb');
    timers.set(
      () => {
        if (mode === 'training' && st.total >= trainingTrials) return finish();
        startTrial(nextLen);
      },
      correct ? 550 : 800,
    );
    return nextLen;
  };

  const onCell = (cell: number) => {
    if (phase !== 'input' || over) return;
    const now = performance.now();
    stats.current.tapRts.push(now - lastTap.current);
    lastTap.current = now;
    const pos = input.current.length;
    if (cell === seq[pos]) {
      input.current.push(cell);
      if (input.current.length === seq.length) {
        setMarks(Object.fromEntries(seq.map((c) => [c, 'ok' as CellMark])));
        conclude(true);
      } else {
        setMarks((m) => ({ ...m, [cell]: 'tap' }));
        timers.set(
          () =>
            setMarks((m) => {
              if (m[cell] !== 'tap') return m;
              const n = { ...m };
              delete n[cell];
              return n;
            }),
          220,
        );
      }
    } else {
      setMarks({ [cell]: 'bad', [seq[pos]]: 'hint' });
      conclude(false);
    }
  };

  return { len, seq, trial, phase, lit, marks, flash, over, onCell, finish, stats };
}
