// Añadir un foro: prueba los endpoints candidatos con get_config, en orden y sin prisa.
import { ClienteForo } from '../api/cliente';
import { endpointsCandidatos } from '../api/descubrir';
import type { Config } from '../api/tipos';
import { validarEndpoint } from '../api/validar-endpoint';
import { crearTransporte, ErrorProxy, esDemo } from '../transporte';

export class ErrorNoCompatible extends Error {
  constructor() {
    super('no-compatible');
    this.name = 'ErrorNoCompatible';
  }
}

export class ErrorForoCerrado extends Error {
  constructor() {
    super('foro-cerrado');
    this.name = 'ErrorForoCerrado';
  }
}

export interface ForoDescubierto {
  endpoint: string;
  config: Config;
}

/** Errores del proxy que no mejoran probando otro candidato. */
const FATALES = new Set(['clave', 'origen', 'limite', 'metodo', 'cuerpo', 'direccion', 'grande']);

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function descubrirForo(entrada: string, pausaMs = esDemo() ? 0 : 1000): Promise<ForoDescubierto> {
  const hostPropio = typeof location !== 'undefined' ? location.hostname : undefined;
  const pendientes = endpointsCandidatos(entrada, { hostPropio });
  const hostBase = new URL(pendientes[0]!).hostname;
  const probados = new Set<string>();
  let primero = true;

  while (pendientes.length > 0) {
    const endpoint = pendientes.shift()!;
    if (probados.has(endpoint)) continue;
    probados.add(endpoint);
    if (!primero) await pausa(pausaMs);
    primero = false;
    try {
      const cliente = new ClienteForo({ endpoint, transporte: crearTransporte(null) });
      const config = await cliente.getConfig();
      if (!config.version) continue;
      if (!config.abierto) throw new ErrorForoCerrado();
      return { endpoint, config };
    } catch (e) {
      if (e instanceof ErrorForoCerrado) throw e;
      if (e instanceof ErrorProxy) {
        if (FATALES.has(e.codigo)) throw e;
        const destino = e.codigo === 'redireccion' ? e.detalle?.location : undefined;
        if (destino) {
          const v = validarEndpoint(destino, { hostPropio });
          if (v.ok && v.url.hostname === hostBase) pendientes.unshift(v.url.href);
        }
      }
      // Cualquier otro fallo (respuesta no XML-RPC, fallo de red del foro...): siguiente candidato.
    }
  }
  throw new ErrorNoCompatible();
}
