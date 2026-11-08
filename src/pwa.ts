import { registerSW } from 'virtual:pwa-register';
import { isPlaying, isSafeToReload, onPlayingChange } from './playing';
import { loadState } from './state/persist';

declare const __APP_BUILD__: string;

/** Check for a new deploy at most this often when the app comes back to the foreground. */
const UPDATE_CHECK_MS = 60_000;

/**
 * Service-worker lifecycle (F12: after a deploy the first open showed the old version).
 *
 * - First open: the SW installs, claims the page (clientsClaim) and precaches → offline works at once.
 * - New deploy: the new SW installs and *waits*. As soon as the app is on a safe screen (landing, or Today with
 *   stage 'home', and nothing being played — see `isSafeToReload`) we send SKIP_WAITING; when the new SW takes
 *   control the page reloads, again only if still safe. Never during quiz, re-test or play; otherwise the update
 *   is retried on hashchange / visibilitychange / end of play.
 * - `<html data-build>` = build id, `<html data-sw-update>` = 'waiting' | 'reloading' (for tests and support).
 */
export function initPwa(): void {
  document.documentElement.dataset.build = __APP_BUILD__;
  if (!('serviceWorker' in navigator)) return;

  let pending: 'activate' | 'reload' | null = null;
  let reloading = false;
  let registration: ServiceWorkerRegistration | undefined;
  let lastCheck = Date.now();
  // A controller change on the very first open (clientsClaim) is not an update: the page is already current.
  let hadController = Boolean(navigator.serviceWorker.controller);

  const mark = (v: string | null) => {
    if (v) document.documentElement.dataset.swUpdate = v;
    else delete document.documentElement.dataset.swUpdate;
  };
  const safe = () => isSafeToReload(window.location.hash, loadState()?.stage, isPlaying());

  const flush = () => {
    if (!pending || reloading || !safe()) return;
    if (pending === 'activate') {
      pending = null;
      void updateSW(true); // SKIP_WAITING → 'controlling' / controllerchange → requestReload()
      return;
    }
    reloading = true;
    mark('reloading');
    window.location.reload();
  };

  const requestReload = () => {
    pending = 'reload';
    mark('waiting');
    flush();
  };

  const updateSW = registerSW({
    onNeedRefresh() {
      if (pending !== 'reload') pending = 'activate';
      mark('waiting');
      flush();
    },
    // Called by vite-plugin-pwa instead of its own unconditional window.location.reload().
    onNeedReload: requestReload,
    onRegisteredSW(_url, r) {
      registration = r;
    },
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    requestReload(); // also covers a new version activated from another tab
  });

  window.addEventListener('hashchange', flush);
  onPlayingChange((on) => {
    if (!on) flush();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    flush();
    // An installed PWA can stay open for days: look for a new deploy when it comes back to the foreground.
    if (registration && Date.now() - lastCheck > UPDATE_CHECK_MS) {
      lastCheck = Date.now();
      registration.update().catch(() => undefined);
    }
  });
}
