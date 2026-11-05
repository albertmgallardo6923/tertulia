# Estado del proyecto

Actualizado: 5 de noviembre de 2026

## Hecho

- Fase 0 (parcial): estructura del repositorio, `CLAUDE.md`, subagentes en `.claude/agents/`,
  hook que filtra la salida de los tests, permisos, docs base.
- Herramientas instaladas: Vite 6, Preact, TypeScript 5.9, Vitest 3, vite-plugin-pwa, DOMPurify,
  idb-keyval, Playwright (sin navegador), Wrangler 4.158. Ya había rg, jq, gh y git.
- `scripts/probe-foros.mjs` probado contra un foro simulado: detecta compatible, bloqueo antibots y caído.
- Fase 1 (parte 1) hecha: `docs/analisis-tapatalk.md` y `docs/mercado.md` (investigador, Haiku, ~104 k tokens).

- Repositorio creado: github.com/albertmgallardo6923/tertulia. Copia en el Mac: Documentos/tertulia.
- Revisado el repo del gimnasio: HTML único + `sw.js` + `_worker.js` en Cloudflare Pages con KV.

- **Fase 0 superada:** foro.clubtesla.es (SMF 2.1, plugin sm21, API 3) responde. Fixtures en
  `tests/fixtures/foro-clubtesla-es/` (recortados y anonimizados) con sus rarezas en el README.

## Bloqueado (espera al usuario)

- Cuenta de Cloudflare: ya existe (la usa el gimnasio); hará falta en la Fase 6.

## Siguiente

1. Fase 1, parte 2: subagente `api-foros` escribe `docs/api-contrato.md` y `src/api/` con tests.
2. Fase 2: arquitectura + revisión del `revisor`.

## Consumo por fase

| Fase | Notas |
| --- | --- |
| 0 | — |
