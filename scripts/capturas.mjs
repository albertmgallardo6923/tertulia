// Capturas del modo demostración (Chromium, 390x844 @2x) -> docs/capturas/.
// Uso: CHROMIUM=/ruta/chrome node scripts/capturas.mjs [http://localhost:4173]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:4173';
const TEMA = 'foro.clubtesla.es';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  serviceWorkers: 'block',
  hasTouch: true,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));

async function ir(hash) {
  await page.evaluate((h) => (location.hash = h), hash);
  await page.waitForTimeout(1100);
}
// Desplaza el hilo hasta el tramo con cita, mensajes nuevos y mensaje propio.
async function alHilo() {
  await page.evaluate(() => document.querySelector('.pantalla').scrollTo(0, 860));
  await page.waitForTimeout(400);
}
async function captura(nombre, esquema) {
  await page.screenshot({ path: `docs/capturas/${nombre}-${esquema}.png` });
}

await page.goto(`${base}/?demo`);
await page.waitForTimeout(1200);

// Oscuro (predeterminado)
await ir('#/novedades');
await captura('novedades', 'oscuro');
await ir('#/foros');
await captura('foros', 'oscuro');
await ir(`#/foros/${TEMA}`);
await captura('arbol', 'oscuro');
await ir(`#/foros/${TEMA}/t/14162/p/1`);
await alHilo();
await captura('tema', 'oscuro');
await page.click('.redactar-campo');
await page.waitForTimeout(700);
await page.fill('.hoja-campo', 'Gracias por el resumen. Yo recogí el mío la semana pasada y todo fue perfecto.');
await captura('redactar', 'oscuro');
await page.click('.hoja-cab .btn-texto');
await ir('#/yo');
await captura('yo', 'oscuro');

// Claro: página nueva (la demo vive en memoria, así «lo visto» del hilo vuelve a su semilla) y se cambia
// desde el propio ajuste de Yo.
await page.goto(`${base}/?demo`);
await page.waitForTimeout(1200);
await ir('#/yo');
await page.click('.segmentado[aria-label="Apariencia"] button:nth-child(2)');
await page.waitForTimeout(400);
await captura('yo', 'claro');
await ir('#/novedades');
await captura('novedades', 'claro');
await ir(`#/foros/${TEMA}/t/14162/p/1`);
await alHilo();
await captura('tema', 'claro');

await browser.close();
