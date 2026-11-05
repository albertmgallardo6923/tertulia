# Estado del proyecto

Actualizado: 5 de noviembre de 2026, 21:50

## Hecho

- **Fase 0:** estructura, `CLAUDE.md`, 6 subagentes, hook de tests, permisos, herramientas
  (Vite 6, Preact, TS 5.9, Vitest 3, vite-plugin-pwa, DOMPurify, idb-keyval, happy-dom, Wrangler 4.158).
  Repo: github.com/albertmgallardo6923/tertulia. Copia (sin git) en el Mac: Documentos/tertulia.
  Foro de prueba compatible: foro.clubtesla.es (SMF 2.1, plugin sm21, API 3).
- **Fase 1:** `docs/analisis-tapatalk.md`, `docs/mercado.md` (investigador); fixtures reales anonimizados;
  `src/api/` (XML-RPC, tipos, `ClienteForo`, descubrimiento) + `docs/api-contrato.md` (api-foros, 35 tests).
- **Fase 2:** `docs/arquitectura.md` revisada por el `revisor` (sin críticos, 7 importantes aplicados).
  Correcciones de código del revisor aplicadas (validador único, `xmlrpc.ts`, i18n; 73 tests).
- **Fase 3:** proxy `worker/index.ts` (+ `sesion.ts`, `cookies.ts`, `limite.ts`) empaquetado a `dist/_worker.js`
  (12 KB), `public/_routes.json`, `wrangler.toml`; 102 tests. Sin `SESSION_SECRET` funciona sin sesiones.

## Decisiones clave

Ver `docs/decisiones.md`. Resumen: foros añadidos por el usuario; Cloudflare Pages + `_worker.js` como el
gimnasio; sesión del foro en token cifrado sin servidor; pruebas con foros reales desde el navegador de la app.

## Pendiente del usuario

- Nada bloqueante ahora. En la Fase 6: secretos `APP_KEY` y `SESSION_SECRET` en Cloudflare Pages
  (cuenta ya existente) y conectar el repo.

## Siguiente

1. Fase 4 (`frontend`, en curso): MVP de la PWA según §4–9; unir su rama y resolver conflictos
   (`package.json`, `vitest.config.ts`).
2. `qa` + `revisor` sobre Fases 3–4.
3. Despliegue de prueba para comprobar si Club Tesla acepta peticiones desde un Worker (riesgo §10).

## Consumo por fase

| Fase | Notas |
| --- | --- |
| 0–1 | investigador ~104 k tokens (Haiku); api-foros ~40 k (Sonnet) |
| 2 | revisor ~29 k (Opus) |
| 3 | backend ~50 k (Sonnet) |
