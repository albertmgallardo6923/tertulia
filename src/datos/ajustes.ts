import { guardar, leer } from './almacen';

export type ModoImagenes = 'siempre' | 'tocar';
export type TamanoLetra = 'pequena' | 'normal' | 'grande' | 'enorme';

export interface Ajustes {
  clave: string; // clave de acceso de la app (se envía al proxy)
  imagenes: ModoImagenes;
  letra: TamanoLetra;
  persistenciaPedida: boolean;
}

export const AJUSTES_INICIALES: Ajustes = {
  clave: '',
  imagenes: 'siempre',
  letra: 'normal',
  persistenciaPedida: false,
};

let actuales: Ajustes = { ...AJUSTES_INICIALES };
const oyentes = new Set<(a: Ajustes) => void>();

export function ajustesActuales(): Ajustes {
  return actuales;
}

export async function cargarAjustes(): Promise<Ajustes> {
  const g = await leer<Partial<Ajustes>>('ajustes');
  actuales = { ...AJUSTES_INICIALES, ...(g ?? {}) };
  oyentes.forEach((f) => f(actuales));
  return actuales;
}

export async function guardarAjustes(parcial: Partial<Ajustes>): Promise<Ajustes> {
  actuales = { ...actuales, ...parcial };
  await guardar('ajustes', actuales);
  oyentes.forEach((f) => f(actuales));
  return actuales;
}

export function suscribirAjustes(f: (a: Ajustes) => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}
