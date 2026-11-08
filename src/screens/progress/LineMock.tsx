import { useEffect, useState } from 'react';
import { navigate, PATHS, useRoute } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { PhoneNotification } from '../../ui/PhoneNotification';
import { Screen } from '../../ui/Screen';
import { formatDay, today } from './model';
import s from './progress.module.css';

/** The reminder time the user picked (demo value); the lock screen shows the moment it fires. */
const REMINDER_TIME = '20:00';

export function LineMock() {
  const t = useT();
  const { state } = useStore();
  const route = useRoute();
  const fromOnboarding = route.query.get('from') === 'onboarding';
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  // ja: 11月8日（日） — the lock-screen style a Japanese phone shows; others: "Sunday, 8 November".
  const date =
    state.lang === 'ja'
      ? `${formatDay('ja', today(state), { month: 'long', day: 'numeric' })}（${formatDay('ja', today(state), { weekday: 'short' })}）`
      : formatDay(state.lang, today(state), { month: 'long', day: 'numeric', weekday: 'long' });
  const body = state.streakDays > 0 ? t('progress.line.bodyStreak', { n: state.streakDays }) : t('progress.line.body');

  return (
    <Screen juryKey="line" className={s.page}>
      <div>
        <h1>{t('progress.line.title')}</h1>
        <p className="small muted">{t('progress.line.mockNote')}</p>
      </div>

      <div className={s.phone} data-testid="line-phone">
        <div className={s.notch} aria-hidden />
        <p className={s.lockTime} aria-hidden>
          {REMINDER_TIME}
        </p>
        <p className={s.lockDate}>{date}</p>
        <div className={s.noteSlot}>
          <PhoneNotification
            show={show}
            app="LINE"
            time={t('progress.line.now')}
            title={t('progress.line.sender')}
            body={body}
            data-testid="line-notification"
            onClick={() => navigate(PATHS.today)}
          />
        </div>
        <p className={s.lockHint} aria-hidden>
          {show ? t('progress.line.tapHint') : ''}
        </p>
        <div className={s.homeBar} aria-hidden />
      </div>

      <Card className="stack" style={{ gap: 10 }}>
        <div className={s.settingRow}>
          <span>{t('progress.line.timeLabel')}</span>
          <span className={s.timePill}>{REMINDER_TIME}</span>
        </div>
        <p className="small muted">{t('progress.line.caption')}</p>
      </Card>

      <Button block variant={fromOnboarding ? 'primary' : 'secondary'} onClick={() => navigate(PATHS.today)} data-testid="line-continue">
        {t('progress.line.cta')}
      </Button>
    </Screen>
  );
}
