import { describe, expect, it } from 'vitest';
import { ClienteForo } from '../../src/api/cliente';
import { ErrorXmlRpc, textoABase64 } from '../../src/api/xmlrpc';
import { clienteCon, fixture } from './util';

describe('ClienteForo con fixtures de Club Tesla', () => {
  it('getConfig', async () => {
    const { cliente, enviados } = clienteCon(fixture('get_config'));
    const c = await cliente.getConfig();
    expect(c.version).toBe('sm21');
    expect(c.nivelApi).toBe(3);
    expect(c.abierto).toBe(true);
    expect(c.tipoLogin).toBe('username');
    expect(c.tiposPush).toEqual(['quote', 'tag', 'sub', 'pm', 'newtopic', 'newsub']);
    expect(enviados[0]).toContain('<methodName>get_config</methodName>');
  });

  it('getForos: árbol, prefijo "c", acentos en base64', async () => {
    const { cliente } = clienteCon(fixture('get_forum'));
    const raices = await cliente.getForos();
    expect(raices.length).toBeGreaterThan(0);
    const cat = raices[0]!;
    expect(cat.id).toBe('c1');
    expect(cat.padreId).toBeNull();
    expect(cat.soloCategoria).toBe(true);
    expect(cat.hijos.length).toBeGreaterThan(0);
    expect(cat.hijos[0]!.padreId).toBe('c1');
    const nombres: string[] = [];
    const recorrer = (fs: typeof raices): void => fs.forEach((f) => (nombres.push(f.nombre), recorrer(f.hijos)));
    recorrer(raices);
    expect(nombres.some((n) => /[áéíóú]/.test(n))).toBe(true);
  });

  it('getUltimosTemas: fecha con +00:00 y números', async () => {
    const { cliente, enviados } = clienteCon(fixture('get_latest_topic'));
    const r = await cliente.getUltimosTemas(0, 4);
    expect(r.total).toBe(21);
    const t = r.temas[0]!;
    expect(t.id).toBe('14162');
    expect(t.titulo).toBe('ENTREGAS MODEL 3 / MODEL Y Q4 2026');
    expect(t.respuestas).toBe(5482);
    expect(t.vistas).toBe(164007);
    // post_time dice 21:26:32+00:00 pero el timestamp real es 22:26:32 UTC
    expect(t.fecha?.getTime()).toBe(1793910392 * 1000);
    expect(t.resumen).toContain('muchísimas gracias');
    expect(enviados[0]).toContain('<methodName>get_latest_topic</methodName>');
  });

  it('getHilo: mensajes y contenido mezclado', async () => {
    const { cliente, enviados } = clienteCon(fixture('get_thread'));
    const h = await cliente.getHilo('14162', 0, 2);
    expect(h.totalMensajes).toBe(5483);
    expect(h.tema.fijo).toBe(true);
    expect(h.mensajes.length).toBeGreaterThan(0);
    const m = h.mensajes[0]!;
    expect(m.id).not.toBe('');
    expect(m.fecha).toBeInstanceOf(Date);
    expect(h.mensajes.some((x) => /\[img\]|\[quote|<br/.test(x.contenido))).toBe(true);
    expect(enviados[0]).toContain('<string>14162</string>');
    expect(enviados[0]).toContain('<boolean>1</boolean>');
  });

  it('login serializa en base64 y tipa el resultado', async () => {
    const respuesta =
      '<?xml version="1.0"?><methodResponse><params><param><value><struct>' +
      '<member><name>result</name><value><boolean>1</boolean></value></member>' +
      `<member><name>result_text</name><value><base64>${textoABase64('Bienvenido')}</base64></value></member>` +
      '<member><name>user_id</name><value><string>42</string></value></member>' +
      `<member><name>username</name><value><base64>${textoABase64('Ñandú')}</base64></value></member>` +
      '</struct></value></param></params></methodResponse>';
    const { cliente, enviados } = clienteCon(respuesta);
    const r = await cliente.login('Ñandú', 'secreto');
    expect(r).toEqual({ exito: true, mensaje: 'Bienvenido', usuarioId: '42', usuario: 'Ñandú' });
    expect(enviados[0]).toContain(`<base64>${textoABase64('Ñandú')}</base64>`);
    expect(enviados[0]).toContain(`<base64>${textoABase64('secreto')}</base64>`);
    expect(enviados[0]).not.toContain('secreto<');
  });

  it('fault se propaga como ErrorXmlRpc', async () => {
    const f =
      '<?xml version="1.0"?><methodResponse><fault><value><struct>' +
      '<member><name>faultCode</name><value><int>1</int></value></member>' +
      '<member><name>faultString</name><value><string>x</string></value></member>' +
      '</struct></value></fault></methodResponse>';
    const { cliente } = clienteCon(f);
    await expect(cliente.getConfig()).rejects.toBeInstanceOf(ErrorXmlRpc);
  });

  it('métodos sin fixture envían el método XML-RPC correcto', async () => {
    const vacio =
      '<?xml version="1.0"?><methodResponse><params><param><value><struct>' +
      '<member><name>result</name><value><boolean>1</boolean></value></member>' +
      '<member><name>post_id</name><value><string>9</string></value></member>' +
      '</struct></value></param></params></methodResponse>';
    const { cliente, enviados } = clienteCon(vacio);
    const r = await cliente.responder('3', '14162', 'Re', 'hola');
    expect(r).toMatchObject({ exito: true, id: '9' });
    await cliente.nuevoTema('3', 'T', 'x');
    await cliente.marcarLeido('14162');
    await cliente.marcarLeido();
    await cliente.getNoLeidos(0, 19);
    await cliente.getSuscritos(0, 19);
    await cliente.getTemas('3', 0, 19, 'TOP');
    const metodos = enviados.map((x) => /<methodName>(\w+)</.exec(x)?.[1]);
    expect(metodos).toEqual([
      'reply_post', 'new_topic', 'mark_topic_read', 'mark_all_as_read',
      'get_unread_topic', 'get_subscribed_topic', 'get_topic',
    ]);
    expect(enviados[6]).toContain('<string>TOP</string>');
    expect(cliente).toBeInstanceOf(ClienteForo);
  });
});

describe('fechas', () => {
  it('sin timestamp usa post_time', async () => {
    const xml =
      '<?xml version="1.0"?><methodResponse><params><param><value><struct>' +
      '<member><name>topics</name><value><array><data><value><struct>' +
      '<member><name>topic_id</name><value><string>1</string></value></member>' +
      '<member><name>post_time</name><value><dateTime.iso8601>20261105T21:26:32+00:00</dateTime.iso8601></value></member>' +
      '</struct></value></data></array></value></member></struct></value></param></params></methodResponse>';
    const r = await clienteCon(xml).cliente.getUltimosTemas(0, 1);
    expect(r.temas[0]?.fecha?.toISOString()).toBe('2026-11-05T21:26:32.000Z');
  });
});
