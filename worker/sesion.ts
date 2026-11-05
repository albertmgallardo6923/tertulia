// Token de sesión opaco: AES-GCM con clave HKDF derivada de SESSION_SECRET, host como AAD.
import type { Cookies } from './cookies';

export const CADUCIDAD_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TOKEN = 16 * 1024;
const enc = new TextEncoder();
const dec = new TextDecoder();

interface Carga {
  host: string;
  cookies: Cookies;
  creado: number;
}

let claveCache: { secreto: string; clave: Promise<CryptoKey> } | null = null;

async function derivar(secreto: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secreto), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('tertulia-sesion'), info: enc.encode('aes-gcm-v1') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Deriva la clave una sola vez por isolate (y por secreto). */
function obtenerClave(secreto: string): Promise<CryptoKey> {
  if (!claveCache || claveCache.secreto !== secreto) claveCache = { secreto, clave: derivar(secreto) };
  return claveCache.clave;
}

function aBase64Url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(t: string): Uint8Array {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function crearToken(secreto: string, host: string, cookies: Cookies, ahora: number): Promise<string> {
  const clave = await obtenerClave(secreto);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const carga: Carga = { host, cookies, creado: ahora };
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(host) },
    clave,
    enc.encode(JSON.stringify(carga)),
  );
  const salida = new Uint8Array(12 + cifrado.byteLength);
  salida.set(iv);
  salida.set(new Uint8Array(cifrado), 12);
  return aBase64Url(salida);
}

function esCarga(x: unknown): x is Carga {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  const c = o['cookies'];
  return (
    typeof o['host'] === 'string' &&
    typeof o['creado'] === 'number' &&
    typeof c === 'object' &&
    c !== null &&
    Object.values(c).every((v) => typeof v === 'string')
  );
}

/** Devuelve las cookies del token, o `null` si es corrupto, caducado o de otro host. */
export async function leerToken(secreto: string, host: string, token: string, ahora: number): Promise<Cookies | null> {
  if (!token || token.length > MAX_TOKEN || !/^[\w-]+$/.test(token)) return null;
  try {
    const bytes = deBase64Url(token);
    if (bytes.length < 29) return null;
    const claro = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: enc.encode(host) },
      await obtenerClave(secreto),
      bytes.slice(12),
    );
    const carga: unknown = JSON.parse(dec.decode(claro));
    if (!esCarga(carga) || carga.host !== host) return null;
    if (ahora - carga.creado > CADUCIDAD_MS || carga.creado > ahora + 60_000) return null;
    return carga.cookies;
  } catch {
    return null;
  }
}
