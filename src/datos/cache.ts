// Caché de hilos con LRU de 50 temas. Clave de página: hilo:<foroId>:<temaId>:<pagina>.
import type { Hilo } from '../api/tipos';
import { borrar, claves, guardar, leer } from './almacen';

export const MAX_TEMAS = 50;
const INDICE = 'hilo-indice';

export interface HiloEnCache {
  hilo: Hilo;
  guardado: number;
}

const clavePagina = (f: string, t: string, p: number) => `hilo:${f}:${t}:${p}`;

export async function leerHilo(foroId: string, temaId: string, pagina: number): Promise<HiloEnCache | undefined> {
  return leer<HiloEnCache>(clavePagina(foroId, temaId, pagina));
}

export async function guardarHilo(foroId: string, temaId: string, pagina: number, hilo: Hilo): Promise<void> {
  await guardar(clavePagina(foroId, temaId, pagina), { hilo, guardado: Date.now() } satisfies HiloEnCache);
  const id = `${foroId}:${temaId}`;
  const indice = ((await leer<string[]>(INDICE)) ?? []).filter((x) => x !== id);
  indice.push(id); // el más reciente al final
  while (indice.length > MAX_TEMAS) {
    const viejo = indice.shift()!;
    for (const k of await claves(`hilo:${viejo}:`)) await borrar(k);
  }
  await guardar(INDICE, indice);
}
