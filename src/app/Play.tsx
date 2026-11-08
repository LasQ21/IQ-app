import { useEffect, useRef, useState } from 'react';
import { FAST_WARMUP_MS, TRAINING_MAX_MS } from '../config';
import { dayKey, demoNow, SECOND_ROUND_SERIES_TIER, TRAINING_FORM, trainingSeedDayOf, trainingSlot } from '../engine';
import { FLASH_FIRST_LEVEL } from '../engine/timing';
import { trainingSeed } from '../games/banks';
import { GAMES } from '../games';
import { useT } from '../i18n/useT';
import { useStore } from '../state/store';
import { setPlaying } from '../playing';
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
  // Fast jury mode: the onboarding warm-up skips the intro card and is short, so Landing → Index stays ≈ 1 minute.
  const warmup = from === 'onboarding' && state.fastMode;
  const [phase, setPhase] = useState<'intro' | 'play'>(warmup ? 'play' : 'intro');
  const startedAt = useRef(warmup ? Date.now() : 0);

  useEffect(() => {
    if (!def) navigate(PATHS.today, { replace: true });
  }, [def]);
  useEffect(() => {
    setPlaying(phase === 'play');
    return () => setPlaying(false);
  }, [phase]);

  if (!def) return null;
  // Training never sees assessment items: generated items ('T'), seeded per demo-day and slot of the day.
  const today = dayKey(demoNow(state.demoDayOffset));
  const seed = trainingSeed(trainingSeedDayOf(today), trainingSlot(state.results, today));
  // ?variant=second → second weak-zone round today (Series starts after the warm-up); ?start=N overrides.
  const startParam = Number(route.query.get('start'));
  const second = route.query.get('variant') === 'second';
  let startLevel: number | undefined;
  if (def.adaptive) {
    // FlashGrid №41: first session at level 3, then one below the FINAL level of the last session.
    const last = [...state.results].reverse().find((r) => r.gameId === gameId);
    const lastFinal = last ? (last.level ?? last.meta?.maxLevel) : undefined;
    startLevel = Number.isFinite(lastFinal) ? Math.max(2, (lastFinal as number) - 1) : FLASH_FIRST_LEVEL;
  } else if (gameId === 'series' && second) {
    startLevel = SECOND_ROUND_SERIES_TIER;
  }
  if (Number.isFinite(startParam) && startParam > 0) startLevel = startParam;
  const Game = def.component;

  const onDone = (result: GameResult) => {
    if (from === 'onboarding') dispatch({ type: 'setStage', stage: 'home' });
    // "Finish" before a single trial: nothing was measured → no index gain, no streak.
    if (result.meta?.total === 0) {
      navigate(PATHS.today, { replace: true });
      return;
    }
    const stamped = { ...result, meta: { ...result.meta, mode: 'training' as const } };
    dispatch({ type: 'trainingDone', result: stamped, durationMs: Date.now() - startedAt.current, variant: second ? 'second' : undefined });
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
            form={TRAINING_FORM}
            seed={seed}
            durationMs={warmup ? FAST_WARMUP_MS : TRAINING_MAX_MS}
            startLevel={startLevel}
            demoDayOffset={state.demoDayOffset}
            onDone={onDone}
          />
        </div>
      )}
    </Screen>
  );
}
