import { ClienteForo } from '../api/cliente';
import { crearTransporte } from '../transporte';
import type { ForoGuardado } from './foros';

/** Cliente de un foro guardado: usa su sesión (si la hay) a través del proxy. */
export function clienteDe(foro: Pick<ForoGuardado, 'id' | 'endpoint'>): ClienteForo {
  return new ClienteForo({ endpoint: foro.endpoint, transporte: crearTransporte(foro.id) });
}
