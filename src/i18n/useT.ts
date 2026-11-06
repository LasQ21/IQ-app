import { useCallback } from 'react';
import { useStore } from '../state/store';
import type { Lang } from '../state/types';
import ja from './ja.json';
import uk from './uk.json';
import en from './en.json';

type Dict = { [k: string]: string | boolean | Dict };
const DICTS: Record<Lang, Dict> = { ja: ja as Dict, uk: uk as Dict, en: en as Dict };

function lookup(dict: Dict, key: string): string | undefined {
  let cur: string | boolean | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export type Vars = Record<string, string | number>;

/** Translate `key` for `lang`. Falls back to en → ja → the key itself. `{name}` placeholders are replaced. */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const raw = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? lookup(DICTS.ja, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export type T = (key: string, vars?: Vars) => string;

export function useT(): T {
  const { state } = useStore();
  return useCallback((key: string, vars?: Vars) => translate(state.lang, key, vars), [state.lang]);
}
