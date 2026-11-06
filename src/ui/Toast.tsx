import { useEffect } from 'react';
import s from './ui.module.css';

/** Small transient message at the bottom. Calls onClose after `ms`. */
export function Toast({ text, onClose, ms = 2400 }: { text: string; onClose: () => void; ms?: number }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, ms);
    return () => window.clearTimeout(id);
  }, [onClose, ms]);
  return (
    <div className={s.toast} role="status">
      {text}
    </div>
  );
}
