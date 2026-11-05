// Saneado de todo HTML que venga de un foro. Lista cerrada de etiquetas y atributos.
import DOMPurify from 'dompurify';
import { bbcodeAHtml } from './bbcode';

export const ETIQUETAS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'blockquote', 'cite', 'pre', 'code',
  'ul', 'ol', 'li', 'a', 'img', 'span', 'div', 'details', 'summary',
];
export const ATRIBUTOS = ['href', 'src', 'alt', 'title', 'class'];

const RE_HTTPS = /^\s*https:/i;
const RE_CLASE = /^bb-[a-z0-9-]+$/;

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

export function sanear(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: ETIQUETAS,
    ALLOWED_ATTR: ATRIBUTOS,
    ALLOWED_URI_REGEXP: /^https:/i,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

export type ModoImagenes = 'siempre' | 'tocar';

const RE_EMOJI = /^https:\/\/emoji\.tapatalk-cdn\.com\//i;

/** Con «al tocar», cada imagen pasa a ser un botón que la carga bajo demanda (salvo los emojis). */
function diferirImagenes(html: string, textoBoton: string): string {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = html;
  plantilla.content.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (RE_EMOJI.test(src)) return;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'bb-imagen-diferida';
    boton.setAttribute('data-src', src);
    boton.textContent = textoBoton;
    img.replaceWith(boton);
  });
  return plantilla.innerHTML;
}

/** Texto del foro (HTML + BBCode) -> HTML seguro listo para pintar. */
export function contenidoAHtml(
  bruto: string,
  opc: { imagenes?: ModoImagenes; textoBoton?: string } = {},
): string {
  const limpio = sanear(bbcodeAHtml(bruto));
  return opc.imagenes === 'tocar' ? diferirImagenes(limpio, opc.textoBoton ?? '') : limpio;
}

/** Texto plano de un fragmento (para citar). */
export function aTextoPlano(bruto: string): string {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = sanear(bruto.replace(/<br\s*\/?>/gi, '\n'));
  return (plantilla.content.textContent ?? '').trim();
}
