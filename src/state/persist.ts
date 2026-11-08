import { STORAGE_KEY } from '../config';
import type { AppState } from './types';

export function parseState(raw: string | null): Partial<AppState> | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' ? (v as Partial<AppState>) : undefined;
  } catch {
    return undefined;
  }
}

export function loadState(): Partial<AppState> | undefined {
  try {
    return parseState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return undefined;
  }
}

export function saveState(state: AppState): void {
  try {
    const raw = JSON.stringify(state);
    // Skip identical writes: they are no-ops for other tabs anyway and keep the `storage` sync loop-free.
    if (window.localStorage.getItem(STORAGE_KEY) === raw) return;
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* private mode / quota — the demo still works in memory */
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
