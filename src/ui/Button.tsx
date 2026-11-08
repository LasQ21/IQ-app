import { forwardRef, type ButtonHTMLAttributes } from 'react';
import s from './ui.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }
>(function Button({ variant = 'primary', block, className, ...rest }, ref) {
  const cls = [s.btn, s[variant], block ? s.block : '', className ?? ''].join(' ');
  return <button ref={ref} type="button" className={cls} {...rest} />;
});
