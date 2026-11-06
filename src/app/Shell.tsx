import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { useT } from '../i18n/useT';
import { LANGS } from '../state/types';
import { PATHS, useRoute } from './router';
import s from './app.module.css';

const TABS = [
  { path: PATHS.today, key: 'today', icon: 'M4 12l5 5L20 6' },
  { path: PATHS.index, key: 'index', icon: 'M4 18l5-6 4 3 7-9' },
  { path: PATHS.report, key: 'report', icon: 'M5 20V10M12 20V4M19 20v-7' },
  { path: PATHS.profile, key: 'profile', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8c0-3.5 3-6 7-6s7 2.5 7 6' },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const t = useT();
  const route = useRoute();
  const showTabs = state.stage === 'home' && TABS.some((tab) => tab.path === route.path);

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.brand} data-testid="brand">
          <b>Wittio</b>
          <br />
          {t('common.brandShort')}
        </div>
        <div className={s.seg} role="group" aria-label={t('common.lang')}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={state.lang === l}
              data-testid={`lang-${l}`}
              onClick={() => dispatch({ type: 'setLang', lang: l })}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={s.juryBtn}
          aria-pressed={state.juryMode}
          data-testid="jury-toggle"
          onClick={() => dispatch({ type: 'toggleJury' })}
        >
          {t('common.jury')}
        </button>
      </header>
      <main className={[s.main, showTabs ? s.withTabs : ''].join(' ')}>{children}</main>
      {showTabs && (
        <nav className={s.tabbar} aria-label="tabs">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              href={'#' + tab.path}
              aria-current={route.path === tab.path ? 'page' : undefined}
              data-testid={`tab-${tab.key}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={tab.icon} />
              </svg>
              {t(`common.nav.${tab.key}`)}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
