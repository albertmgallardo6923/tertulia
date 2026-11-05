# Contrato de la API (XML-RPC de Tapatalk)

Endpoint: `https://host[/ruta]/mobiquo/mobiquo.php`, POST con cuerpo `methodCall`. Código en `src/api/`
(`xmlrpc.ts`, `tipos.ts`, `cliente.ts`, `descubrir.ts`). Estado: **V** = verificado con Club Tesla
(`tests/fixtures/foro-clubtesla-es/`), **SV** = sin verificar con foro real (según la API publicada).

## Métodos

Convención: `s` = string, `i` = int, `b` = boolean, `B64` = base64 UTF-8. `desde`/`hasta` son índices (0-based, inclusivos).

| Método cliente | XML-RPC | Parámetros | Campos que usamos (respuesta) | Estado |
| --- | --- | --- | --- | --- |
| `getConfig()` | `get_config` | ninguno | `version`, `api_level`, `is_open`, `guest_okay`, `login_type`, `get_latest_topic`, `push_type`, `user_id` | V |
| `getForos()` | `get_forum` | `b return_description=false` | array de `forum_id` s, `forum_name` B64, `parent_id` s, `sub_only` b, `can_post` b, `can_subscribe`, `is_subscribed`, `new_post` b, `url`, `child` array (recursivo) | V |
| `getUltimosTemas(d,h)` | `get_latest_topic` | `i desde, i hasta` | `total_topic_num` i, `topics[]` (ver Tema) | V |
| `getTemas(foro,d,h,modo)` | `get_topic` | `s forum_id, i desde, i hasta, s modo` (`""`, `TOP`, `ANN`) | igual que `get_latest_topic` | SV |
| `getHilo(tema,d,h)` | `get_thread` | `s topic_id, i desde, i hasta, b return_html=true` | `total_post_num`, `topic_*`, `can_reply`, `is_closed`, `is_sticky`, `posts[]` (ver Mensaje) | V |
| `login(u,c)` | `login` | `B64 login_name, B64 password` | `result` b, `result_text` B64, `user_id`, `username`/`login_name` | SV |
| `getNoLeidos(d,h)` | `get_unread_topic` | `i desde, i hasta` | como `get_latest_topic` | SV |
| `responder(f,t,asunto,texto)` | `reply_post` | `s forum_id, s topic_id, B64 asunto, B64 texto` | `result` b, `result_text` B64, `post_id` | SV |
| `nuevoTema(f,asunto,texto)` | `new_topic` | `s forum_id, B64 asunto, B64 texto` | `result`, `result_text`, `topic_id` | SV |
| `marcarLeido(t?)` | `mark_topic_read` (con id) / `mark_all_as_read` (sin id) | `array<s> topic_ids` / ninguno | `result`, `result_text` | SV |
| `getSuscritos(d,h)` | `get_subscribed_topic` | `i desde, i hasta` | como `get_latest_topic` | SV |

Tema (`topics[]`): `topic_id` s, `forum_id` s, `forum_name` B64, `topic_title` B64, `short_content` B64,
`reply_number` i, `view_number` i, `post_author_id` s, `post_author_name` B64, `post_time` dateTime, `timestamp` s,
`new_post` b, `is_closed` b, `is_sticky` b, `is_subscribed` b.
Mensaje (`posts[]`): `post_id` s, `post_title` B64, `post_content` B64, `post_author_id` s,
`post_author_name` B64, `post_time`, `timestamp`, `can_edit` b, `attachments`.

## Campos en base64

Texto libre: `forum_name`, `topic_title`, `short_content`, `post_title`, `post_content`, `post_author_name`,
`topic_author_name`, `result_text`. Ids, contadores y banderas **no**. Vacío: `<base64/>` (→ `""`).

## Rarezas

- `post_time` es `20261105T21:26:32+00:00` (ISO compacto con zona). **La zona miente**: es hora local
  del foro (1 h menos que UTC real en noviembre). Usamos `timestamp` (segundos, texto) y `post_time` solo como respaldo.
- `post_content` mezcla HTML (`<br />`) y BBCode (`[img]`, `[quote]`); sanear con DOMPurify tras convertir.
- `forum_id` de categorías con prefijo `c` (`c1`) y `sub_only=1`; `parent_id` raíz = `-1` (→ `padreId: null`).
- `view_number` difiere entre `get_latest_topic` (164007) y `get_thread` (164): no fiable entre pantallas.
- Booleanos llegan como `<boolean>` y también como `<string>1</string>` (config): tratar `1`/`true` como verdadero.
- Emojis del plugin: imágenes de `emoji.tapatalk-cdn.com` (el proxy/CSP debe permitirlas).
- `<fault>` → `ErrorXmlRpc(codigo, mensaje)`. Muchos errores de negocio llegan como `result=false` + `result_text`, no como fault.
- La sesión (cookie) la gestiona el proxy; el cliente no la ve. Contraseñas nunca en logs.

## Cómo añadir un foro

1. El usuario escribe la dirección; `endpointsCandidatos(entrada)` devuelve los endpoints a probar
   (rechaza http, IP, localhost, puertos no estándar).
2. Probar cada candidato por el proxy con `getConfig()` (1 petición/s); el primero que devuelva `version` válida y `is_open` gana.
3. Si ninguno responde o bloquea clientes externos, marcar el foro como no compatible (no esquivar).
4. Guardar endpoint + `Config`; pedir login solo si `guest_okay` es falso o el usuario quiere participar.
5. Para una fixture nueva: grabar en `tests/fixtures/<foro>/<metodo>.xml` (recortada, anonimizada) con README de rarezas.
