# Tertulia — lector de foros PWA para iPhone

PWA instalable en iPhone para leer y participar en los foros que el usuario seguía en Tapatalk.
Habla con cada foro mediante la API XML-RPC del plugin de Tapatalk (`/mobiquo/mobiquo.php`),
a través de un proxy propio en Cloudflare Workers. Presupuesto: 0 €.

Prompt completo y fuente de verdad del plan: https://claude.ai/artifact/M5rqswC3h9MpC5mrwZc9QG
Estado actual: `docs/estado.md` (léelo al empezar cualquier sesión; no vuelvas a explorar).

## Límites (no negociables)

- No descompilar ni copiar Tapatalk: ni código, ni nombre, logo, iconos, textos o diseño.
- Solo foros donde el usuario tiene cuenta, a ritmo humano (caché + límite de peticiones).
- Si un foro bloquea clientes externos, se marca como no compatible; no se esquiva.
- Contraseñas y tokens nunca en el código, el repositorio ni los logs.
- El proxy solo acepta dominios de `docs/foros.md` (nunca un proxy abierto).
- Todo HTML que venga de un foro se sanea (DOMPurify) antes de pintarse.

## Estructura

```
src/            PWA (Vite + TypeScript + Preact)
  api/          cliente XML-RPC tipado (lo escribe api-foros)
  i18n/es.json  todos los textos de la interfaz
worker/         Cloudflare Worker: proxy, tarea programada, Web Push
tests/fixtures/ respuestas reales grabadas, recortadas (≤ 20 mensajes por tema)
docs/           estado, decisiones, foros, contrato de API, análisis
.claude/agents/ subagentes (ver tabla abajo)
```

## Comandos

- `npm ci --silent` · `npm run dev` · `npm run build`
- `npm test` (Vitest, reporter dot; el hook deja pasar solo los fallos)
- `npm run test:e2e` (Playwright, solo WebKit, tamaño iPhone)
- `cd worker && npx wrangler dev` (proxy local) · `npx wrangler deploy` (solo desde CI)

## Subagentes

| Agente | Modelo | Para qué |
| --- | --- | --- |
| investigador | haiku | Análisis de Tapatalk y del mercado (web) |
| api-foros | sonnet | Probar foros, fixtures, contrato y cliente XML-RPC |
| backend | sonnet | Worker: proxy, lista blanca, sesión cifrada, cron, Web Push |
| frontend | sonnet | PWA: pantallas, caché offline, BBCode, manifest |
| qa | haiku | Tests, Playwright WebKit, Lighthouse; informa solo de fallos |
| revisor | opus | Revisión independiente de seguridad y calidad (solo lectura) |

Reglas: cada subagente devuelve ≤ 200 palabras + lista de archivos tocados; el detalle va a `docs/`.
`backend` y `frontend` solo en paralelo cuando `docs/api-contrato.md` esté cerrado, con worktree.
Comprueba con `/tasks` que cada subagente corre en su modelo. Nada de agent teams.

## Convenciones

- TypeScript estricto. Funciones pequeñas. Sin dependencias pesadas (pregunta antes de añadir una).
- Textos de la interfaz solo en `src/i18n/es.json`. Español de España, tuteo.
- Estilo iOS: fuente del sistema, títulos grandes, barra de pestañas inferior, zonas seguras,
  claro/oscuro automáticos, acento terracota `#C2562F`.
- Pestañas: Novedades, Foros, Mensajes, Avisos, Yo.
- El XML-RPC se interpreta en el cliente (`DOMParser`); el Worker solo reenvía (≤ 10 ms CPU).
- Los tests nunca tocan foros reales: usan `tests/fixtures/`.

## Ahorro de tokens

- Busca con `rg`; nunca leas un archivo entero si basta un fragmento. Nunca vuelques XML completo.
- Comandos silenciosos (`--silent`, `--reporter=dot`, `| tail -n 40`).
- Capturas de pantalla solo ante un fallo visual.
- Al cerrar una fase: actualiza `docs/estado.md`, anota `/usage`, y `/clear`.
- Decisiones nuevas → una línea en `docs/decisiones.md`.

# Compact instructions

Al compactar, conserva: decisiones tomadas, contrato de la API, estado de cada foro,
archivos modificados y la siguiente tarea. Descarta salidas de comandos y búsquedas.
