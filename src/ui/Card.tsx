import type { HTMLAttributes } from 'react';
import s from './ui.module.css';

export function Card({ className, tone, ...rest }: HTMLAttributes<HTMLDivElement> & { tone?: 'accent' | 'risk' }) {
  const cls = [s.card, tone === 'accent' ? s.cardAccent : '', tone === 'risk' ? s.cardRisk : '', className ?? ''].join(' ');
  return <div className={cls} {...rest} />;
}
