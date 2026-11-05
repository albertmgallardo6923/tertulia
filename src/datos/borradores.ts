import { borrar, guardar, leer } from './almacen';

export interface Borrador {
  asunto?: string;
  texto: string;
  actualizado: number;
}

/** `destino` es el id del tema (respuesta) o `nuevo-<foroId>` (tema nuevo). */
const clave = (foroId: string, destino: string) => `borrador:${foroId}:${destino}`;

export const leerBorrador = (foroId: string, destino: string) => leer<Borrador>(clave(foroId, destino));

export async function guardarBorrador(foroId: string, destino: string, b: Omit<Borrador, 'actualizado'>) {
  if (!b.texto.trim() && !(b.asunto ?? '').trim()) return borrar(clave(foroId, destino));
  await guardar(clave(foroId, destino), { ...b, actualizado: Date.now() } satisfies Borrador);
}

export const borrarBorrador = (foroId: string, destino: string) => borrar(clave(foroId, destino));
