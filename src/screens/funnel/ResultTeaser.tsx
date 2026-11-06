import { navigate, PATHS } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { ABILITIES } from '../../state/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Radar } from '../../ui/Radar';
import { Screen } from '../../ui/Screen';
import { SparkIcon } from './icons';
import s from './funnel.module.css';

/** Ability profile with the weak zone highlighted. Deliberately no single "IQ" number. */
export function ResultTeaser() {
  const t = useT();
  const { state, dispatch } = useStore();
  const baseline = state.baseline;
  if (!baseline) return null; // App guards this route; keeps TS happy
  const weak = baseline.weakest;
  const weakName = t(`common.abilities.${weak}`);
  const [before, after = ''] = t('funnel.teaser.title').split('{ability}');

  const next = () => {
    dispatch({ type: 'setStage', stage: 'paywall' });
    navigate(PATHS.paywall);
  };

  return (
    <Screen juryKey="teaser" className={s.root}>
      <div className={s.head}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          {t('funnel.teaser.eyebrow')}
        </span>
        <h1 className={s.title} data-testid="teaser-weak" data-ability={weak}>
          {before}
          <span className={s.weakWord}>{weakName}</span>
          {after}
        </h1>
      </div>

      <Card className={`stack ${s.radarCard}`}>
        <Radar scores={baseline.scores} highlight={weak} size={232} />
        <ul className={s.bars} aria-label={t('funnel.teaser.scoresLabel')}>
          {ABILITIES.map((a) => {
            const v = Math.round(baseline.scores[a]);
            const isWeak = a === weak;
            return (
              <li key={a} className={[s.barRow, isWeak ? s.barRowWeak : ''].join(' ')}>
                <span className={s.barLabel}>{t(`common.abilities.${a}`)}</span>
                <span className={s.track} aria-hidden>
                  <span className={s.fill} style={{ width: `${Math.max(3, v)}%` }} />
                </span>
                <span className={s.barValue}>{v}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card tone="accent" className={s.message}>
        <span className={s.messageIcon}>
          <SparkIcon />
        </span>
        <span className={s.messageText}>
          <b>{t('funnel.teaser.startTitle')}</b>
          <span className="small">{t('funnel.teaser.startBody', { ability: weakName })}</span>
        </span>
      </Card>

      <div className={`${s.cta} ${s.sticky}`}>
        <Button block className={s.ctaBtn} onClick={next} data-testid="teaser-next">
          {t('funnel.teaser.next')}
        </Button>
      </div>
    </Screen>
  );
}
