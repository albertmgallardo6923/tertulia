# Mercado de lectores de foros para móvil

Fecha: 5 de noviembre de 2026

## Panorama

Hay tres formas de leer foros en el móvil:

- **Vía plugin de terceros (Tapatalk API):** la app habla con un plugin que el administrador instala. Es la vía de Tapatalk y de Forum Fiend.
- **Vía API o app oficial del software:** la comunidad ofrece su propia app. Es el caso de Discourse.
- **Vía web:** el foro se abre en el navegador, con o sin app instalable (PWA).

## Tabla comparativa

Lo marcado como "sin confirmar" no apareció en las fuentes que abrí.

| App | Plataformas | Cómo accede a los foros | Precio / modelo | Estado en 2026 | Lo mejor | Lo peor |
|---|---|---|---|---|---|---|
| Tapatalk | iPhone, Android (web sin confirmar) | Plugin Tapatalk en el foro | Gratis con anuncios; VIP Access: US$0,99/mes, US$4,99 y US$9,99/año, US$29,99 de por vida | Activa (versión 8.10.60) | Miles de foros; notificaciones; marca conocida | Anuncios; cambios de navegación; dependencia del plugin |
| Forum Fiend (Ape Apps) | Web, Android, Windows, Amazon (iOS sin confirmar) | API de Tapatalk; XenForo en pruebas; si no hay API, vista web integrada | Sin confirmar; hay enlace a "Premium" | Sin confirmar (sin fecha) | Funciona en foros sin API gracias a la vista web | Su propia ficha dice que la API de Tapatalk parece abandonada |
| Forum Fiend OSP | Android | Igual que Forum Fiend | Gratis, licencia MIT | Descontinuada: sin actualizar hace más de tres años | Código abierto; base para reutilizar | Sin mantenimiento |
| Forum Talker | Sin confirmar | Sin confirmar | Sin confirmar | Sin confirmar | Aparece en listados de alternativas | Sin confirmar: no abrí su ficha |
| Topic'it | Sin confirmar | Plugin propio para el foro (sin confirmar) | Sin confirmar | Sin confirmar | Sin confirmar | Sin confirmar: no abrí su web |
| Forum Runner | iPhone, iPad, Android | Solo foros XenForo, app nativa | Sin confirmar | Sin confirmar (sin fecha) | Descarga solo texto del foro; ahorra datos | Solo XenForo |
| Discourse Hub (oficial) | iPhone, iPad | API oficial de Discourse | Gratis; compras sin confirmar | Activa: versión 2.2.3 (año sin confirmar) | Oficial; varias comunidades en una app; notificaciones | Solo Discourse |
| PWA nativa de XenForo 2.2+ | Navegador: Android y escritorio. En iPhone, Safari no permite instalarla (según el artículo, de 2020) | Web oficial del foro, sin app | Incluida en XenForo | Función oficial; estado actual en iOS sin confirmar | Oficial; sin plugin; caché offline básica | En iPhone no se instala según el artículo; puede estar desactualizado |
| XenForo Reader | iPad / iPhone (sin confirmar) | Lee foros XenForo | US$7,99 | Versión 1.3.1; fecha sin confirmar | Lectura sencilla; permite varios sitios | Valoración de 1,7 con 3 reseñas; algunos foros no cargan |
| Lectores RSS | Cualquiera | Feed del foro, si lo publica | Gratis o de pago | Depende de cada app | Sin plugin; sin anuncios propios | No todos los foros publican feed; sin respuestas ni mensajes |

Otras apps vistas en búsquedas y no verificadas: Forum Copilot y ThreadMaster (ambas en App Store).

## Oportunidades para Tertulia

1. **Sin anuncios ni suscripción.** Es uso personal: no hace falta un modelo de pago.
2. **Interfaz directa.** Lista de foros, hilos y respuesta. Nada de pestañas de tendencias ni feeds que compiten con la lectura.
3. **Dos vías de acceso.** Plugin de Tapatalk cuando existe y, como respaldo, vista web del foro. Así se cubren los foros que quitaron el plugin.
4. **Carga ligera.** Descargar texto primero e imágenes bajo demanda, como hace Forum Runner.
5. **Lectura sin conexión.** Guardar los hilos ya leídos. La PWA de XenForo ya hace algo similar.
6. **Firma vacía por defecto.** Evitar la firma automática que la gente critica de Tapatalk.
7. **Código abierto y mantenible.** Forum Fiend OSP quedó abandonado. Un proyecto pequeño y documentado puede seguir vivo.
8. **Foros propios sin app.** Usar la PWA para foros que no tienen plugin ni API.

## Riesgos

1. **Quitar el plugin.** Algunos administradores retiran el plugin de Tapatalk. Cuántos lo hacen: sin confirmar. Mitigación: detectar el fallo y pasar a la vía web.
2. **API abandonada.** Forum Fiend dice que la API de Tapatalk parece abandonada. Si Tapatalk cambia o corta el acceso, la app deja de funcionar con esos foros.
3. **Protección de Cloudflare (error 403).** Hay hilos de usuarios con 403 al conectar desde apps. Detalle y frecuencia: sin confirmar. Mitigación: detectarlo en la Fase 0 y marcar el foro como no compatible; no se esquiva el bloqueo (ver límites del prompt).
4. **Cambios en la API XML-RPC.** No encontré documentación oficial pública y estable. Hay que tratar la API como no fiable y revisar cada respuesta.
5. **iOS y la PWA.** En iPhone, las notificaciones push y la instalación dependen de la versión de iOS y de que la PWA esté añadida a la pantalla de inicio. Sin confirmar en el estado actual.
6. **Términos de uso.** Tapatalk puede prohibir clientes de terceros. No revisé sus condiciones: hay que leerlas antes de publicar nada.
7. **Foros con app propia.** Discourse y XenForo tienen sus propias vías. Si el foro cambia de software, Tertulia debe adaptarse.

## Fuentes

1. Ficha de Tapatalk en App Store: https://apps.apple.com/app/id307880732
2. Hilo de administradores sobre anuncios en Tapatalk: https://xenforo.com/community/threads/tapatalk-will-now-have-ads.60418
3. Ficha de Forum Fiend (Ape Apps): https://apps.ape-apps.com/forum-fiend
4. Ficha de Forum Fiend OSP (AlternativeTo): https://alternativeto.net/software/forum-fiend-osp/about
5. Artículo oficial de la PWA de XenForo 2.2: https://xenforo.com/community/threads/progressive-web-app.181448
6. Ficha de Forum Runner (XenForo): https://xenforo.com/community/resources/forum-runner-ios-android-xenforo-app.617
7. Ficha de Discourse Hub en App Store: https://apps.apple.com/us/app/discourse-hub/id1173672076
8. Ficha de XenForo Reader en App Store: https://apps.apple.com/us/app/xenforo-reader/id1453143875
