import { useState } from 'react';
import { navigate, PATHS } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { ABILITIES } from '../../state/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Radar } from '../../ui/Radar';
import { Screen } from '../../ui/Screen';
import { EconomicsLink } from '../economics';
import { ArrowIcon } from './icons';
import { RadarLegend, streakText } from './parts';
import s from './progress.module.css';

export function Profile() {
  const t = useT();
  const { state, dispatch } = useStore();
  const [confirming, setConfirming] = useState(false);
  const profile = state.current ?? state.baseline;
  if (!profile) return null;
  const weak = profile.weakest;

  const reset = () => {
    dispatch({ type: 'reset' });
    navigate(PATHS.landing, { replace: true });
  };

  return (
    <Screen juryKey="profile" className={s.page}>
      <EconomicsLink from="profile" />
      <h1>{t('progress.profile.title')}</h1>

      <Card className="stack" data-testid="profile-radar">
        <Radar scores={profile.scores} compare={state.baseline?.scores} highlight={weak} size={250} />
        {state.baseline && <RadarLegend now={t('progress.profile.legendNow')} then={t('progress.profile.legendStart')} />}
        <ul className={s.scoreList}>
          {ABILITIES.map((ab) => (
            <li key={ab}>
              <span>{t(`common.abilities.${ab}`)}</span>
              <span className={s.meter} data-weak={ab === weak}>
                <i style={{ width: `${Math.max(0, Math.min(100, profile.scores[ab]))}%` }} />
              </span>
              <b>{Math.round(profile.scores[ab])}</b>
            </li>
          ))}
        </ul>
      </Card>

      <dl className={s.dl}>
        <div>
          <dt>{t('progress.weakZone')}</dt>
          <dd className={s.weakText} data-testid="profile-weakest">
            {t(`common.abilities.${weak}`)}
          </dd>
        </div>
        <div>
          <dt>{t('progress.index.name')}</dt>
          <dd data-testid="profile-index">{profile.index}</dd>
        </div>
        <div>
          <dt>{t('progress.index.streakLabel')}</dt>
          <dd data-testid="profile-streak" data-streak={state.streakDays}>
            {streakText(t, state.streakDays)}
          </dd>
        </div>
      </dl>

      <Card className="stack" style={{ gap: 0, padding: '4px 16px' }}>
        <a className={s.linkCard} href={'#' + PATHS.retest} style={{ minHeight: 52 }}>
          <div>{t('progress.profile.retestLink')}</div>
          <ArrowIcon className={s.arrow} />
        </a>
        <a className={s.linkCard} href={'#' + PATHS.line} style={{ minHeight: 52, borderTop: '1px solid var(--border)' }}>
          <div>{t('progress.today.lineLink')}</div>
          <ArrowIcon className={s.arrow} />
        </a>
      </Card>

      <Card className={s.danger} data-testid="profile-danger">
        <h3>{t('common.resetDemo')}</h3>
        <p className="small muted">{confirming ? t('common.resetConfirm') : t('progress.profile.resetNote')}</p>
        {confirming ? (
          <div className={s.confirmRow}>
            <Button variant="ghost" onClick={() => setConfirming(false)} data-testid="profile-reset-cancel">
              {t('progress.profile.cancel')}
            </Button>
            <Button className={s.dangerBtn} onClick={reset} data-testid="profile-reset-confirm" autoFocus>
              {t('progress.profile.confirm')}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" block onClick={() => setConfirming(true)} data-testid="profile-reset">
            {t('common.resetDemo')}
          </Button>
        )}
      </Card>
    </Screen>
  );
}
