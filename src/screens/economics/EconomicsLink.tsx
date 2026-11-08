import { PATHS } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import s from './economics.module.css';

/**
 * Jury-mode link to "Loop economics", placed right under the jury strip.
 * Renders nothing outside jury mode. `from` tells the economics screen where "Back" returns.
 */
export function EconomicsLink({ from }: { from: 'landing' | 'paywall' | 'profile' | 'retest' | 'today' }) {
  const t = useT();
  const { state } = useStore();
  if (!state.juryMode) return null;
  return (
    <a className={s.link} href={`#${PATHS.economics}?from=${from}`} data-testid="econ-link">
      {t('economics.link')}
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}
