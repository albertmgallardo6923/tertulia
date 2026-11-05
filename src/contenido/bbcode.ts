// BBCode (lista cerrada) -> HTML. La salida SIEMPRE se sanea después (sanear.ts).
// La entrada mezcla HTML del foro (<br />) y BBCode; el BBCode desconocido se deja como texto.
import { t } from '../i18n';

const MARCA_INI = '';
const MARCA_FIN = '';
const MAX_VUELTAS = 40;
const MAX_ENTRADA = 100_000; // 100 KB: más allá no se procesa (cota para los reemplazos con regex)
const RE_BR_SEGUIDOS = /(?:<br\s*\/?>\s*){3,}/gi;

/** Tres o más saltos seguidos se quedan en dos. */
function reducirSaltos(s: string): string {
  return s.replace(RE_BR_SEGUIDOS, '<br><br>');
}


function escaparTexto(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Para valores de atributo: no tocamos & (el HTML del foro ya trae entidades). */
function escaparAtributo(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function quitarComillas(s: string): string {
  return s.trim().replace(/^(["'])(.*)\1$/, '$2');
}

// ---------- color y tamaño: solo clases de una paleta cerrada (sin style) ----------

const PALETA: Record<string, [number, number, number]> = {
  red: [211, 47, 47],
  orange: [239, 108, 0],
  yellow: [200, 160, 0],
  green: [56, 142, 60],
  teal: [0, 137, 123],
  blue: [25, 118, 210],
  purple: [123, 31, 162],
  pink: [216, 27, 96],
  brown: [109, 76, 65],
  gray: [117, 117, 117],
};

const NOMBRES: Record<string, string> = {
  red: 'red', crimson: 'red', darkred: 'red', orange: 'orange', yellow: 'yellow', gold: 'yellow',
  green: 'green', lime: 'green', olive: 'green', darkgreen: 'green', teal: 'teal', cyan: 'teal',
  blue: 'blue', navy: 'blue', darkblue: 'blue', indigo: 'purple', purple: 'purple', violet: 'purple',
  pink: 'pink', magenta: 'pink', brown: 'brown', gray: 'gray', grey: 'gray', silver: 'gray',
};

function claseColor(param: string): string | null {
  const p = quitarComillas(param).toLowerCase();
  if (NOMBRES[p]) return `bb-color-${NOMBRES[p]}`;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(p);
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!;
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  if (Math.max(...rgb) - Math.min(...rgb) < 40) return null; // grises, blanco y negro: se dejan como están
  let mejor = '';
  let distMin = Infinity;
  for (const [nombre, c] of Object.entries(PALETA)) {
    const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
    if (d < distMin) {
      distMin = d;
      mejor = nombre;
    }
  }
  return `bb-color-${mejor}`;
}

function claseTamano(param: string): string | null {
  const p = quitarComillas(param).toLowerCase();
  const n = parseFloat(p);
  if (!Number.isFinite(n)) return null;
  const px = /(px|pt|em|%)$/.test(p) || n > 7;
  let grado: number; // 0 pequeño, 1 normal, 2 grande, 3 muy grande
  if (px) grado = n <= 11 ? 0 : n <= 14 ? 1 : n <= 20 ? 2 : 3;
  else grado = n <= 2 ? 0 : n <= 4 ? 1 : n <= 5 ? 2 : 3;
  return ['bb-size-s', null, 'bb-size-l', 'bb-size-xl'][grado] ?? null;
}

// ---------- conversores de cada etiqueta ----------

function envolver(clase: string | null, etiqueta: string, contenido: string): string {
  return clase ? `<${etiqueta} class="${clase}">${contenido}</${etiqueta}>` : contenido;
}

function lista(param: string | undefined, contenido: string): string {
  const items = contenido.split(/\[\*\]/);
  items.shift(); // lo anterior al primer [*] no es un elemento
  const li = items.map((i) => `<li>${i.replace(/^(\s|<br\s*\/?>)+|(\s|<br\s*\/?>)+$/gi, '')}</li>`).join('');
  return param ? `<ol>${li}</ol>` : `<ul>${li}</ul>`;
}

function cita(param: string | undefined, contenido: string): string {
  let autor = '';
  if (param) {
    const p = param.trim();
    autor = /^["']/.test(p) ? (/^(["'])(.*?)\1/.exec(p)?.[2] ?? '') : (p.split(/\s+(?:pid|dateline|time|post)=/i)[0] ?? '');
  }
  const cabecera = autor ? `<cite>${escaparTexto(autor)}</cite>` : '';
  return `<blockquote class="bb-quote">${cabecera}${contenido}</blockquote>`;
}

function enlace(param: string | undefined, contenido: string): string {
  const destino = param !== undefined ? quitarComillas(param) : contenido.replace(/<[^>]*>/g, '').trim();
  return `<a href="${escaparAtributo(destino)}">${contenido}</a>`;
}

function convertir(etiqueta: string, param: string | undefined, contenido: string): string {
  switch (etiqueta) {
    case 'b': return `<b>${contenido}</b>`;
    case 'i': return `<i>${contenido}</i>`;
    case 'u': return `<u>${contenido}</u>`;
    case 's': return `<s>${contenido}</s>`;
    case 'quote': return cita(param, contenido);
    case 'url': return enlace(param, contenido);
    case 'img': {
      const src = contenido.replace(/<[^>]*>/g, '').trim();
      return `<img src="${escaparAtributo(src)}" alt="">`;
    }
    case 'spoiler': {
      const titulo = param ? escaparTexto(quitarComillas(param)) : t('contenido.spoiler');
      return `<details class="bb-spoiler"><summary>${titulo}</summary>${contenido}</details>`;
    }
    case 'list': return lista(param, contenido);
    case 'color': return envolver(param ? claseColor(param) : null, 'span', contenido);
    case 'size': return envolver(param ? claseTamano(param) : null, 'span', contenido);
    default: return contenido;
  }
}

// Una etiqueta cuyo contenido no contiene otra apertura de la misma: se resuelve de dentro a fuera.
// El parámetro no admite «[» ni «]»: así una apertura sin cerrar falla en O(1) y el coste total es lineal.
const RE_ETIQUETA =
  /\[(b|i|u|s|quote|url|img|spoiler|list|color|size)(?:=([^\][]*))?\]((?:(?!\[\1(?:=[^\][]*)?\])[\s\S])*?)\[\/\1\]/gi;

/**
 * [code]: su contenido es literal, se aparta antes de interpretar nada.
 * Recorrido lineal: si una apertura no tiene cierre, ninguna posterior lo tendrá y se para.
 */
function apartarCodigo(s: string, bloques: string[]): string {
  const apertura = /\[code(?:=[^\][]*)?\]/gi;
  const cierre = /\[\/code\]/gi;
  let salida = '';
  let pos = 0;
  for (;;) {
    apertura.lastIndex = pos;
    const a = apertura.exec(s);
    if (!a) break;
    cierre.lastIndex = a.index + a[0].length;
    const c = cierre.exec(s);
    if (!c) break;
    const literal = escaparTexto(s.slice(a.index + a[0].length, c.index).replace(/<br\s*\/?>\r?\n?/gi, '\n'));
    bloques.push(`<pre class="bb-code"><code>${literal}</code></pre>`);
    salida += s.slice(pos, a.index) + `${MARCA_INI}${bloques.length - 1}${MARCA_FIN}`;
    pos = c.index + c[0].length;
  }
  return salida + s.slice(pos);
}

export function bbcodeAHtml(entrada: string): string {
  const bloques: string[] = [];
  // Quitamos nuestras marcas internas del texto del foro para que no puedan colarse.
  let s = entrada.slice(0, MAX_ENTRADA).split(MARCA_INI).join('').split(MARCA_FIN).join('');
  s = apartarCodigo(s, bloques);
  if (!/<br/i.test(s)) s = s.replace(/\r?\n/g, '<br>'); // texto plano: saltos de línea reales
  for (let i = 0; i < MAX_VUELTAS; i++) {
    const nuevo = s.replace(RE_ETIQUETA, (_m, e: string, p: string | undefined, c: string) =>
      convertir(e.toLowerCase(), p, c),
    );
    if (nuevo === s) break;
    s = nuevo;
  }
  s = reducirSaltos(s);
  return s.replace(new RegExp(`${MARCA_INI}(\\d+)${MARCA_FIN}`, 'g'), (_m, n: string) => bloques[Number(n)] ?? '');
}
