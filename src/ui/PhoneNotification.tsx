import type { ButtonHTMLAttributes } from 'react';
import s from './PhoneNotification.module.css';

/**
 * Lock-screen style notification that slides in from the top (CSS transition) when `show` is true.
 * Generic chat-app look: a plain green badge and the app name as text — no third-party logo artwork.
 */
export function PhoneNotification({
  show,
  app,
  time,
  title,
  body,
  className,
  ...rest
}: {
  show: boolean;
  app: string;
  time: string;
  title: string;
  body: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'>) {
  return (
    <button
      type="button"
      className={[s.note, show ? s.show : '', className ?? ''].join(' ')}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      data-shown={show}
      {...rest}
    >
      <span className={s.head}>
        <span className={s.badge} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={s.app}>{app}</span>
        <span className={s.time}>{time}</span>
      </span>
      <span className={s.title}>{title}</span>
      <span className={s.body}>{body}</span>
    </button>
  );
}
