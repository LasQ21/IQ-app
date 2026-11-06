import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { useT } from '../i18n/useT';
import s from './ui.module.css';

/**
 * Root wrapper for every screen. `juryKey` → i18n `jury.<key>.reason|metric|goal`.
 * Puts data-reason / data-metric on the root and renders the jury strip when jury mode is on.
 */
export function Screen({
  juryKey,
  children,
  className,
  padded = true,
}: {
  juryKey: string;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  const { state } = useStore();
  const t = useT();
  const reason = t(`jury.${juryKey}.reason`);
  const metric = t(`jury.${juryKey}.metric`);
  const goal = t(`jury.${juryKey}.goal`);
  return (
    <section
      className={[s.screen, padded ? s.padded : '', className ?? ''].join(' ')}
      data-screen={juryKey}
      data-reason={reason}
      data-metric={metric}
    >
      {state.juryMode && [reason, metric, goal].some((x) => x !== '—') && (
        <aside className={s.jury} aria-label={t('common.jury')}>
          <span>
            <b>{t('common.juryReason')}:</b> {reason}
          </span>
          <span>
            <b>{t('common.juryMetric')}:</b> {metric}
          </span>
          <span>
            <b>{t('common.juryGoal')}:</b> {goal}
          </span>
        </aside>
      )}
      {children}
    </section>
  );
}
