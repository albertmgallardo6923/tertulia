// Genera los PNG de public/ desde public/icono.svg con Chromium (Playwright).
// Uso: CHROMIUM=/ruta/chrome node scripts/generar-iconos.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync('public/icono.svg', 'utf-8');
const salidas = [
  ['public/pwa-192x192.png', 192],
  ['public/pwa-512x512.png', 512],
  ['public/maskable-512x512.png', 512],
  ['public/apple-touch-icon.png', 180],
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
for (const [ruta, px] of salidas) {
  const page = await browser.newPage({ viewport: { width: px, height: px } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${px}px;height:${px}px}</style>${svg}`);
  await page.screenshot({ path: ruta, omitBackground: false });
  await page.close();
}
await browser.close();
