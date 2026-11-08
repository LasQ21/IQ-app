import { navigate, PATHS } from '../../app/router';
import { formatJPY, PRICE_JPY_4W, TRIAL_JPY } from '../../config';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Disclaimer } from '../../ui/Disclaimer';
import { Screen } from '../../ui/Screen';
import { ClockIcon, OwnedIcon, RepeatIcon, TargetIcon } from './icons';
import s from './funnel.module.css';

const WEEKS = [1, 2, 3, 4];
/** One 4-week period = 28 daily sessions. */
const DAYS_4W = 28;

/** Sells the plan and the visible progress, not a one-off report. No payment step in the demo. */
export function Paywall() {
  const t = useT();
  const { state, dispatch } = useStore();
  const baseline = state.baseline;
  if (!baseline) return null;
  const weak = baseline.weakest;
  const weakName = t(`common.abilities.${weak}`);
  const now = Math.round(baseline.scores[weak]);
  const perDay = formatJPY(Math.round(PRICE_JPY_4W / DAYS_4W));

  const start = () => {
    dispatch({ type: 'setStage', stage: 'onboarding' });
    navigate(PATHS.onboarding);
  };

  return (
    <Screen juryKey="paywall" className={s.root}>
      <div className={s.head}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          {t('funnel.paywall.eyebrow')}
        </span>
        <h1 className={s.title}>{t('funnel.paywall.title')}</h1>
      </div>

      <Card className={s.planCard}>
        <div className={s.planTop}>
          <span className="muted small">{t('funnel.paywall.weakLabel')}</span>
          <span className={s.planWeak} data-testid="paywall-weak">
            {weakName}
          </span>
        </div>
        <ul className={s.features}>
          <li className={`${s.feature} ${s.featureOwned}`} data-testid="paywall-profile-yours">
            <span className={s.featureIcon}>
              <OwnedIcon />
            </span>
            {t('funnel.paywall.profileYours')}
          </li>
          <li className={s.feature}>
            <span className={s.featureIcon}>
              <ClockIcon />
            </span>
            {t('funnel.paywall.perDay')}
          </li>
          <li className={s.feature}>
            <span className={s.featureIcon}>
              <TargetIcon />
            </span>
            {t('funnel.paywall.focus', { ability: weakName })}
          </li>
          <li className={s.feature}>
            <span className={s.featureIcon}>
              <RepeatIcon />
            </span>
            {t('funnel.paywall.retest')}
          </li>
        </ul>

        <div
          className={s.timeline}
          role="img"
          aria-label={t('funnel.paywall.timelineLabel', { ability: weakName, score: now })}
        >
          <div className={s.tlCol}>
            <div className={s.tlBarBox}>
              <span className={s.tlValue}>{now}</span>
              {/* 0–100 → 8–72 px so the value label always fits above the bar */}
              <div className={s.tlBarNow} style={{ height: 8 + Math.round((Math.min(100, Math.max(0, now)) / 100) * 64) }} />
            </div>
            <span className={s.tlLabel}>{t('funnel.paywall.now')}</span>
          </div>
          <div className={s.tlTrack} aria-hidden>
            <div className={s.tlLine}>
              <div className={s.tlWeeks}>
                {WEEKS.map((w) => (
                  <span key={w} className={s.tlWeek}>
                    <span className={s.tlDot} />
                    {t('funnel.paywall.week', { n: w })}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className={s.tlCol}>
            <div className={s.tlBarBox}>
              <div className={s.tlBarLater}>?</div>
            </div>
            <span className={s.tlLabel}>{t('funnel.paywall.day30')}</span>
          </div>
        </div>
        <p className="muted small">{t('funnel.paywall.timelineNote')}</p>
      </Card>

      {state.juryMode && (
        <aside className={s.juryChange} aria-label={t('common.jury')} data-testid="paywall-jury-change">
          <span className={s.juryWas}>{t('jury.paywall.was')}</span>
          <span>
            <span aria-hidden="true">→ </span>
            <b>{t('jury.paywall.now')}</b>
          </span>
          <span className={s.juryAb}>{t('jury.paywall.ab')}</span>
        </aside>
      )}

      {/* The price lives inside the sticky bar, right above the button, so the bar can never cover it. */}
      <div className={`${s.cta} ${s.sticky} ${s.payBar}`}>
        <div className={s.price} data-testid="paywall-price">
          <div className={s.priceMain}>
            <span className="muted small">{t('funnel.paywall.trial')}</span>
            <span className={s.priceBig}>{formatJPY(TRIAL_JPY)}</span>
          </div>
          <div className={s.priceThen}>
            <span>{t('funnel.paywall.then', { price: formatJPY(PRICE_JPY_4W) })}</span>
            <b className={s.perDay} data-testid="paywall-per-day">
              {t('funnel.paywall.perDayPrice', { price: perDay })}
            </b>
          </div>
        </div>
        <Button block className={s.ctaBtn} onClick={start} data-testid="paywall-start">
          {t('funnel.paywall.start')}
        </Button>
        <p className={s.note}>{t('funnel.paywall.demoNote')}</p>
      </div>

      <div className={s.legal}>
        <p>{t('funnel.paywall.cancel')}</p>
        <p>{t('common.illustrative')}</p>
        <Disclaimer />
      </div>
    </Screen>
  );
}
