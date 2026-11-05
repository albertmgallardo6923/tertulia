// Último mensaje (número absoluto en el tema) que el usuario ya había visto: marca lo nuevo del hilo.
import { guardar, leer } from './almacen';

const clave = (foroId: string, temaId: string) => `visto:${foroId}:${temaId}`;

export async function leerVisto(foroId: string, temaId: string): Promise<number> {
  return (await leer<number>(clave(foroId, temaId))) ?? 0;
}

export async function guardarVisto(foroId: string, temaId: string, numero: number): Promise<void> {
  if (numero > (await leerVisto(foroId, temaId))) await guardar(clave(foroId, temaId), numero);
}
