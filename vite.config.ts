import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // el registro va en src/main.tsx (la CSP no permite scripts en línea)
      includeAssets: ['icono.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tertulia',
        short_name: 'Tertulia',
        description: 'Lector de foros para iPhone',
        lang: 'es-ES',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#10141C',
        theme_color: '#10141C',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'imagenes',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 14, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2022' },
});
