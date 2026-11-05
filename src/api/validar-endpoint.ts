// Validación pura de endpoints de foros. La comparten descubrir.ts y el proxy (Worker).
// Sin dependencias del DOM: solo la clase estándar URL.

export type CodigoError =
  | 'vacio'
  | 'esquema'
  | 'ip'
  | 'host-interno'
  | 'puerto'
  | 'ruta'
  | 'credenciales'
  | 'consulta'
  | 'host-propio';

export type ResultadoValidacion = { ok: true; url: URL } | { ok: false; codigo: CodigoError };

export interface OpcionesValidacion {
  /** Dominio de la propia app: se rechaza (evita que el proxy se llame a sí mismo). */
  hostPropio?: string;
}

const SUFIJOS_INTERNOS = [
  '.local', '.localhost', '.internal', '.lan', '.home', '.home.arpa',
  '.localdomain', '.test', '.invalid', '.example', '.onion',
];
const RUTA_MOBIQUO = '/mobiquo/mobiquo.php';
const RE_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Host sin punto final y en minúsculas. */
export function limpiarHost(host: string): string {
  return host.toLowerCase().replace(/\.+$/, '');
}

function esIp(host: string): boolean {
  if (host.startsWith('[') || host.includes(':')) return true; // IPv6
  if (RE_IPV4.test(host)) return true;
  const ultima = host.split('.').pop() ?? '';
  return /^\d+$/.test(ultima) || /^0x[0-9a-f]*$/i.test(ultima); // 2130706433, 0x7f.1...
}

function esInterno(host: string): boolean {
  if (host === 'localhost' || !host.includes('.')) return true;
  return SUFIJOS_INTERNOS.some((s) => host.endsWith(s));
}

function esPropio(host: string, propio: string | undefined): boolean {
  if (!propio) return false;
  const p = limpiarHost(propio);
  return host === p || host.endsWith(`.${p}`);
}

function validarHost(host: string, opc: OpcionesValidacion): CodigoError | null {
  if (esIp(host)) return 'ip';
  if (esInterno(host)) return 'host-interno';
  if (esPropio(host, opc.hostPropio)) return 'host-propio';
  return null;
}

function analizar(texto: string): URL | null {
  try {
    return new URL(texto);
  } catch {
    return null;
  }
}

function validarPartes(u: URL, opc: OpcionesValidacion): CodigoError | null {
  if (u.protocol !== 'https:') return 'esquema';
  if (u.username || u.password) return 'credenciales';
  if (u.port !== '' && u.port !== '443') return 'puerto';
  if (u.search || u.hash) return 'consulta';
  const codigoHost = validarHost(limpiarHost(u.hostname), opc);
  if (codigoHost) return codigoHost;
  return u.pathname.endsWith(RUTA_MOBIQUO) ? null : 'ruta';
}

export function validarEndpoint(url: string, opc: OpcionesValidacion = {}): ResultadoValidacion {
  if (!url.trim()) return { ok: false, codigo: 'vacio' };
  const u = analizar(url.trim());
  if (!u) return { ok: false, codigo: 'esquema' };
  const codigo = validarPartes(u, opc);
  return codigo ? { ok: false, codigo } : { ok: true, url: u };
}
