import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { StoreProvider } from './state/store';
import { initPwa } from './pwa';
// Onest is self-hosted so it is precached for offline use and never blocks rendering (font-display: swap).
// The weight files declare every subset with `unicode-range`, so a page downloads only the subsets it shows
// (Cyrillic for uk, Latin for en and digits); vite.config.ts preloads the main subset of the active language.
// Japanese uses the system font (Hiragino on iOS, Noto Sans CJK JP on Android) — no 500 KB download.
import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/700.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);

initPwa();
