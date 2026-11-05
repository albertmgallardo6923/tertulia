import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClienteForo } from '../src/api/cliente';
import { guardarAjustes, cargarAjustes } from '../src/datos/ajustes';
import { usarSoloMemoria, vaciarMemoria } from '../src/datos/almacen';
import { leerSesion, guardarSesion } from '../src/datos/sesiones';
import { configurarRitmo, crearTransporte, ErrorProxy, probarClave } from '../src/transporte';
import { fixture } from './api/util';

const ENDPOINT = 'https://foro.ejemplo.es/mobiquo/mobiquo.php';
const XML = '<?xml version="1.0"?><methodCall><methodName>get_config</methodName></methodCall>';

function respuesta(cuerpo: string, estado = 200, cabeceras: Record<string, string> = {}): Response {
  return new Response(cuerpo, { status: estado, headers: cabeceras });
}

const fetchFalso = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

beforeEach(async () => {
  usarSoloMemoria(true);
  vaciarMemoria();
  await cargarAjustes();
  await guardarAjustes({ clave: 'clave-de-prueba' });
  configurarRitmo(0);
  fetchFalso.mockReset();
  vi.stubGlobal('fetch', fetchFalso);
  (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('http://localhost/');
});

afterEach(() => vi.unstubAllGlobals());

describe('transporte', () => {
  it('envía POST al proxy con clave, tipo y dirección codificada', async () => {
    fetchFalso.mockResolvedValue(respuesta('<ok/>'));
    const r = await crearTransporte('foro.ejemplo.es')(ENDPOINT, XML);
    expect(r).toBe('<ok/>');
    const [url, init] = fetchFalso.mock.calls[0]!;
    expect(url).toBe(`/api/xmlrpc?u=${encodeURIComponent(ENDPOINT)}`);
    expect(init?.method).toBe('POST');
    const h = init?.headers as Record<string, string>;
    expect(h['Authorization']).toBe('Bearer clave-de-prueba');
    expect(h['Content-Type']).toBe('text/xml');
    expect(h['X-Tertulia-Sesion']).toBeUndefined();
    expect(init?.body).toBe(XML);
  });

  it('envía el token de sesión guardado de ese foro', async () => {
    await guardarSesion('foro.ejemplo.es', 'token-viejo');
    fetchFalso.mockResolvedValue(respuesta('<ok/>'));
    await crearTransporte('foro.ejemplo.es')(ENDPOINT, XML);
    const h = fetchFalso.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(h['X-Tertulia-Sesion']).toBe('token-viejo');
  });

  it('no envía la sesión de otro foro', async () => {
    await guardarSesion('otro.es', 'token-ajeno');
    fetchFalso.mockResolvedValue(respuesta('<ok/>'));
    await crearTransporte('foro.ejemplo.es')(ENDPOINT, XML);
    const h = fetchFalso.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(h['X-Tertulia-Sesion']).toBeUndefined();
  });

  it('guarda el token nuevo que devuelve el proxy', async () => {
    fetchFalso.mockResolvedValue(respuesta('<ok/>', 200, { 'X-Tertulia-Sesion': 'token-nuevo' }));
    await crearTransporte('foro.ejemplo.es')(ENDPOINT, XML);
    expect(await leerSesion('foro.ejemplo.es')).toBe('token-nuevo');
  });

  it('sin foro (descubrimiento) no guarda sesión', async () => {
    fetchFalso.mockResolvedValue(respuesta('<ok/>', 200, { 'X-Tertulia-Sesion': 'token-nuevo' }));
    await crearTransporte(null)(ENDPOINT, XML);
    expect(await leerSesion('null')).toBeUndefined();
  });

  it.each([
    [403, 'origen'],
    [401, 'clave'],
    [400, 'direccion'],
    [400, 'cuerpo'],
    [413, 'grande'],
    [502, 'grande'],
    [429, 'limite'],
    [502, 'redireccion'],
    [502, 'red'],
    [405, 'metodo'],
  ])('error del proxy %i / %s', async (estado, codigo) => {
    fetchFalso.mockResolvedValue(respuesta(JSON.stringify({ error: codigo, location: 'https://a.es/x' }), estado));
    const e = await crearTransporte(null)(ENDPOINT, XML).catch((x) => x);
    expect(e).toBeInstanceOf(ErrorProxy);
    expect(e.codigo).toBe(codigo);
    expect(e.estado).toBe(estado);
    expect(e.detalle.location).toBe('https://a.es/x');
  });

  it('error con cuerpo que no es JSON, o código desconocido -> red', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta('<html>Bad gateway</html>', 502));
    fetchFalso.mockResolvedValueOnce(respuesta('{"error":"raro"}', 500));
    for (let i = 0; i < 2; i++) {
      const e = await crearTransporte(null)(ENDPOINT, XML).catch((x) => x);
      expect(e.codigo).toBe('red');
    }
  });

  it('fallo de red -> red', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));
    const e = await crearTransporte(null)(ENDPOINT, XML).catch((x) => x);
    expect(e).toMatchObject({ codigo: 'red' });
  });

  it('sin clave guardada no llama a la red', async () => {
    await guardarAjustes({ clave: '' });
    const e = await crearTransporte(null)(ENDPOINT, XML).catch((x) => x);
    expect(e).toMatchObject({ codigo: 'clave' });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('el ClienteForo funciona a través del transporte', async () => {
    fetchFalso.mockResolvedValue(respuesta(fixture('get_config')));
    const c = new ClienteForo({ endpoint: ENDPOINT, transporte: crearTransporte(null) });
    expect((await c.getConfig()).version).toBe('sm21');
  });
});

describe('probarClave', () => {
  it('clave buena: ping ok y 400 direccion', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta('{"ok":true}'));
    fetchFalso.mockResolvedValueOnce(respuesta('{"error":"direccion","codigo":"vacio"}', 400));
    await expect(probarClave('buena')).resolves.toBeUndefined();
    expect(fetchFalso.mock.calls[0]![0]).toBe('/api/ping');
    expect((fetchFalso.mock.calls[1]![1]?.headers as Record<string, string>)['Authorization']).toBe('Bearer buena');
  });

  it('clave mala: 401', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta('{"ok":true}'));
    fetchFalso.mockResolvedValueOnce(respuesta('{"error":"clave"}', 401));
    await expect(probarClave('mala')).rejects.toMatchObject({ codigo: 'clave' });
  });

  it('proxy caído', async () => {
    fetchFalso.mockRejectedValue(new TypeError('x'));
    await expect(probarClave('k')).rejects.toMatchObject({ codigo: 'red' });
  });
});

describe('modo demostración', () => {
  it('responde con los fixtures sin tocar la red', async () => {
    (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('http://localhost/?demo');
    await guardarAjustes({ clave: '' });
    const c = new ClienteForo({ endpoint: ENDPOINT, transporte: crearTransporte(null) });
    expect((await c.getConfig()).version).toBe('sm21');
    expect((await c.getUltimosTemas(0, 19)).temas.length).toBeGreaterThan(0);
    expect((await c.getHilo('1', 0, 19)).mensajes.length).toBeGreaterThan(0);
    expect((await c.login('a', 'b')).exito).toBe(true);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
