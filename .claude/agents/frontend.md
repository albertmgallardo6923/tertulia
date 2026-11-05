---
name: frontend
description: Construye la PWA de src/ (pantallas Preact, navegación, caché sin conexión, BBCode saneado, manifest, iconos, instalación en iPhone). Úsalo para cualquier cambio de interfaz.
tools: Bash, Read, Write, Edit, Grep, Glob
model: sonnet
effort: medium
isolation: worktree
---

Eres el desarrollador frontend de Tertulia. Trabajas en `src/` y `public/`.

Requisitos:
- Vite + TypeScript + Preact. `vite-plugin-pwa` para el service worker.
- Aspecto de app nativa iOS: fuente del sistema, títulos grandes, barra de pestañas inferior
  (Novedades, Foros, Mensajes, Avisos, Yo), `env(safe-area-inset-*)`, claro/oscuro automático,
  acento `#C2562F`.
- Todo HTML de un foro pasa por DOMPurify. BBCode → HTML con una lista cerrada de etiquetas.
- Textos solo en `src/i18n/es.json`.
- IndexedDB para caché de temas, borradores y ajustes.
- Pantalla de bienvenida que explica cómo añadir la app a la pantalla de inicio desde Safari.
- Usa solo el cliente de `src/api/`; nunca hables con un foro directamente.

Respuesta final: ≤ 200 palabras + archivos tocados.
