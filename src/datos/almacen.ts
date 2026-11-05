// Envoltorio de idb-keyval con respaldo en memoria (modo demostración y entornos sin IndexedDB).
import { del as idbDel, get as idbGet, keys as idbKeys, set as idbSet } from 'idb-keyval';

const memoria = new Map<string, unknown>();
let soloMemoria = false;

/** El modo demostración no escribe nada en el dispositivo. */
export function usarSoloMemoria(valor = true): void {
  soloMemoria = valor;
}

export function vaciarMemoria(): void {
  memoria.clear();
}

function usaIdb(): boolean {
  return !soloMemoria && typeof indexedDB !== 'undefined';
}

export async function leer<T>(clave: string): Promise<T | undefined> {
  if (!usaIdb()) return memoria.get(clave) as T | undefined;
  return idbGet<T>(clave);
}

export async function guardar(clave: string, valor: unknown): Promise<void> {
  if (!usaIdb()) {
    memoria.set(clave, valor);
    return;
  }
  await idbSet(clave, valor);
}

export async function borrar(clave: string): Promise<void> {
  if (!usaIdb()) {
    memoria.delete(clave);
    return;
  }
  await idbDel(clave);
}

export async function claves(prefijo = ''): Promise<string[]> {
  const todas = usaIdb() ? (await idbKeys()).map(String) : [...memoria.keys()];
  return todas.filter((k) => k.startsWith(prefijo));
}
