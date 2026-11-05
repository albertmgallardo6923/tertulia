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
  En curso: correcciones de código del revisor (validador único de endpoints, `xmlrpc.ts`, i18n).

- **Fase 4 (frontend):** MVP de la PWA en `src/` (transporte, datos, contenido, ui), modo `?demo` con fixtures,
  iconos, `public/_headers`, tests (`tests/ui`, `tests/contenido`, `tests/transporte.test.ts`) y capturas en `docs/capturas/`.
  Pendiente: probar con el proxy real (Fase 3) y con foros reales; Mensajes y Avisos son «Próximamente».

## Decisiones clave

Ver `docs/decisiones.md`. Resumen: foros añadidos por el usuario; Cloudflare Pages + `_worker.js` como el
gimnasio; sesión del foro en token cifrado sin servidor; pruebas con foros reales desde el navegador de la app.

## Pendiente del usuario

- Nada bloqueante ahora. En la Fase 6: secretos `APP_KEY` y `SESSION_SECRET` en Cloudflare Pages
  (cuenta ya existente) y conectar el repo.

## Siguiente

1. Fase 3 (`backend`): `worker/index.ts` según `docs/arquitectura.md` §2–3, con tests y fixtures.
2. Fase 4 (`frontend`, en paralelo): MVP de la PWA según §4–9.
3. Despliegue de prueba para comprobar si Club Tesla acepta peticiones desde un Worker (riesgo §10).

## Consumo por fase

| Fase | Notas |
| --- | --- |
| 0–1 | investigador ~104 k tokens (Haiku); api-foros ~40 k (Sonnet) |
| 2 | revisor ~29 k (Opus) |
