// PHASE-1 PLACEHOLDER game so screens can be built before subagent B lands the real games.
import { useEffect, useRef, useState } from 'react';
import type { GameProps } from './types';
import type { Ability, GameId } from '../state/types';
import { demoNow } from '../engine/days';

export function makePlaceholder(gameId: GameId, ability: Ability) {
  return function PlaceholderGame({ mode, form, onDone, durationMs, demoDayOffset = 0 }: GameProps) {
    const [hits, setHits] = useState(0);
    const done = useRef(false);
    const finish = (n: number) => {
      if (done.current) return;
      done.current = true;
      const acc = Math.min(1, n / 10);
      onDone({
        gameId,
        ability,
        rawScore: n,
        form,
        level: gameId === 'flash41' ? 2 + Math.min(7, Math.floor(n / 2)) : undefined,
        playedAt: demoNow(demoDayOffset),
        meta: { correct: n, total: 10, accuracy: acc, mode },
      });
    };
    useEffect(() => {
      if (!durationMs) return;
      const id = window.setTimeout(() => finish(hits), durationMs);
      return () => window.clearTimeout(id);
    });
    return (
      <div style={{ display: 'grid', gap: 12, placeItems: 'center', padding: 24 }}>
        <p>
          [{gameId}] placeholder · {mode} · form {form}
        </p>
        <button type="button" style={{ minHeight: 64, minWidth: 160 }} onClick={() => setHits((h) => h + 1)}>
          tap ({hits})
        </button>
        <button type="button" style={{ minHeight: 44 }} onClick={() => finish(hits)}>
          finish
        </button>
      </div>
    );
  };
}
