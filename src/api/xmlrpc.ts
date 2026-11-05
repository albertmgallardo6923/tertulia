// Serialización y parseo de XML-RPC (con las rarezas de Tapatalk).

/** Texto que viaja en base64 (UTF-8). */
export class Base64 {
  constructor(readonly texto: string) {}
}

/** Valor que se puede enviar en una llamada. */
export type ValorEnvio =
  | string
  | number
  | boolean
  | Base64
  | ValorEnvio[]
  | { [clave: string]: ValorEnvio };

/** Valor recibido en una respuesta (base64 ya decodificado a string). */
export type Valor = null | string | number | boolean | Date | Valor[] | Estructura;
export interface Estructura {
  [clave: string]: Valor;
}

export class ErrorXmlRpc extends Error {
  constructor(
    readonly codigo: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorXmlRpc';
  }
}

// ---------- base64 UTF-8 ----------

export function textoABase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64ATexto(b64: string): string {
  const limpio = b64.replace(/\s+/g, '');
  if (!limpio) return '';
  const bin = atob(limpio);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

// ---------- serialización ----------

function escaparXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializarValor(v: ValorEnvio): string {
  if (v instanceof Base64) return `<value><base64>${textoABase64(v.texto)}</base64></value>`;
  if (typeof v === 'string') return `<value><string>${escaparXml(v)}</string></value>`;
  if (typeof v === 'boolean') return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? `<value><int>${v}</int></value>`
      : `<value><double>${v}</double></value>`;
  }
  if (Array.isArray(v)) {
    return `<value><array><data>${v.map(serializarValor).join('')}</data></array></value>`;
  }
  const miembros = Object.entries(v)
    .map(([k, x]) => `<member><name>${escaparXml(k)}</name>${serializarValor(x)}</member>`)
    .join('');
  return `<value><struct>${miembros}</struct></value>`;
}

export function serializarLlamada(metodo: string, params: ValorEnvio[] = []): string {
  const ps = params.map((p) => `<param>${serializarValor(p)}</param>`).join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?><methodCall>` +
    `<methodName>${escaparXml(metodo)}</methodName><params>${ps}</params></methodCall>`
  );
}

// ---------- parseo ----------

const RE_FECHA =
  /^(\d{4})-?(\d{2})-?(\d{2})T(\d{2}):?(\d{2}):?(\d{2})(?:\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

function normalizarZona(zona: string): string {
  const dig = zona.slice(1).replace(':', '');
  return `${zona[0]}${dig.slice(0, 2)}:${dig.slice(2, 4) || '00'}`;
}

/** Acepta con y sin zona (sin zona se interpreta como UTC). */
export function parsearFecha(texto: string): Date {
  const m = RE_FECHA.exec(texto.trim());
  if (!m) return new Date(NaN);
  const [, a, mes, d, h, mi, s, zona = 'Z'] = m;
  const z = zona === 'Z' ? 'Z' : normalizarZona(zona);
  return new Date(`${a}-${mes}-${d}T${h}:${mi}:${s}${z}`);
}

function hijosElemento(el: Element): Element[] {
  return Array.from(el.children);
}

function parsearValor(el: Element): Valor {
  const tipo = hijosElemento(el)[0];
  if (!tipo) return el.textContent ?? ''; // <value>texto</value> es string
  const texto = tipo.textContent ?? '';
  switch (tipo.tagName) {
    case 'string':
      return texto;
    case 'int':
    case 'i4':
    case 'i8':
      return parseInt(texto, 10);
    case 'double':
      return parseFloat(texto);
    case 'boolean':
      return texto.trim() === '1' || texto.trim().toLowerCase() === 'true';
    case 'base64':
      return base64ATexto(texto);
    case 'dateTime.iso8601':
      return parsearFecha(texto);
    case 'nil':
      return null;
    case 'array':
      return hijosElemento(tipo)
        .filter((e) => e.tagName === 'data')
        .flatMap((d) => hijosElemento(d).filter((e) => e.tagName === 'value').map(parsearValor));
    case 'struct':
      return parsearEstructura(tipo);
    default:
      return texto;
  }
}

function parsearEstructura(el: Element): Estructura {
  const salida: Estructura = {};
  for (const miembro of hijosElemento(el).filter((e) => e.tagName === 'member')) {
    const nombre = hijosElemento(miembro).find((e) => e.tagName === 'name')?.textContent ?? '';
    const valor = hijosElemento(miembro).find((e) => e.tagName === 'value');
    if (nombre && valor) salida[nombre] = parsearValor(valor);
  }
  return salida;
}

/** Parsea una respuesta; lanza ErrorXmlRpc si es un fault o el XML no es válido. */
export function parsearRespuesta(xml: string): Valor {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const raiz = doc.documentElement;
  if (!raiz || raiz.tagName !== 'methodResponse' || doc.querySelector('parsererror')) {
    throw new ErrorXmlRpc(-1, 'Respuesta XML-RPC no válida');
  }
  const fault = hijosElemento(raiz).find((e) => e.tagName === 'fault');
  if (fault) {
    const v = hijosElemento(fault).find((e) => e.tagName === 'value');
    const f = v ? parsearValor(v) : null;
    const est = f !== null && typeof f === 'object' && !Array.isArray(f) && !(f instanceof Date) ? f : {};
    const codigo = typeof est['faultCode'] === 'number' ? est['faultCode'] : -1;
    const msg = typeof est['faultString'] === 'string' ? est['faultString'] : 'Fallo XML-RPC';
    throw new ErrorXmlRpc(codigo, msg);
  }
  const valor = doc.querySelector('methodResponse > params > param > value');
  if (!valor) throw new ErrorXmlRpc(-1, 'Respuesta XML-RPC sin valor');
  return parsearValor(valor);
}
