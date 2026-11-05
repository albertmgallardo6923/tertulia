import { describe, expect, it } from 'vitest';
import {
  Base64,
  ErrorXmlRpc,
  base64ATexto,
  parsearFecha,
  parsearRespuesta,
  serializarLlamada,
  textoABase64,
} from '../../src/api/xmlrpc';

const envolver = (v: string) =>
  `<?xml version="1.0"?><methodResponse><params><param><value>${v}</value></param></params></methodResponse>`;

describe('base64 UTF-8', () => {
  it('ida y vuelta con acentos y emojis', () => {
    const t = 'Mecánica - Técnica ñ 🚗';
    expect(base64ATexto(textoABase64(t))).toBe(t);
  });
  it('decodifica Mecánica - Técnica', () => {
    expect(base64ATexto('TWVjw6FuaWNhIC0gVMOpY25pY2E=')).toBe('Mecánica - Técnica');
  });
});

describe('serializar', () => {
  it('login con usuario y clave en base64', () => {
    const xml = serializarLlamada('login', [new Base64('añb'), new Base64('p&<w')]);
    expect(xml).toContain('<methodName>login</methodName>');
    expect(xml).toContain(`<base64>${textoABase64('añb')}</base64>`);
    expect(xml).toContain(`<base64>${textoABase64('p&<w')}</base64>`);
    expect(xml).not.toContain('p&<w');
  });
  it('tipos básicos, array y struct', () => {
    const xml = serializarLlamada('m', ['a&b', 3, 1.5, true, [1, 'x'], { k: false }]);
    expect(xml).toContain('<string>a&amp;b</string>');
    expect(xml).toContain('<int>3</int>');
    expect(xml).toContain('<double>1.5</double>');
    expect(xml).toContain('<boolean>1</boolean>');
    expect(xml).toContain('<array><data><value><int>1</int></value>');
    expect(xml).toContain('<member><name>k</name><value><boolean>0</boolean></value></member>');
  });
  it('es XML bien formado', () => {
    const doc = new DOMParser().parseFromString(serializarLlamada('m', [{ a: [1] }]), 'text/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });
});

describe('parsear', () => {
  it('escalares', () => {
    expect(parsearRespuesta(envolver('<int>7</int>'))).toBe(7);
    expect(parsearRespuesta(envolver('<i4>-2</i4>'))).toBe(-2);
    expect(parsearRespuesta(envolver('<double>2.5</double>'))).toBe(2.5);
    expect(parsearRespuesta(envolver('<boolean>1</boolean>'))).toBe(true);
    expect(parsearRespuesta(envolver('<boolean>0</boolean>'))).toBe(false);
    expect(parsearRespuesta(envolver('<nil/>'))).toBeNull();
    expect(parsearRespuesta(envolver('<string/>'))).toBe('');
    expect(parsearRespuesta(envolver('<base64/>'))).toBe('');
    expect(parsearRespuesta(envolver('sin tipo'))).toBe('sin tipo');
  });
  it('fechas con y sin zona', () => {
    const iso = '2026-11-05T21:26:32.000Z';
    expect(parsearFecha('20261105T21:26:32+00:00').toISOString()).toBe(iso);
    expect(parsearFecha('20261105T21:26:32').toISOString()).toBe(iso);
    expect(parsearFecha('20261105T22:26:32+0100').toISOString()).toBe(iso);
    expect(parsearFecha('20261105T21:26:32Z').toISOString()).toBe(iso);
    const v = parsearRespuesta(envolver('<dateTime.iso8601>20261105T21:26:32+00:00</dateTime.iso8601>'));
    expect(v).toBeInstanceOf(Date);
  });
  it('struct y array anidados', () => {
    const v = parsearRespuesta(
      envolver(
        '<struct><member><name>a</name><value><array><data><value><int>1</int></value><value><base64>w6E=</base64></value></data></array></value></member></struct>',
      ),
    );
    expect(v).toEqual({ a: [1, 'á'] });
  });
  it('fault lanza ErrorXmlRpc', () => {
    const xml =
      '<?xml version="1.0"?><methodResponse><fault><value><struct>' +
      '<member><name>faultCode</name><value><int>4</int></value></member>' +
      '<member><name>faultString</name><value><string>Too many parameters</string></value></member>' +
      '</struct></value></fault></methodResponse>';
    try {
      parsearRespuesta(xml);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorXmlRpc);
      expect((e as ErrorXmlRpc).codigo).toBe(4);
      expect((e as ErrorXmlRpc).message).toBe('Too many parameters');
    }
  });
  it('XML inválido lanza ErrorXmlRpc', () => {
    expect(() => parsearRespuesta('<html>no</html>')).toThrow(ErrorXmlRpc);
  });
});
