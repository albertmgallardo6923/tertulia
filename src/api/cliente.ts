// Cliente tipado de la API XML-RPC de Tapatalk.
import {
  Base64,
  ErrorXmlRpc,
  parsearRespuesta,
  serializarLlamada,
  type Estructura,
  type Valor,
  type ValorEnvio,
} from './xmlrpc';
import type {
  Config,
  Foro,
  Hilo,
  Mensaje,
  ResultadoAccion,
  ResultadoLogin,
  ResultadoTemas,
  Tema,
} from './tipos';

export interface OpcionesCliente {
  endpoint: string;
  transporte: (endpoint: string, cuerpoXml: string) => Promise<string>;
}

// ---------- lectores de campos ----------

function esEstructura(v: Valor | undefined): v is Estructura {
  return v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

function aEstructura(v: Valor): Estructura {
  if (!esEstructura(v)) throw new ErrorXmlRpc(-1, 'Se esperaba una estructura');
  return v;
}

function texto(o: Estructura, k: string): string {
  const v = o[k];
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'object' ? '' : String(v);
}

function numero(o: Estructura, k: string): number {
  const n = Number(texto(o, k));
  return Number.isFinite(n) ? n : 0;
}

function bool(o: Estructura, k: string): boolean {
  const v = o[k];
  if (typeof v === 'boolean') return v;
  return texto(o, k) === '1' || texto(o, k) === 'true';
}

function lista(o: Estructura, k: string): Estructura[] {
  const v = o[k];
  return Array.isArray(v) ? v.filter(esEstructura) : [];
}

/**
 * Prefiere `timestamp` (segundos, como texto): en Club Tesla `post_time` dice +00:00
 * pero es hora local (1 h de diferencia). Si falta, usa `post_time`.
 */
function fecha(o: Estructura): Date | null {
  const ts = numero(o, 'timestamp');
  if (ts > 0) return new Date(ts * 1000);
  const v = o['post_time'];
  return v instanceof Date && !isNaN(v.getTime()) ? v : null;
}

// ---------- conversores a dominio ----------

export function aConfig(o: Estructura): Config {
  const bruto: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== null && typeof v !== 'object') bruto[k] = texto(o, k);
  }
  return {
    version: texto(o, 'version'),
    nivelApi: numero(o, 'api_level'),
    abierto: bool(o, 'is_open'),
    invitadoPermitido: bool(o, 'guest_okay'),
    tipoLogin: texto(o, 'login_type'),
    soportaUltimos: bool(o, 'get_latest_topic'),
    tiposPush: texto(o, 'push_type').split(',').filter(Boolean),
    usuarioId: texto(o, 'user_id'),
    bruto,
  };
}

export function aForo(o: Estructura): Foro {
  const padre = texto(o, 'parent_id');
  return {
    id: texto(o, 'forum_id'),
    nombre: texto(o, 'forum_name'),
    padreId: padre === '' || padre === '-1' ? null : padre,
    soloCategoria: bool(o, 'sub_only'),
    puedePublicar: bool(o, 'can_post'),
    puedeSuscribir: bool(o, 'can_subscribe'),
    suscrito: bool(o, 'is_subscribed'),
    hayNuevos: bool(o, 'new_post'),
    url: texto(o, 'url'),
    hijos: lista(o, 'child').map(aForo),
  };
}

export function aTema(o: Estructura): Tema {
  return {
    id: texto(o, 'topic_id'),
    foroId: texto(o, 'forum_id'),
    foroNombre: texto(o, 'forum_name'),
    titulo: texto(o, 'topic_title'),
    resumen: texto(o, 'short_content'),
    respuestas: numero(o, 'reply_number'),
    vistas: numero(o, 'view_number'),
    autorId: texto(o, 'post_author_id'),
    autor: texto(o, 'post_author_name'),
    fecha: fecha(o),
    hayNuevos: bool(o, 'new_post'),
    cerrado: bool(o, 'is_closed'),
    fijo: bool(o, 'is_sticky'),
    suscrito: bool(o, 'is_subscribed'),
  };
}

export function aMensaje(o: Estructura): Mensaje {
  return {
    id: texto(o, 'post_id'),
    titulo: texto(o, 'post_title'),
    contenido: texto(o, 'post_content'),
    autorId: texto(o, 'post_author_id'),
    autor: texto(o, 'post_author_name'),
    fecha: fecha(o),
    puedeEditar: bool(o, 'can_edit'),
  };
}

export function aResultadoTemas(o: Estructura): ResultadoTemas {
  return {
    total: numero(o, 'total_topic_num'),
    temas: lista(o, 'topics').map(aTema),
  };
}

export function aHilo(o: Estructura): Hilo {
  return {
    tema: {
      id: texto(o, 'topic_id'),
      foroId: texto(o, 'forum_id'),
      foroNombre: texto(o, 'forum_name'),
      titulo: texto(o, 'topic_title'),
      autorId: texto(o, 'topic_author_id'),
      autor: texto(o, 'topic_author_name'),
      vistas: numero(o, 'view_number'),
      fecha: null,
      cerrado: bool(o, 'is_closed'),
      fijo: bool(o, 'is_sticky'),
      suscrito: bool(o, 'is_subscribed'),
    },
    totalMensajes: numero(o, 'total_post_num'),
    puedeResponder: bool(o, 'can_reply'),
    mensajes: lista(o, 'posts').map(aMensaje),
  };
}

function aAccion(o: Estructura, claveId: string): ResultadoAccion {
  return { exito: bool(o, 'result'), mensaje: texto(o, 'result_text'), id: texto(o, claveId) };
}

// ---------- cliente ----------

export class ClienteForo {
  constructor(private readonly opc: OpcionesCliente) {}

  private async llamar(metodo: string, params: ValorEnvio[] = []): Promise<Valor> {
    const xml = await this.opc.transporte(this.opc.endpoint, serializarLlamada(metodo, params));
    return parsearRespuesta(xml);
  }

  private async llamarEstructura(metodo: string, params: ValorEnvio[] = []): Promise<Estructura> {
    return aEstructura(await this.llamar(metodo, params));
  }

  async getConfig(): Promise<Config> {
    return aConfig(await this.llamarEstructura('get_config'));
  }

  /** Árbol de foros. Devuelve las raíces (categorías), con `hijos` anidados. */
  async getForos(): Promise<Foro[]> {
    const r = await this.llamar('get_forum', [false]);
    return Array.isArray(r) ? r.filter(esEstructura).map(aForo) : [];
  }

  async getUltimosTemas(desde: number, hasta: number): Promise<ResultadoTemas> {
    return aResultadoTemas(await this.llamarEstructura('get_latest_topic', [desde, hasta]));
  }

  /** modo: '' normal, 'TOP' fijados, 'ANN' anuncios. */
  async getTemas(foroId: string, desde: number, hasta: number, modo = ''): Promise<ResultadoTemas> {
    return aResultadoTemas(await this.llamarEstructura('get_topic', [foroId, desde, hasta, modo]));
  }

  async getHilo(temaId: string, desde: number, hasta: number): Promise<Hilo> {
    return aHilo(await this.llamarEstructura('get_thread', [temaId, desde, hasta, true]));
  }

  async login(usuario: string, clave: string): Promise<ResultadoLogin> {
    const o = await this.llamarEstructura('login', [new Base64(usuario), new Base64(clave)]);
    return {
      exito: bool(o, 'result'),
      mensaje: texto(o, 'result_text'),
      usuarioId: texto(o, 'user_id'),
      usuario: texto(o, 'username') || texto(o, 'login_name'),
    };
  }

  async getNoLeidos(desde: number, hasta: number): Promise<ResultadoTemas> {
    return aResultadoTemas(await this.llamarEstructura('get_unread_topic', [desde, hasta]));
  }

  async responder(foroId: string, temaId: string, asunto: string, textoMsg: string): Promise<ResultadoAccion> {
    const o = await this.llamarEstructura('reply_post', [
      foroId,
      temaId,
      new Base64(asunto),
      new Base64(textoMsg),
    ]);
    return aAccion(o, 'post_id');
  }

  async nuevoTema(foroId: string, asunto: string, textoMsg: string): Promise<ResultadoAccion> {
    const o = await this.llamarEstructura('new_topic', [foroId, new Base64(asunto), new Base64(textoMsg)]);
    return aAccion(o, 'topic_id');
  }

  /** Con temaId marca ese tema; sin él, todo el foro como leído. */
  async marcarLeido(temaId?: string): Promise<ResultadoAccion> {
    const o =
      temaId === undefined
        ? await this.llamarEstructura('mark_all_as_read')
        : await this.llamarEstructura('mark_topic_read', [[temaId]]);
    return aAccion(o, 'topic_id');
  }

  async getSuscritos(desde: number, hasta: number): Promise<ResultadoTemas> {
    return aResultadoTemas(await this.llamarEstructura('get_subscribed_topic', [desde, hasta]));
  }
}
