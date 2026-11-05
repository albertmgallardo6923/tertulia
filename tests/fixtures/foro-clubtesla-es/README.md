# Fixtures: Foro Club Tesla España

- Foro: https://foro.clubtesla.es/ · SMF 2.1 · plugin de Tapatalk `sm21` · `api_level` 3.
- Grabado: 2026-11-05, como invitado (sin iniciar sesión), desde el navegador de la app con
  `fetch` al mismo origen. 4 peticiones en total, con pausas de 1,5 s.
- Recortado: como máximo 2 elementos por lista; textos largos cortados a 120–300 caracteres (`…`).
- Anonimizado: nombres de usuario → `usuarioN`; ids de usuario → `100N`; sin avatares ni `api_key`.
  En `get_config.xml`, `user_id` también está anonimizado (como invitado debería ser 0).

| Archivo | Llamada |
| --- | --- |
| get_config.xml | `get_config()` |
| get_forum.xml | `get_forum(false)` |
| get_latest_topic.xml | `get_latest_topic(0, 4)` |
| get_thread.xml | `get_thread("14162", 0, 2, true)` |

## Rarezas observadas

- `post_time` llega como `20261105T21:26:32+00:00`: ISO 8601 compacto **con** zona horaria (el estándar XML-RPC no la lleva). Hay también `timestamp` en segundos, como texto.
- `post_content` con `return_html=true` mezcla HTML (`<br />`) y BBCode (`[img]…[/img]`, `[quote]`).
- Los emojis del plugin son imágenes de `emoji.tapatalk-cdn.com`.
- `view_number` del tema: 164007 en `get_latest_topic` pero 164 en `get_thread` (truncado o en miles).
- Las categorías tienen `forum_id` con prefijo `c` (`c1`, `c2`) y `sub_only=1`; `parent_id` raíz es `-1`.
- `push_type` en `get_config`: `quote,tag,sub,pm,newtopic,newsub`.
