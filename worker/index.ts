// Proxy XML-RPC de Tertulia (Cloudflare Pages `_worker.js`). No interpreta el XML.
// Nunca registra cuerpos, cabeceras ni URL.
import { limpiarHost, validarEndpoint } from '../src/api/validar-endpoint';
import { cabeceraCookie, combinarCookies, type Cookies } from './cookies';
import { crearLimite } from './limite';
import { crearToken, leerToken, MAX_TOKEN } from './sesion';

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_KEY?: string;
  SESSION_SECRET?: string;
}

const MAX_PETICION = 1024 * 1024;
const MAX_RESPUESTA = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const limite = crearLimite(60, 60_000);
const enc = new TextEncoder();

const SEGURAS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'",
};

function error(estado: number, cuerpo: Record<string, unknown>, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', ...SEGURAS, ...extra },
  });
}

async function resumen(texto: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
}

/** Compara en tiempo constante; devuelve el identificador (hash) de la clave si coincide. */
async function comprobarClave(presentada: string, esperada: string | undefined): Promise<string | null> {
  if (!esperada) return null;
  const [a, b] = await Promise.all([resumen(presentada), resumen(esperada)]);
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (dif !== 0) return null;
  return Array.from(a.slice(0, 8), (x) => x.toString(16).padStart(2, '0')).join('');
}

function claveDe(request: Request): string {
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '');
  return m?.[1] ?? '';
}

async function leerCuerpo(request: Request): Promise<string | Response> {
  const tipo = (request.headers.get('Content-Type') ?? '').toLowerCase();
  if (!tipo.startsWith('text/xml')) return error(400, { error: 'cuerpo' });
  const declarado = Number(request.headers.get('Content-Length') ?? 0);
  if (declarado > MAX_PETICION) return error(413, { error: 'grande' });
  let buf: Uint8Array<ArrayBuffer> | null;
  try {
    buf = await leerFlujo(request.body, MAX_PETICION);
  } catch {
    return error(400, { error: 'cuerpo' });
  }
  if (!buf) return error(413, { error: 'grande' });
  const texto = new TextDecoder().decode(buf);
  if (!/^\s*(<\?xml[^>]*\?>\s*)?<methodCall[\s>]/.test(texto)) return error(400, { error: 'cuerpo' });
  return texto;
}

/** Lee un flujo por trozos con tope; `null` si lo supera. */
async function leerFlujo(flujo: ReadableStream<Uint8Array> | null, tope: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!flujo) return new Uint8Array();
  const lector = flujo.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > tope) {
      await lector.cancel().catch(() => undefined);
      return null;
    }
    trozos.push(value);
  }
  const salida = new Uint8Array(total);
  let pos = 0;
  for (const t of trozos) {
    salida.set(t, pos);
    pos += t.byteLength;
  }
  return salida;
}

/** Lee el cuerpo del foro con tope; `null` si lo supera. */
async function leerRespuesta(r: Response): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(r.headers.get('Content-Length') ?? 0) > MAX_RESPUESTA) return null;
  return leerFlujo(r.body, MAX_RESPUESTA);
}

async function llamarForo(url: URL, cuerpo: string, cookies: Cookies, signal: AbortSignal): Promise<Response | null> {
  const headers: Record<string, string> = { 'Content-Type': 'text/xml', 'User-Agent': 'Tertulia/1.0' };
  const cookie = cabeceraCookie(cookies);
  if (cookie) headers['Cookie'] = cookie;
  try {
    return await fetch(url.toString(), { method: 'POST', body: cuerpo, headers, redirect: 'manual', signal });
  } catch {
    return null;
  }
}

function respuestaRedireccion(r: Response, url: URL, hostPropio: string): Response {
  const cuerpo: Record<string, unknown> = { error: 'redireccion' };
  try {
    const destino = new URL(r.headers.get('Location') ?? '', url);
    const v = validarEndpoint(destino.toString(), { hostPropio });
    if (v.ok && limpiarHost(v.url.hostname) === limpiarHost(url.hostname)) cuerpo['location'] = v.url.toString();
  } catch {
    // Location inválida: se omite.
  }
  return error(502, cuerpo);
}

async function sesionNueva(env: Env, host: string, previas: Cookies, r: Response): Promise<string | null | 'grande'> {
  const lineas = r.headers.getSetCookie();
  if (lineas.length === 0 || !env.SESSION_SECRET) return null;
  const ahora = Date.now();
  const token = await crearToken(env.SESSION_SECRET, host, combinarCookies(previas, lineas, ahora), ahora);
  return token.length > MAX_TOKEN ? 'grande' : token;
}

async function xmlrpc(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return error(405, { error: 'metodo' }, { Allow: 'POST' });
  const propio = new URL(request.url);
  if (request.headers.get('Origin') !== propio.origin) return error(403, { error: 'origen' });
  const id = await comprobarClave(claveDe(request), env.APP_KEY);
  if (id === null) return error(401, { error: 'clave' });
  const espera = limite.tomar(id, Date.now());
  if (espera > 0) return error(429, { error: 'limite' }, { 'Retry-After': String(espera) });

  const v = validarEndpoint(propio.searchParams.get('u') ?? '', { hostPropio: propio.hostname });
  if (!v.ok) return error(400, { error: 'direccion', codigo: v.codigo });
  const cuerpo = await leerCuerpo(request);
  if (cuerpo instanceof Response) return cuerpo;

  const host = limpiarHost(v.url.hostname);
  const token = request.headers.get('X-Tertulia-Sesion') ?? '';
  const previas = (env.SESSION_SECRET && (await leerToken(env.SESSION_SECRET, host, token, Date.now()))) || {};

  const ctl = new AbortController();
  const temporizador = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await llamarForo(v.url, cuerpo, previas, ctl.signal);
    if (!r) return error(502, { error: 'red' });
    if (r.status >= 300 && r.status < 400) return respuestaRedireccion(r, v.url, propio.hostname);
    let datos: Uint8Array<ArrayBuffer> | null;
    try {
      datos = await leerRespuesta(r);
    } catch {
      return error(502, { error: 'red' });
    }
    if (!datos) return error(502, { error: 'grande' });

    const headers = new Headers({ 'Content-Type': 'text/xml; charset=utf-8', ...SEGURAS });
    const nuevo = await sesionNueva(env, host, previas, r);
    if (nuevo === 'grande') headers.set('X-Tertulia-Sesion-Error', 'grande');
    else if (nuevo) headers.set('X-Tertulia-Sesion', nuevo);
    const sinCuerpo = r.status === 204 || r.status === 205 || r.status === 304;
    return new Response(sinCuerpo ? null : datos, { status: r.status, headers });
  } finally {
    clearTimeout(temporizador);
  }
}

function ping(request: Request, env: Env): Response {
  if (request.method !== 'GET') return error(405, { error: 'metodo' }, { Allow: 'GET' });
  const cuerpo = { ok: true, clave: Boolean(env.APP_KEY), sesion: Boolean(env.SESSION_SECRET) };
  return new Response(JSON.stringify(cuerpo), {
    headers: { 'Content-Type': 'application/json', ...SEGURAS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (pathname === '/api/ping') return ping(request, env);
    if (pathname === '/api/xmlrpc') return xmlrpc(request, env);
    return error(404, { error: 'no-encontrado' });
  },
};
