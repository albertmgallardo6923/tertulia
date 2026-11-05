# Arquitectura de Tertulia

Fecha: 2026-11-05 · Fase 2 · Fuente de las decisiones: `docs/decisiones.md`

Tertulia es una PWA estática servida por Cloudflare Pages. En el mismo proyecto, un `_worker.js` hace de
proxy entre la app y los foros (`/mobiquo/mobiquo.php`). Toda la lógica de foros vive en el móvil; el
proxy solo reenvía, no guarda nada y no interpreta XML. Coste: 0 € (plan gratuito de Pages y Workers).

## 1. Piezas

| Pieza | Dónde | Responsabilidad |
| --- | --- | --- |
| `src/api/` | móvil | XML-RPC, tipos de dominio, `ClienteForo`, descubrimiento de endpoints (hecho, Fase 1) |
| `src/datos/` | móvil | IndexedDB (`idb-keyval`): foros añadidos, sesiones cifradas, caché, borradores, ajustes |
| `src/transporte.ts` | móvil | Único sitio que llama al proxy; añade clave de la app y token de sesión |
| `src/contenido/` | móvil | BBCode + HTML del foro → HTML seguro (lista cerrada + DOMPurify) |
| `src/ui/` | móvil | Pantallas Preact, navegación por pestañas, i18n |
| `public/sw.js` (vía `vite-plugin-pwa`) | móvil | Precaché de la app, caché de imágenes, lectura sin conexión |
| `worker/_worker.js` | Cloudflare Pages | Proxy XML-RPC, control de acceso, cookies de sesión cifradas |
| `avisos/` (v1) | Worker aparte | Tarea cada 15 min + Web Push (solo para foros con avisos activados) |

## 2. Proxy (`worker/_worker.js`)

Mismo origen que la app, así que no necesita CORS. `public/_routes.json` = `{"version":1,"include":["/api/*"],"exclude":[]}`
para que solo `/api/*` pase por el Worker: los estáticos no gastan peticiones y conservan las cabeceras de `_headers`.
El Worker se escribe en TypeScript (`worker/index.ts`) y se empaqueta a `dist/_worker.js` al compilar, importando
`src/api/validar-endpoint.ts`: **un único validador** para la app y el proxy. Rutas:

| Ruta | Qué hace |
| --- | --- |
| `GET /api/ping` | `{ ok: true }` si el Worker y el secreto existen |
| `POST /api/xmlrpc?u=<endpoint>` | Reenvía el cuerpo al endpoint del foro y devuelve **solo** su status y su cuerpo |

Comprobaciones de `POST /api/xmlrpc`, en este orden; cualquier fallo responde 4xx sin llamar al foro:

1. `Origin` igual al origen propio (o ausente en navegación directa → rechazar).
2. `Authorization: Bearer <clave>` igual al secreto `APP_KEY` (comparación en tiempo constante, como en Cuaderno de Hierro).
3. `validarEndpoint(u, { hostPropio })` (`src/api/validar-endpoint.ts`): `https:`, sin usuario/contraseña, puerto 443,
   sin `?` ni `#`, punto final del host eliminado, host con punto, sin IP literal (v4 en cualquier forma, v6), sin `localhost`
   ni sufijos internos (`.local .internal .lan .home .home.arpa .localdomain .test .invalid .onion`…), distinto del dominio
   de la app y con ruta terminada en `/mobiquo/mobiquo.php`.
4. `Content-Type` `text/xml`, cuerpo ≤ 1 MB y empieza por `<?xml` o `<methodCall>`. La subida de fotos (`upload_attach`)
   va como multipart a `mobiquo/upload.php` en la API de Tapatalk: queda fuera del MVP y en v1 tendrá su propia ruta
   `/api/subir` con límite de 6 MB y la misma validación (ruta `upload.php`).
5. Límite por isolate: 60 peticiones/minuto por clave (cubo de fichas en memoria; es orientativo, el control real es la clave).

Petición al foro: `fetch(u, { method: 'POST', body, redirect: 'manual', headers })` con solo
`Content-Type: text/xml`, `User-Agent: Tertulia/1.0` y, si hay sesión, `Cookie`. Una redirección (3xx) se
devuelve como error `redireccion` con el `Location` para que la app pruebe ese endpoint si es del mismo host.

Respuesta del proxy: **se descartan todas las cabeceras del foro** (incluidas `Set-Cookie` y `Content-Type`). El proxy
responde siempre con `Content-Type: text/xml; charset=utf-8`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`,
`Content-Security-Policy: default-src 'none'` y, si aplica, `X-Tertulia-Sesion`. Respuesta del foro de más de 5 MB → 502.
Nunca registra cuerpos, cabeceras ni la URL completa.

## 3. Sesión con cada foro (sin almacenar nada en el servidor)

El foro devuelve la sesión en `Set-Cookie` tras `login`. El navegador no puede ver esas cookies (son de otro
dominio), así que el proxy las empaqueta:

1. Respuesta del foro con `Set-Cookie` → el proxy combina con las cookies que ya traía el token, cifra con
   AES-GCM (clave derivada una vez por isolate de `SESSION_SECRET` con HKDF, IV aleatorio de 12 bytes, `host` como
   dato asociado AAD) el JSON `{ host, cookies, creado }` y lo devuelve en la cabecera `X-Tertulia-Sesion`.
2. La app guarda el token por foro en IndexedDB y lo envía en cada petición a ese foro.
3. El proxy descifra, **comprueba que `host` coincide con el de `u`** (un token no sirve para otro foro) y
   manda `Cookie`. Token caducado (> 30 días) o corrupto → se ignora y la app pide iniciar sesión.

La contraseña solo viaja en la llamada `login` (dentro del XML, por HTTPS) y nunca se guarda. Sin KV en el MVP.
Cerrar sesión llama a `logout_user` en el foro y borra el token. Un token robado no se puede revocar uno a uno:
la única revocación global es rotar `SESSION_SECRET` (todas las sesiones piden login de nuevo).

## 4. Añadir un foro (como en Tapatalk)

1. El usuario escribe una dirección (`foro.clubtesla.es`). `descubrir.ts` genera endpoints candidatos.
2. La app prueba `get_config` en orden a través del proxy hasta que uno responde `methodResponse`.
3. Muestra nombre y software; ofrece iniciar sesión (`login`) o seguir como invitado si `guest_okay`.
4. Guarda `{ id, nombre, host, endpoint, config, usuario?, sesion? }`.
5. Si ninguno responde: mensaje claro ("Este foro no tiene el plugin de Tapatalk o bloquea apps externas").

## 5. Datos en el móvil (IndexedDB)

| Clave | Contenido | Límite |
| --- | --- | --- |
| `ajustes` | clave de la app, tema, tamaño de letra, imágenes externas (auto/al tocar) | — |
| `foros` | lista de foros añadidos | — |
| `sesion:<foroId>` | token opaco del proxy | 1 por foro |
| `hilo:<foroId>:<temaId>:<pagina>` | respuesta parseada + fecha | últimos 50 temas (LRU) |
| `borrador:<foroId>:<temaId|nuevo>` | texto en curso | se borra al publicar |

## 6. Contenido de los mensajes

Entrada mezclada (HTML `<br />` + BBCode `[img] [quote] [url] [b] [i] [u] [spoiler] [code] [list]`):

1. Convertir el BBCode conocido a HTML con expresiones acotadas; el desconocido se deja como texto.
2. `DOMPurify` con lista blanca: `p br b strong i em u s blockquote cite pre code ul ol li a img span div details summary`;
   atributos `href src alt title class`, pero `class` solo con prefijo `bb-` (hook `uponSanitizeAttribute`), para que un
   mensaje no pueda usar los estilos de la app y simular un diálogo; `ALLOWED_URI_REGEXP: /^https:/i`.
   Títulos, `result_text` y `faultString` se pintan siempre como texto, nunca como HTML.
3. Enlaces con `target=_blank rel="noopener noreferrer nofollow"`; imágenes `loading=lazy`, ancho máximo 100 %.
   Las imágenes de otros servidores revelan la IP: ajuste «Cargar imágenes: siempre / al tocar» (por defecto, siempre).
4. Las fechas se pintan desde `timestamp` (ver `docs/api-contrato.md`, rarezas).

Cabeceras (`public/_headers`): `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' https: data: blob:; connect-src 'self'; object-src 'none'; worker-src 'self'; manifest-src 'self';
frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
más `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`.

## 7. Pantallas

| Pestaña | Pantallas | Entrega |
| --- | --- | --- |
| (primer uso) | Bienvenida con guía «Añadir a pantalla de inicio» · Clave de la app (solo en `display-mode: standalone`) | MVP |
| Novedades | No leídos de todos los foros (o últimos, si invitado), agrupados por foro | MVP |
| Foros | Lista de foros añadidos · Añadir foro · Árbol de subforos · Lista de temas | MVP |
| (tema) | Mensajes paginados · Responder / citar · Nuevo tema · Marcar leído | MVP |
| Mensajes | Bandeja y conversación | v1 |
| Avisos | Alertas del foro + activar push | v1 |
| Yo | Cuentas por foro (iniciar/cerrar sesión), tema, letra, acerca de | MVP |

## 8. Amenazas y respuesta

| Amenaza | Respuesta |
| --- | --- |
| XSS desde un mensaje del foro | §6: BBCode acotado + DOMPurify + CSP sin scripts externos ni `unsafe-inline` en scripts |
| Proxy usado por terceros | Clave `APP_KEY` + comprobación de `Origin` + límite por minuto |
| SSRF hacia redes internas | §2.3: solo `https`, host con nombre, sin IP literal ni nombres internos, ruta fija, sin redirecciones. Cloudflare no enruta a rangos privados |
| Robo de sesión de un foro | Token cifrado y ligado al host; solo en IndexedDB del móvil; caduca a los 30 días |
| Contraseñas filtradas | Nunca se guardan ni se registran; el proxy no hace `console.log` de cuerpos ni cabeceras |
| Agotar el plan gratuito | El proxy no parsea (CPU < 10 ms); caché en el móvil; sin KV en el MVP |
| Foro tras protección antibots | Se marca como no compatible y se informa; no se esquiva |

## 9. Particularidades de iOS

- La app instalada no comparte almacenamiento con Safari: la clave y los foros se piden y guardan solo dentro de la app
  instalada (`display-mode: standalone`); en Safari se muestra solo la guía de instalación.
- `navigator.storage.persist()` al primer arranque para que iOS no borre IndexedDB.
- Formulario de inicio de sesión con `autocomplete="username"` y `"current-password"` para usar el Llavero.
- Push y contador en el icono solo funcionan con la app instalada (iOS 16.4+), tras un toque del usuario.

## 10. Riesgo abierto

Algunos foros están detrás de Cloudflare: una petición desde un Worker puede recibir 403 aunque desde el
navegador funcione. Se comprobará con Club Tesla en la Fase 3 en cuanto el proxy esté desplegado.

## 11. Revisión

2026-11-05 · `revisor` (Opus): sin críticos. 7 importantes aplicados en este documento (§2 `_routes.json`, cabeceras de
respuesta, validador único, multipart; §3 AAD; §6 clases `bb-`; §9 iOS). Las correcciones de código (punto final del host,
validador compartido, robustez de `xmlrpc.ts`, textos a i18n) las aplica `api-foros`.
