// Saneado de todo HTML que venga de un foro. Lista cerrada de etiquetas y atributos.
import DOMPurify from 'dompurify';
import { bbcodeAHtml } from './bbcode';

export const ETIQUETAS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'blockquote', 'cite', 'pre', 'code',
  'ul', 'ol', 'li', 'a', 'img', 'span', 'div', 'details', 'summary',
];
export const ATRIBUTOS = ['href', 'src', 'alt', 'title', 'class'];

const RE_HTTPS = /^\s*https:/i;
// Lista cerrada: un mensaje no puede imitar clases de la app (bb-imagen-diferida, bb-quote--plegada…).
const RE_CLASE = /^bb-(quote|spoiler|code|color-[a-z]+|size-(s|l|xl))$/;

// Instancia propia: los hooks no afectan a otro uso de DOMPurify.
const purify = DOMPurify(window);

purify.addHook('uponSanitizeAttribute', (_nodo, datos) => {
  const nombre = datos.attrName;
  if (nombre === 'class') {
    const validas = datos.attrValue.split(/\s+/).filter((c) => RE_CLASE.test(c));
    datos.attrValue = validas.join(' ');
    datos.keepAttr = validas.length > 0;
  } else if ((nombre === 'href' || nombre === 'src') && !RE_HTTPS.test(datos.attrValue)) {
    datos.keepAttr = false; // también descarta data:, javascript:, rutas relativas
  }
});

purify.addHook('afterSanitizeAttributes', (nodo) => {
  if (nodo.nodeName === 'A') {
    nodo.setAttribute('target', '_blank');
    nodo.setAttribute('rel', 'noopener noreferrer nofollow');
  } else if (nodo.nodeName === 'IMG') {
    nodo.setAttribute('loading', 'lazy');
    nodo.setAttribute('decoding', 'async');
    nodo.setAttribute('referrerpolicy', 'no-referrer');
  }
});

/**
 * Saneado a un DocumentFragment. No se vuelve a serializar ni a parsear nada después de DOMPurify
 * (evita mXSS): quien pinta debe insertar el fragmento tal cual (`replaceChildren`).
 */
export function sanearFragmento(html: string): DocumentFragment {
  return purify.sanitize(html, {
    ALLOWED_TAGS: ETIQUETAS,
    ALLOWED_ATTR: ATRIBUTOS,
    ALLOWED_URI_REGEXP: /^https:/i,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
  });
}

export type ModoImagenes = 'siempre' | 'tocar';

export const RE_EMOJI = /^https:\/\/emoji\.tapatalk-cdn\.com\//i;

/** Con «al tocar», cada imagen (emojis incluidos) pasa a ser un botón que la carga bajo demanda. */
function diferirImagenes(fragmento: DocumentFragment, textoBoton: string): void {
  fragmento.querySelectorAll('img').forEach((img) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    const src = img.getAttribute('src') ?? '';
    const emoji = RE_EMOJI.test(src);
    boton.className = emoji ? 'bb-emoji-diferido' : 'bb-imagen-diferida';
    boton.setAttribute('data-src', src);
    if (emoji) boton.setAttribute('aria-label', textoBoton);
    else boton.textContent = textoBoton;
    img.replaceWith(boton);
  });
}

/** Texto del foro (HTML + BBCode) -> fragmento seguro listo para insertar. */
export function contenidoAFragmento(
  bruto: string,
  opc: { imagenes?: ModoImagenes; textoBoton?: string } = {},
): DocumentFragment {
  const f = sanearFragmento(bbcodeAHtml(bruto));
  if (opc.imagenes === 'tocar') diferirImagenes(f, opc.textoBoton ?? '');
  return f;
}

/** Serializa un fragmento ya saneado, solo para inspección (tests, texto plano). No se reparsea. */
export function fragmentoAHtml(f: DocumentFragment): string {
  const d = document.createElement('div');
  d.append(f.cloneNode(true));
  return d.innerHTML;
}

/** Texto plano de un fragmento (para citar). */
export function aTextoPlano(bruto: string): string {
  return (sanearFragmento(bruto.replace(/<br\s*\/?>/gi, '\n')).textContent ?? '').trim();
}
