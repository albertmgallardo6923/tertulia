# Decisiones

Una línea por decisión: fecha · decisión · motivo.

- 2026-11-05 · Nombre provisional "Tertulia" · propuesta del prompt; el usuario no la ha rechazado.
- 2026-11-05 · Los avisos push serán opcionales por foro · exigen guardar la sesión cifrada en el Worker.
- 2026-11-05 · Stack: Vite + TypeScript + Preact; Worker en TypeScript · ligero y gratuito; revisar en Fase 2 si el repo del gimnasio usa otro.
- 2026-11-05 · El XML-RPC se interpreta en el cliente · el plan gratuito de Workers da 10 ms de CPU por petición.
- 2026-11-05 · Pruebas contra foros reales desde el ordenador del usuario · la nube solo llega a GitHub y registros de paquetes.
- 2026-11-05 · Playwright WebKit se ejecuta en GitHub Actions u ordenador del usuario · la descarga del navegador está bloqueada en la nube.
- 2026-11-05 · Vía de respaldo para foros sin plugin (leer la web del foro) queda como v2 · Forum Fiend indica que la API de Tapatalk parece abandonada aunque muchos foros la mantienen.
- 2026-11-05 · El usuario añade los foros desde la app, por URL, como en Tapatalk · petición del usuario. Sustituye a la lista blanca fija: el proxy se protege con clave de acceso, ruta `mobiquo.php`, cuerpo XML-RPC y bloqueo de IP privadas.
- 2026-11-05 · Añadir foro: probar `https://host/mobiquo/mobiquo.php` y rutas habituales (`/forum`, `/foro`, `/foros`, `/forums`, `/community`) y, si no, buscar la referencia a Tapatalk en el HTML de la portada · los foros instalan el plugin en la carpeta del foro.
- 2026-11-05 · Alojamiento en Cloudflare Pages con `_worker.js`, como Cuaderno de Hierro · app y proxy en el mismo origen (sin CORS entre ellos), un solo despliegue desde GitHub y la cuenta de Cloudflare ya existe. Sustituye a GitHub Pages.
- 2026-11-05 · Avisos push (v1) en un Worker aparte `tertulia-avisos` con tarea programada · Pages Functions no admite cron.
- 2026-11-05 · Pruebas de foros reales con el navegador de la app (fetch desde la propia web del foro) · ni la nube ni el terminal del Mac llegan a los foros.
- 2026-11-05 · Se ignora la nota del investigador sobre push en iOS (artículo de 2020) · desde iOS 16.4 las web apps de pantalla de inicio sí reciben push y contador; verificado en el prompt.
- 2026-11-05 · Prueba de clave sin contactar con ningún foro: `/api/ping` + POST con `u` vacío; el proxy comprueba la clave antes que la dirección (401 `clave` = mala, 400 `direccion` = buena) · evita una dirección de foro fija en el código.
- 2026-11-05 · Id de foro = host (+ ruta) del endpoint · permite guardar la sesión del proxy antes de terminar de añadir el foro (login en el alta).
- 2026-11-05 · Colores y tamaños de BBCode como clases `bb-*` de una paleta cerrada, sin `style` · la lista de atributos permitidos no incluye `style`.
- 2026-11-05 · Tests de saneado en happy-dom con `tests/setup.ts` (nodeName polimórfico) y vectores aislados · DOMPurify ≥ 3.4 y el NodeIterator de happy-dom no recorren bien los hijos de un nodo eliminado; los vectores combinados se comprobaron en Chromium real.
- 2026-11-05 · El borrador de tema nuevo se guarda con clave `borrador:<foroId>:nuevo-<subforoId>` · evita mezclar borradores de secciones distintas.
- 2026-11-05 · Rediseño «Sala de lectura nocturna» (docs/diseno.md): oscuro por defecto con ajuste en Yo, Literata + Instrument Sans empaquetadas (latín) y el hilo con nudos; sustituye al estilo terracota. La hoja de redactar y el visor de imágenes van en un portal en body (sobre la barra de pestañas). Saneado sin reparsear (RETURN_DOM_FRAGMENT).
