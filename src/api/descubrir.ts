// Genera endpoints candidatos a partir de lo que escribe el usuario (sin red).

export class ErrorDireccion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDireccion';
  }
}

const RUTAS_HABITUALES = ['/forum', '/foro', '/foros', '/forums', '/community'];
const RE_ESQUEMA = /^[a-z][a-z0-9+.-]*:\/\//i;
const RE_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

function esAnfitrionInvalido(host: string): boolean {
  if (host.includes(':') || host.startsWith('[')) return true; // IPv6 literal
  if (RE_IPV4.test(host)) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (!host.includes('.')) return true; // sin dominio (intranet)
  if (/^\d+$/.test(host.split('.').pop() ?? '')) return true; // IP en otras notaciones
  return /\.(local|internal|lan|home|localdomain)$/.test(host);
}

function parsear(entrada: string): URL {
  const t = entrada.trim();
  if (!t) throw new ErrorDireccion('Dirección vacía');
  if (/^http:\/\//i.test(t)) throw new ErrorDireccion('Solo se admite https');
  if (RE_ESQUEMA.test(t) && !/^https:\/\//i.test(t)) throw new ErrorDireccion('Esquema no admitido');
  try {
    return new URL(RE_ESQUEMA.test(t) ? t : `https://${t}`);
  } catch {
    throw new ErrorDireccion('Dirección no válida');
  }
}

/** Quita barras finales y un posible /mobiquo[/mobiquo.php] ya escrito. */
function limpiarRuta(ruta: string): string {
  return ruta
    .replace(/\/+$/, '')
    .replace(/\/mobiquo(\/mobiquo\.php)?$/i, '')
    .replace(/\/+$/, '');
}

export function endpointsCandidatos(entrada: string): string[] {
  const url = parsear(entrada);
  if (url.port !== '') throw new ErrorDireccion('Puerto no estándar');
  if (url.username || url.password) throw new ErrorDireccion('Dirección no válida');
  if (esAnfitrionInvalido(url.hostname)) throw new ErrorDireccion('Servidor no admitido');

  const base = `https://${url.hostname}`;
  const dada = limpiarRuta(url.pathname);
  // Con ruta dada: primero esa, luego la raíz y las habituales.
  const orden = dada === '' ? ['', ...RUTAS_HABITUALES] : [dada, '', ...RUTAS_HABITUALES];
  const unicas = [...new Set(orden)];
  return unicas.map((r) => `${base}${r}/mobiquo/mobiquo.php`);
}
