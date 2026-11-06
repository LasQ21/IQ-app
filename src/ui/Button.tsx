import type { ButtonHTMLAttributes } from 'react';
import s from './ui.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  variant = 'primary',
  block,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  const cls = [s.btn, s[variant], block ? s.block : '', className ?? ''].join(' ');
  return <button type="button" className={cls} {...rest} />;
}
