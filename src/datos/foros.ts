import type { Config } from '../api/tipos';
import { borrar, guardar, leer } from './almacen';

export interface ForoGuardado {
  id: string; // host (+ ruta si no está en la raíz), p. ej. "foro.clubtesla.es"
  nombre: string;
  host: string;
  endpoint: string;
  config: Config;
  usuario?: string; // presente si hay sesión iniciada
}

export async function listarForos(): Promise<ForoGuardado[]> {
  return (await leer<ForoGuardado[]>('foros')) ?? [];
}

export async function leerForo(id: string): Promise<ForoGuardado | undefined> {
  return (await listarForos()).find((f) => f.id === id);
}

export async function guardarForo(foro: ForoGuardado): Promise<void> {
  const resto = (await listarForos()).filter((f) => f.id !== foro.id);
  await guardar('foros', [...resto, foro]);
}

export async function quitarForo(id: string): Promise<void> {
  await guardar('foros', (await listarForos()).filter((f) => f.id !== id));
  await borrar(`sesion:${id}`);
  await borrar(`arbol:${id}`);
}

/** Id estable a partir del endpoint: host + ruta anterior a /mobiquo/mobiquo.php. */
export function idDeEndpoint(endpoint: string): string {
  const u = new URL(endpoint);
  const ruta = u.pathname.replace(/\/mobiquo\/mobiquo\.php$/i, '');
  return `${u.hostname}${ruta}`;
}
