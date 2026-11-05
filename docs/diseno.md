# Diseño de Tertulia · «Sala de lectura nocturna»

Fecha: 2026-11-05 · Sustituye al estilo «Ajustes de iOS» del primer MVP, que el usuario rechazó por genérico.

## Idea

Tertulia sirve para leer conversaciones largas, muchas veces de noche. El diseño es una sala de lectura:
tinta azul noche, texto color papel y una sola luz cálida (latón) que marca lo nuevo y lo que se puede tocar.
El elemento memorable es **el hilo**: en un tema, los mensajes no van en tarjetas; cuelgan de una línea
vertical continua, con cada autor como un nudo. Todo lo demás es sobrio.

## Color

Modo oscuro por defecto (ajuste en Yo: Oscuro · Claro · Automático; por defecto Oscuro).

| Token | Oscuro | Claro | Uso |
| --- | --- | --- | --- |
| `--tinta` | `#10141C` | `#F7F7F4` | fondo |
| `--superficie` | `#181D28` | `#FFFFFF` | hojas (redactar), barra de pestañas, campos |
| `--linea` | `#273042` | `#DEDFE3` | separadores, el hilo |
| `--papel` | `#ECE6DA` | `#1A2030` | texto principal |
| `--tenue` | `#8E96A7` | `#5D6576` | metadatos, extractos |
| `--laton` | `#D6A85C` | `#93661C` | acento: no leído, enlaces, pestaña activa, botón principal |

Sin degradados ni sombras grises. Profundidad solo con `--superficie` y desenfoque en la barra de pestañas.
Contraste mínimo AA en todo texto (comprobar `--tenue` sobre `--tinta`).

## Tipografía

Fuentes empaquetadas (npm `@fontsource-variable/literata` y `@fontsource-variable/instrument-sans`, solo
subconjunto latino), servidas desde el propio dominio: sin Google Fonts (privacidad y CSP).

| Rol | Fuente | Tamaño / interlineado | Peso |
| --- | --- | --- | --- |
| Título grande de pantalla | Literata (opsz alto) | 34 / 1.1, tracking −0.01em | 600 |
| Título de tema (cabecera del hilo) | Literata | 26 / 1.2 | 600 |
| Título en listas | Literata | 18 / 1.3 | 600 (no leído) · 500 (leído, color `--tenue`) |
| Cuerpo de los mensajes | Literata | 17 / 1.6, máx. ~68 caracteres | 400 |
| Interfaz (botones, pestañas, metadatos) | Instrument Sans | 15 · 13 / 1.3 | 500 · 400 |

Nada de etiquetas en mayúsculas. Nada de metadatos unidos con «·»: se separan con espacio y peso/color.
Los títulos que el foro manda en mayúsculas se respetan (son contenido).

## Estructura

**Novedades** (y listas de temas): filas sin tarjetas sobre `--tinta`, separadores finos con sangría.

```
Novedades                                   (Literata 34)

Club Tesla España                 3 nuevos  (Instrument 13 tenue / latón)
───────────────────────────────────────────
●  ENTREGAS MODEL 3 / MODEL Y Q4 2026       ● = punto latón si hay no leídos
   Hola a todos! Lo primero, muchísimas…    extracto 2 líneas, tenue
   usuario1    hace 32 min          5.482   respuestas a la derecha con icono de bocadillo
───────────────────────────────────────────
```

**Tema · el hilo** (elemento memorable):

```
‹ General                              ⋯
ENTREGAS MODEL 3 /                         Literata 26, alineado a la izquierda
MODEL Y Q4 2026
5.483 mensajes            Página 1 de 2.742 ›

  ◉ usuario3                  26 sept   #1   nudo: círculo 32 px con iniciales sobre la línea
  │ Muy buenas a tod@s, empezamos el        cuerpo Literata 17, sin caja
  │ último trimestre…
  │
  ◉ usuario3                  26 sept   #2
  │ 2_ QUÉ SUCEDE CUANDO…
  │  ┃ Cita de usuario2                      cita: filete latón 2 px a la izquierda,
  │  ┃ texto citado en tenue                 nombre del citado arriba; plegable si es larga
  ┆
[ Escribe una respuesta…            ]  ↑    barra fija abajo (superficie), abre la hoja de redactar
```

La línea del hilo (`--linea`, 1.5 px) va a 28 px del borde y une los nudos. Mensaje del propio usuario:
nudo en latón. Mensajes nuevos desde la última visita: el tramo de línea correspondiente en latón.

**Redactar**: hoja inferior sobre `--superficie`, campo de texto en Literata 17, botón «Publicar» en latón,
el borrador se guarda solo. La misma acción se llama igual en todo el flujo («Publicar» → «Publicado»).

**Foros**: lista de foros añadidos con su nombre en Literata 20 y el host en Instrument 13; el árbol de
subforos con sangría y una guía vertical fina (no cajas anidadas).

**Barra de pestañas**: `--superficie` al 80 % con `backdrop-filter: blur(20px)`, iconos propios de trazo
1.5 px, activa en latón, sin fondo de píldora.

## Movimiento

Solo como respuesta a una acción: la hoja de redactar sube (200 ms), el contenido nuevo del hilo se
desvela al cargar la página siguiente. Nada de animaciones de entrada en cada fila.
`prefers-reduced-motion` desactiva todo.

## Contenido

- Varios `<br>` seguidos se reducen a dos como máximo (antes dejaban huecos enormes).
- Emojis del foro (`emoji.tapatalk-cdn.com` y similares) en línea a 1.25em, no como imagen grande.
- Imágenes de los mensajes a ancho completo de la columna, esquinas 6 px, toque para ampliar.

## Calidad mínima

Foco visible (anillo latón), objetivos táctiles ≥ 44 px, zonas seguras, texto escalable con el ajuste de
tamaño de letra, contraste AA.
