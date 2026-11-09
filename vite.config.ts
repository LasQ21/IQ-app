import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// No @types/node in this project: declare the one Node global the config reads.
declare const process: { env: Record<string, string | undefined> };

/** Build id shown as <html data-build> (Vercel commit, or APP_BUILD for the SW-update e2e test). */
const APP_BUILD = process.env.APP_BUILD || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local';

/** Onest subsets worth preloading per UI language (Japanese uses the system font → nothing). */
const PRELOAD: Record<string, string[]> = {
  uk: ['cyrillic-400', 'cyrillic-700'],
  en: ['latin-400', 'latin-700'],
};

/**
 * Font preload with hashed file names. Vite fingerprints the woff2 files emitted from @fontsource CSS,
 * so the hrefs are only known after bundling: this plugin looks them up in the final bundle and puts
 * a tiny inline script at the `<!-- font-preload -->` marker in index.html that adds `<link rel="preload" as="font" crossorigin>` for the
 * subsets of the language the page is about to render (?lang= or the saved state; default ja → none).
 * Runs in the parser before any CSS/JS, so the fonts start downloading as early as a static <link>,
 * but Japanese visitors don't pay for (and don't get "preloaded but not used" warnings about) Cyrillic.
 * The build fails if a subset is missing, instead of silently dropping the preload.
 */
const FONT_MARKER = '<!-- font-preload -->';

function fontPreload(): Plugin {
  return {
    name: 'cc146-font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const files = Object.keys(ctx.bundle ?? {});
        const hrefs: Record<string, string[]> = {};
        for (const [lang, subsets] of Object.entries(PRELOAD)) {
          hrefs[lang] = subsets.map((subset) => {
            const re = new RegExp(`(^|/)onest-${subset}-normal-[\\w-]+\\.woff2$`);
            const file = files.find((f) => re.test(f));
            if (!file) throw new Error(`[cc146-font-preload] onest-${subset} woff2 not found in the bundle`);
            return '/' + file;
          });
        }
        const script =
          `(function(){try{var H=${JSON.stringify(hrefs)};` +
          `var l=new URLSearchParams(location.search).get('lang');` +
          `if(!l){try{l=JSON.parse(localStorage.getItem('cc146-wittio-v1')||'{}').lang}catch(e){}}` +
          `(H[l]||[]).forEach(function(h){var e=document.createElement('link');e.rel='preload';e.as='font';` +
          `e.type='font/woff2';e.crossOrigin='anonymous';e.href=h;document.head.appendChild(e)})}catch(e){}})()`;
        // Placed at the marker in index.html: after <meta charset>, before Vite's stylesheet link (an inline
        // script after a stylesheet would wait for it).
        if (!html.includes(FONT_MARKER)) throw new Error(`[cc146-font-preload] ${FONT_MARKER} missing in index.html`);
        return html.replace(FONT_MARKER, `<script id="font-preload">${script}</script>`);
      },
    },
  };
}

export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(APP_BUILD),
  },
  plugins: [
    react(),
    fontPreload(),
    VitePWA({
      // Registered from src/pwa.ts (virtual:pwa-register): a new version waits until the app is on a safe
      // screen (landing / Today, nothing being played) and only then activates and reloads.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Wittio · CC-146 concept',
        short_name: 'CC-146',
        description: 'Retention-loop prototype by team CC-146 (concept, not an official product).',
        lang: 'ja',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F5F6FA',
        theme_color: '#5B47FF',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Vietnamese / Latin-ext / Cyrillic-ext glyphs never appear in the UI; Latin, Cyrillic and math/symbols (→ ≥) are precached.
        // deck.html (1.3 MB, the pitch deck with the live jury dashboard) is for the presenter's laptop, never cached on phones.
        globIgnores: ['**/og-image.png', '**/onest-vietnamese-*', '**/onest-latin-ext-*', '**/onest-cyrillic-ext-*', '**/deck.html'],
        // Take control on the very first open, so the app works offline without a second visit.
        // An *update* does not skip waiting: src/pwa.ts sends SKIP_WAITING when the screen is safe.
        clientsClaim: true,
        skipWaiting: false,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/deck/, /^\/api\//],
      },
    }),
  ],
});
