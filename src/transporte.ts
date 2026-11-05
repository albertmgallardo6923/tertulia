// Único sitio que habla con el proxy (mismo origen). Nada más en la app llama a fetch.
import { ajustesActuales } from './datos/ajustes';
import { guardarSesion, leerSesion } from './datos/sesiones';

export type CodigoProxy =
  | 'origen'
  | 'clave'
  | 'direccion'
  | 'cuerpo'
  | 'grande'
  | 'limite'
  | 'redireccion'
  | 'red'
  | 'metodo';

const CODIGOS: readonly string[] = [
  'origen', 'clave', 'direccion', 'cuerpo', 'grande', 'limite', 'redireccion', 'red', 'metodo',
];

export class ErrorProxy extends Error {
  constructor(
    readonly codigo: CodigoProxy,
    readonly estado = 0,
    readonly detalle?: { codigo?: string; location?: string },
  ) {
    super(codigo);
    this.name = 'ErrorProxy';
  }
}

export type Transporte = (endpoint: string, cuerpoXml: string) => Promise<string>;

export function esDemo(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');
}

// ---------- ritmo humano: una petición a la vez, con una pausa mínima ----------

let ritmoMs = 300;
let cola: Promise<unknown> = Promise.resolve();
let ultima = 0;

export function configurarRitmo(ms: number): void {
  ritmoMs = ms;
}

function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  const turno = cola.then(async () => {
    const espera = ultima + ritmoMs - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    try {
      return await tarea();
    } finally {
      ultima = Date.now();
    }
  });
  cola = turno.catch(() => undefined);
  return turno;
}

// ---------- llamadas ----------

async function leerError(res: Response): Promise<ErrorProxy> {
  try {
    const j = (await res.json()) as { error?: string; codigo?: string; location?: string };
    const codigo = j.error && CODIGOS.includes(j.error) ? (j.error as CodigoProxy) : 'red';
    return new ErrorProxy(codigo, res.status, { codigo: j.codigo, location: j.location });
  } catch {
    return new ErrorProxy('red', res.status);
  }
}

async function enviarAlProxy(endpoint: string, cuerpo: string, foroId: string | null, clave: string): Promise<string> {
  if (!clave) throw new ErrorProxy('clave', 401);
  const cabeceras: Record<string, string> = {
    Authorization: `Bearer ${clave}`,
    'Content-Type': 'text/xml',
  };
  const sesion = foroId ? await leerSesion(foroId) : undefined;
  if (sesion) cabeceras['X-Tertulia-Sesion'] = sesion;
  let res: Response;
  try {
    res = await fetch(`/api/xmlrpc?u=${encodeURIComponent(endpoint)}`, {
      method: 'POST',
      headers: cabeceras,
      body: cuerpo,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw new ErrorProxy('red');
  }
  if (!res.ok) throw await leerError(res);
  const nueva = res.headers.get('X-Tertulia-Sesion');
  if (nueva && foroId) await guardarSesion(foroId, nueva);
  return res.text();
}

/**
 * Crea el transporte que usa `ClienteForo`. Con `foroId` envía y guarda la sesión de ese foro.
 * `claveForzada` sirve para probar una clave antes de guardarla.
 */
export function crearTransporte(foroId: string | null, claveForzada?: string): Transporte {
  return (endpoint, cuerpo) =>
    enCola(async () => {
      if (esDemo()) {
        const { responderDemo } = await import('./demo');
        return responderDemo(cuerpo);
      }
      return enviarAlProxy(endpoint, cuerpo, foroId, claveForzada ?? ajustesActuales().clave);
    });
}

/**
 * Comprueba una clave: `/api/ping` (el Worker responde) y una llamada con dirección vacía.
 * El proxy comprueba la clave antes que la dirección, así que 400 `direccion` = clave buena y
 * 401 `clave` = clave mala. No se contacta con ningún foro.
 */
export async function probarClave(clave: string): Promise<void> {
  if (esDemo()) return;
  let ping: Response;
  try {
    ping = await fetch('/api/ping', { cache: 'no-store' });
  } catch {
    throw new ErrorProxy('red');
  }
  if (!ping.ok) throw new ErrorProxy('red', ping.status);
  try {
    await enviarAlProxy('', '<?xml version="1.0"?><methodCall><methodName>get_config</methodName></methodCall>', null, clave);
  } catch (e) {
    if (e instanceof ErrorProxy && e.codigo === 'direccion') return;
    throw e;
  }
}
