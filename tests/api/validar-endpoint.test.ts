import { describe, expect, it } from 'vitest';
import { validarEndpoint } from '../../src/api/validar-endpoint';
import { ErrorDireccion, endpointsCandidatos } from '../../src/api/descubrir';
import { ErrorXmlRpc, base64ATexto, parsearRespuesta, serializarLlamada } from '../../src/api/xmlrpc';
import es from '../../src/i18n/es.json';

const M = '/mobiquo/mobiquo.php';
const codigo = (u: string, opc = {}) => {
  const r = validarEndpoint(u, opc);
  return r.ok ? 'ok' : r.codigo;
};

describe('validarEndpoint', () => {
  it('acepta un endpoint correcto (y 443 explícito)', () => {
    expect(codigo(`https://foro.clubtesla.es${M}`)).toBe('ok');
    expect(codigo(`https://x.com:443/foro${M}`)).toBe('ok');
  });
  it.each([
    [`http://x.com${M}`, 'esquema'],
    [`ftp://x.com${M}`, 'esquema'],
    ['', 'vacio'],
    [`https://localhost${M}`, 'host-interno'],
    [`https://localhost.${M}`, 'host-interno'],
    [`https://x.local.${M}`, 'host-interno'],
    [`https://a.home.arpa${M}`, 'host-interno'],
    [`https://a.onion${M}`, 'host-interno'],
    [`https://intranet${M}`, 'host-interno'],
    [`https://1.2.3.4${M}`, 'ip'],
    [`https://[::1]${M}`, 'ip'],
    [`https://2130706433${M}`, 'ip'],
    [`https://0x7f.1${M}`, 'ip'],
    [`https://x.com:8443${M}`, 'puerto'],
    [`https://x.com${M}?a=1`, 'consulta'],
    [`https://x.com${M}#f`, 'consulta'],
    [`https://user:clave@x.com${M}`, 'credenciales'],
    ['https://x.com/otra/ruta.php', 'ruta'],
    ['https://x.com/', 'ruta'],
  ])('rechaza %j como %s', (u, c) => {
    expect(codigo(u)).toBe(c);
  });
  it('rechaza el dominio propio y sus subdominios', () => {
    const o = { hostPropio: 'tertulia.pages.dev' };
    expect(codigo(`https://tertulia.pages.dev${M}`, o)).toBe('host-propio');
    expect(codigo(`https://abc.tertulia.pages.dev.${M}`, o)).toBe('host-propio');
    expect(codigo(`https://otro.pages.dev${M}`, o)).toBe('ok');
  });
});

describe('descubrir con códigos de error', () => {
  const falla = (e: string, opc = {}) => {
    try {
      endpointsCandidatos(e, opc);
    } catch (x) {
      return x instanceof ErrorDireccion ? x.codigo : 'otro';
    }
    return 'ok';
  };
  it.each([
    ['http://x.com', 'esquema'],
    ['localhost.', 'host-interno'],
    ['x.local.', 'host-interno'],
    ['https://1.2.3.4/foro', 'ip'],
    ['https://[::1]/foro', 'ip'],
    ['https://2130706433/', 'ip'],
    ['x.com:8443', 'puerto'],
    ['https://x.com/foro?a=1', 'consulta'],
    ['https://usuario:clave@x.com', 'credenciales'],
    ['  ', 'vacio'],
  ])('%j -> %s', (e, c) => expect(falla(e, {})).toBe(c));
  it('host propio', () => {
    expect(falla('tertulia.pages.dev', { hostPropio: 'tertulia.pages.dev' })).toBe('host-propio');
  });
  it('quita el punto final del host válido', () => {
    expect(endpointsCandidatos('foro.clubtesla.es.')[0]).toBe(`https://foro.clubtesla.es${M}`);
  });
  it('todos los códigos tienen texto en es.json', () => {
    const cods = ['vacio','esquema','ip','host-interno','puerto','ruta','credenciales','consulta','host-propio'];
    for (const c of cods) {
      expect((es.errores.direccion as Record<string, string>)[c]).toBeTruthy();
    }
  });
});

describe('xmlrpc endurecido', () => {
  const envolver = (v: string) =>
    `<?xml version="1.0"?><methodResponse><params><param><value>${v}</value></param></params></methodResponse>`;
  it('base64 inválido -> ErrorXmlRpc', () => {
    expect(() => base64ATexto('@@@no')).toThrow(ErrorXmlRpc);
    expect(() => parsearRespuesta(envolver('<base64>@@@</base64>'))).toThrow(ErrorXmlRpc);
  });
  it('int y double no numéricos -> ErrorXmlRpc', () => {
    expect(() => parsearRespuesta(envolver('<int>abc</int>'))).toThrow(ErrorXmlRpc);
    expect(() => parsearRespuesta(envolver('<int>12x</int>'))).toThrow(ErrorXmlRpc);
    expect(() => parsearRespuesta(envolver('<double>x</double>'))).toThrow(ErrorXmlRpc);
  });
  it('struct ignora __proto__, constructor y prototype', () => {
    const m = (n: string) => `<member><name>${n}</name><value><string>mal</string></value></member>`;
    const v = parsearRespuesta(
      envolver(`<struct>${m('__proto__')}${m('constructor')}${m('prototype')}${m('ok')}</struct>`),
    ) as Record<string, unknown>;
    expect(Object.getPrototypeOf(v)).toBeNull();
    expect(Object.keys(v)).toEqual(['ok']);
    expect(({} as Record<string, unknown>)['mal']).toBeUndefined();
  });
  it('serializar elimina caracteres de control inválidos', () => {
    const xml = serializarLlamada('m', ['a\u0000b\u0008c\u001Fd\te\n']);
    expect(xml).toContain('<string>abcd\te\n</string>');
    expect(new DOMParser().parseFromString(xml, 'text/xml').querySelector('parsererror')).toBeNull();
  });
});
