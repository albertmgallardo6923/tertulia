// Capturas del modo demostración (Chromium, 390x844) en claro y oscuro -> docs/capturas/.
// Uso: CHROMIUM=/ruta/chrome node scripts/capturas.mjs [http://localhost:4173]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:4173';
const pantallas = [
  ['novedades', '#/novedades'],
  ['tema', '#/foros/foro.clubtesla.es/t/14162/p/1'],
  ['foros', '#/foros'],
  ['arbol', '#/foros/foro.clubtesla.es'],
  ['yo', '#/yo'],
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
for (const esquema of ['claro', 'oscuro']) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: esquema === 'claro' ? 'light' : 'dark',
    serviceWorkers: 'block',
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`${base}/?demo`);
  for (const [nombre, hash] of pantallas) {
    await page.evaluate((h) => (location.hash = h), hash);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `docs/capturas/${nombre}-${esquema}.png` });
  }
  await ctx.close();
}
await browser.close();
