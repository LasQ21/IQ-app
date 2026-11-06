import { useEffect, useRef, useState } from 'react';
import { TRAINING_MAX_MS } from '../config';
import { pickForm } from '../engine';
import { GAMES } from '../games';
import { useT } from '../i18n/useT';
import { useStore } from '../state/store';
import type { GameId, GameResult } from '../state/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Screen } from '../ui/Screen';
import { navigate, PATHS, useRoute } from './router';
import s from './app.module.css';

/** Training session for one game: /play/:gameId?from=onboarding|today */
export function Play() {
  const t = useT();
  const route = useRoute();
  const { state, dispatch } = useStore();
  const gameId = route.segments[1] as GameId;
  const from = route.query.get('from') ?? 'today';
  const def = GAMES[gameId];
  const [phase, setPhase] = useState<'intro' | 'play'>('intro');
  const startedAt = useRef(0);

  useEffect(() => {
    if (!def) navigate(PATHS.today, { replace: true });
  }, [def]);

  if (!def) return null;
  const form = pickForm(state.results, def.ability);
  const lastLevel = [...state.results].reverse().find((r) => r.gameId === gameId)?.meta?.maxLevel;
  const startLevel = def.adaptive ? Math.max(2, (lastLevel ?? 3) - 1) : undefined;
  const Game = def.component;

  const onDone = (result: GameResult) => {
    if (from === 'onboarding') dispatch({ type: 'setStage', stage: 'home' });
    // "Finish" before a single trial: nothing was measured → no index gain, no streak.
    if (result.meta?.total === 0) {
      navigate(PATHS.today, { replace: true });
      return;
    }
    const stamped = { ...result, meta: { ...result.meta, mode: 'training' as const } };
    dispatch({ type: 'trainingDone', result: stamped, durationMs: Date.now() - startedAt.current });
    navigate(`${PATHS.index}?from=${from}`, { replace: true });
  };

  return (
    <Screen juryKey={gameId === 'flash41' ? 'flash41' : 'today'}>
      {phase === 'intro' ? (
        <Card className="stack">
          <p className="muted small">{t(`common.abilities.${def.ability}`)}</p>
          <h2>{t(`games.${gameId}.name`)}</h2>
          <p>{t(`games.${gameId}.howto`)}</p>
          <Button
            block
            data-testid="game-start"
            onClick={() => {
              startedAt.current = Date.now();
              setPhase('play');
            }}
          >
            {t('common.start')}
          </Button>
        </Card>
      ) : (
        <div className={s.gameArea}>
          <Game
            mode="training"
            form={form}
            durationMs={TRAINING_MAX_MS}
            startLevel={startLevel}
            demoDayOffset={state.demoDayOffset}
            onDone={onDone}
          />
        </div>
      )}
    </Screen>
  );
}
