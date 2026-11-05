// Jarra de cookies del foro: parseo de Set-Cookie y serialización de la cabecera Cookie.

export type Cookies = Record<string, string>;

const MAX_COOKIES = 30;
const MAX_LONGITUD = 4096;
const RE_NOMBRE = /^[\w!#$%&'*+.^`|~-]+$/;
const RE_VALOR = /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*$/;

interface Parseada {
  nombre: string;
  valor: string;
  borrar: boolean;
}

function haCaducado(atributos: string[], ahora: number): boolean {
  for (const attr of atributos) {
    const i = attr.indexOf('=');
    const clave = (i < 0 ? attr : attr.slice(0, i)).trim().toLowerCase();
    const valor = i < 0 ? '' : attr.slice(i + 1).trim();
    if (clave === 'max-age') {
      const n = Number(valor);
      if (Number.isFinite(n) && n <= 0) return true;
    } else if (clave === 'expires') {
      const t = Date.parse(valor);
      if (!Number.isNaN(t) && t <= ahora) return true;
    }
  }
  return false;
}

export function parsearSetCookie(linea: string, ahora: number): Parseada | null {
  if (linea.length > MAX_LONGITUD) return null;
  const [par = '', ...atributos] = linea.split(';');
  const i = par.indexOf('=');
  if (i <= 0) return null;
  const nombre = par.slice(0, i).trim();
  const valor = par.slice(i + 1).trim();
  if (!RE_NOMBRE.test(nombre) || !RE_VALOR.test(valor)) return null;
  return { nombre, valor, borrar: valor === '' || haCaducado(atributos, ahora) };
}

/** Aplica las líneas Set-Cookie sobre las cookies previas; devuelve una copia nueva. */
export function combinarCookies(previas: Cookies, lineas: string[], ahora: number): Cookies {
  const mapa = new Map(Object.entries(previas));
  for (const linea of lineas) {
    const c = parsearSetCookie(linea, ahora);
    if (!c) continue;
    if (c.borrar) mapa.delete(c.nombre);
    else if (mapa.has(c.nombre) || mapa.size < MAX_COOKIES) mapa.set(c.nombre, c.valor);
  }
  return Object.fromEntries(mapa);
}

export function cabeceraCookie(cookies: Cookies): string {
  return Object.entries(cookies)
    .map(([n, v]) => `${n}=${v}`)
    .join('; ');
}
