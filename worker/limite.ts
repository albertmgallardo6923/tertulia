// Cubo de fichas en memoria (por isolate). Orientativo: el control real es la clave.

export interface Limite {
  /** Devuelve 0 si se permite, o los segundos que faltan para la próxima ficha. */
  tomar(id: string, ahora: number): number;
}

interface Cubo {
  fichas: number;
  t: number;
}

export function crearLimite(maximo: number, ventanaMs: number): Limite {
  const cubos = new Map<string, Cubo>();
  const ritmo = maximo / ventanaMs;
  return {
    tomar(id, ahora) {
      const c = cubos.get(id) ?? { fichas: maximo, t: ahora };
      c.fichas = Math.min(maximo, c.fichas + Math.max(0, ahora - c.t) * ritmo);
      c.t = ahora;
      cubos.set(id, c);
      if (c.fichas >= 1) {
        c.fichas -= 1;
        return 0;
      }
      return Math.ceil((1 - c.fichas) / ritmo / 1000);
    },
  };
}
