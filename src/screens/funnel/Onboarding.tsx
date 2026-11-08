import { navigate, PATHS } from '../../app/router';
import { GAMES } from '../../games';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import type { GameId } from '../../state/types';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { AbilityIcon } from './icons';
import s from './funnel.module.css';

const WARMUP_GAME: GameId = 'flash41';

/**
 * Straight from the paywall into the first exercise — no empty "welcome" screen.
 * "Now" is the first card: an exercise for the weak spot; if the plan has none, FlashGrid №41 as a
 * warm-up ("feel the level grow").
 */
export function Onboarding() {
  const t = useT();
  const { state } = useStore();
  const weak = state.baseline?.weakest;
  const plan = (state.plan?.items ?? []).map((it, i) => ({ ...it, i }));
  const open = plan.filter((it) => !it.done);
  const now =
    open.find((it) => GAMES[it.gameId].ability === weak) ??
    open.find((it) => it.gameId === WARMUP_GAME) ??
    open[0] ??
    plan[0];
  const items = now ? [now, ...plan.filter((it) => it.i !== now.i)] : plan;
  const firstGame: GameId = now?.gameId ?? WARMUP_GAME;
  const warmup = firstGame === WARMUP_GAME && GAMES[firstGame].ability !== weak;

  return (
    <Screen juryKey="onboarding" className={s.root}>
      <div className={s.head}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          {t('funnel.onboarding.eyebrow')}
        </span>
        <h1 className={s.title}>{t('funnel.onboarding.title')}</h1>
        <p className={s.lead}>{t('funnel.onboarding.sub')}</p>
      </div>

      <section className={s.planSection} aria-labelledby="ob-plan">
        <h3 id="ob-plan">{t('funnel.onboarding.planTitle')}</h3>
        <ol className={s.steps} data-testid="onboarding-plan">
          {items.map((it, i) => {
            const def = GAMES[it.gameId];
            const isNow = it === now;
            const isWeak = def.ability === weak;
            return (
              <li
                key={`${it.gameId}-${it.i}`}
                className={[s.step, isNow ? s.stepNow : ''].join(' ')}
                data-game={it.gameId}
                data-now={isNow || undefined}
              >
                <span className={s.stepNum}>{i + 1}</span>
                <span className={s.stepBody}>
                  <span className={s.stepName}>{t(`games.${it.gameId}.name`)}</span>
                  {isNow && warmup && <span className={s.stepWarmup}>{t('funnel.onboarding.warmup')}</span>}
                  <span className={s.stepMeta}>
                    <span className={s.stepMetaIcon}>
                      <AbilityIcon ability={def.ability} />
                    </span>
                    {t(`common.abilities.${def.ability}`)}
                  </span>
                </span>
                <span className={s.stepTags}>
                  {isNow ? (
                    <span className={`${s.tag} ${s.tagAccent}`}>{t('funnel.onboarding.now')}</span>
                  ) : (
                    <span className={`${s.tag} ${s.tagMuted}`}>{t('funnel.onboarding.later')}</span>
                  )}
                  {isWeak && <span className={`${s.tag} ${s.tagRisk}`}>{t('funnel.onboarding.weakTag')}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={`${s.cta} ${s.sticky}`}>
        <Button
          block
          className={s.ctaBtn}
          onClick={() => navigate(PATHS.play(firstGame, 'onboarding'))}
          data-game={firstGame}
          data-testid="onboarding-start"
        >
          {t('funnel.onboarding.start')}
        </Button>
        <p className={s.note}>{t('funnel.onboarding.note')}</p>
      </div>
    </Screen>
  );
}
