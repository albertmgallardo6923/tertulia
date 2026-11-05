// Genera endpoints candidatos a partir de lo que escribe el usuario (sin red).
import { limpiarHost, validarEndpoint, type CodigoError, type OpcionesValidacion } from './validar-endpoint';

export class ErrorDireccion extends Error {
  constructor(readonly codigo: CodigoError) {
    super(codigo);
    this.name = 'ErrorDireccion';
  }
}

const RUTAS_HABITUALES = ['/forum', '/foro', '/foros', '/forums', '/community'];
const SUFIJO = '/mobiquo/mobiquo.php';
const RE_ESQUEMA = /^[a-z][a-z0-9+.-]*:\/\//i;

function parsear(entrada: string): URL {
  const t = entrada.trim();
  if (!t) throw new ErrorDireccion('vacio');
  try {
    return new URL(RE_ESQUEMA.test(t) ? t : `https://${t}`);
  } catch {
    throw new ErrorDireccion('esquema');
  }
}

/** Quita barras finales y un posible /mobiquo[/mobiquo.php] ya escrito. */
function limpiarRuta(ruta: string): string {
  return ruta
    .replace(/\/+$/, '')
    .replace(/\/mobiquo(\/mobiquo\.php)?$/i, '')
    .replace(/\/+$/, '');
}

/** Conserva esquema, puerto, credenciales y consulta para que el validador los rechace. */
function construir(base: URL, host: string, ruta: string): string {
  const u = new URL(base.href);
  if (!host.startsWith('[')) u.hostname = host;
  u.pathname = `${ruta}${SUFIJO}`;
  return u.href;
}

export function endpointsCandidatos(entrada: string, opc: OpcionesValidacion = {}): string[] {
  const base = parsear(entrada);
  const host = limpiarHost(base.hostname);
  const dada = limpiarRuta(base.pathname);
  // Con ruta dada: primero esa, luego la raíz y las habituales.
  const rutas = dada === '' ? ['', ...RUTAS_HABITUALES] : [dada, '', ...RUTAS_HABITUALES];
  const candidatos = [...new Set(rutas)].map((r) => construir(base, host, r));
  return candidatos.map((c) => {
    const v = validarEndpoint(c, opc);
    if (!v.ok) throw new ErrorDireccion(v.codigo);
    return v.url.href;
  });
}
