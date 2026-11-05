// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../../worker/index';

const ORIGEN = 'https://tertulia.pages.dev';
const FORO = 'https://foro-a.example.com/mobiquo/mobiquo.php';
const FORO_B = 'https://foro-b.example.com/mobiquo/mobiquo.php';
const SECRETO = 'secreto-de-pruebas-0123456789';
const XML = '<?xml version="1.0"?><methodCall><methodName>get_config</methodName></methodCall>';
const fixture = (n: string): string => readFileSync(`tests/fixtures/foro-clubtesla-es/${n}`, 'utf8');

let contador = 0;
let clave = '';
let env: Env;
let fetchMock: ReturnType<typeof vi.fn>;
const assets = vi.fn(async () => new Response('estatico'));

interface Opc {
  u?: string;
  body?: string;
  headers?: Record<string, string>;
  method?: string;
  sinOrigen?: boolean;
  sinClave?: boolean;
}

function pedir(o: Opc = {}): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'text/xml' };
  if (!o.sinOrigen) headers['Origin'] = ORIGEN;
  if (!o.sinClave) headers['Authorization'] = `Bearer ${clave}`;
  Object.assign(headers, o.headers);
  const url = `${ORIGEN}/api/xmlrpc?u=${encodeURIComponent(o.u ?? FORO)}`;
  const method = o.method ?? 'POST';
  const init: RequestInit = { method, headers };
  if (method !== 'GET') init.body = o.body ?? XML;
  return worker.fetch(new Request(url, init), env);
}

function respuestaForo(cuerpo: string, cookies: string[] = [], extra: Record<string, string> = {}, status = 200): Response {
  const h = new Headers({ 'Content-Type': 'text/html', Server: 'nginx', 'X-Powered-By': 'PHP', ...extra });
  for (const c of cookies) h.append('Set-Cookie', c);
  return new Response(cuerpo, { status, headers: h });
}

function cabecerasEnviadas(i = 0): Record<string, string> {
  const init = fetchMock.mock.calls[i]?.[1] as RequestInit;
  return init.headers as Record<string, string>;
}

beforeEach(() => {
  clave = `clave-${++contador}`;
  env = { ASSETS: { fetch: assets }, APP_KEY: clave, SESSION_SECRET: SECRETO };
  fetchMock = vi.fn(async () => respuestaForo(fixture('get_config.xml')));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('rutas', () => {
  it('fuera de /api/ delega en ASSETS', async () => {
    const r = await worker.fetch(new Request(`${ORIGEN}/index.html`), env);
    expect(await r.text()).toBe('estatico');
  });

  it('ping informa de los secretos', async () => {
    const r = await worker.fetch(new Request(`${ORIGEN}/api/ping`), env);
    expect(await r.json()).toEqual({ ok: true, clave: true, sesion: true });
    const sin = await worker.fetch(new Request(`${ORIGEN}/api/ping`), { ASSETS: env.ASSETS });
    expect(await sin.json()).toEqual({ ok: true, clave: false, sesion: false });
  });

  it('ruta /api/ desconocida: 404', async () => {
    const r = await worker.fetch(new Request(`${ORIGEN}/api/otra`), env);
    expect(r.status).toBe(404);
  });
});

describe('errores del proxy', () => {
  async function esperar(r: Response, estado: number, codigo: string): Promise<Record<string, unknown>> {
    expect(r.status).toBe(estado);
    expect(r.headers.get('Content-Type')).toBe('application/json');
    const j = (await r.json()) as Record<string, unknown>;
    expect(j['error']).toBe(codigo);
    expect(fetchMock).not.toHaveBeenCalled();
    return j;
  }

  it('metodo 405', async () => {
    await esperar(await pedir({ method: 'GET' }), 405, 'metodo');
  });

  it('origen 403 (ausente o ajeno)', async () => {
    await esperar(await pedir({ sinOrigen: true }), 403, 'origen');
    await esperar(await pedir({ headers: { Origin: 'https://malo.example.org' } }), 403, 'origen');
  });

  it('clave 401 (ausente, errónea o sin APP_KEY)', async () => {
    await esperar(await pedir({ sinClave: true }), 401, 'clave');
    await esperar(await pedir({ headers: { Authorization: 'Bearer otra' } }), 401, 'clave');
    env = { ASSETS: env.ASSETS };
    await esperar(await pedir({ headers: { Authorization: 'Bearer undefined' } }), 401, 'clave');
  });

  it('direccion 400 con codigo del validador', async () => {
    const j = await esperar(await pedir({ u: 'http://foro-a.example.com/mobiquo/mobiquo.php' }), 400, 'direccion');
    expect(j['codigo']).toBe('esquema');
    const ip = await esperar(await pedir({ u: 'https://10.0.0.1/mobiquo/mobiquo.php' }), 400, 'direccion');
    expect(ip['codigo']).toBe('ip');
    const propio = await esperar(await pedir({ u: `${ORIGEN}/mobiquo/mobiquo.php` }), 400, 'direccion');
    expect(propio['codigo']).toBe('host-propio');
  });

  it('cuerpo 400 (tipo o contenido no XML-RPC)', async () => {
    await esperar(await pedir({ headers: { 'Content-Type': 'application/json' } }), 400, 'cuerpo');
    await esperar(await pedir({ body: '{"a":1}' }), 400, 'cuerpo');
  });

  it('grande 413 si la peticion supera 1 MB', async () => {
    await esperar(await pedir({ body: XML + ' '.repeat(1024 * 1024) }), 413, 'grande');
  });
});

describe('reenvio', () => {
  it('manda solo Content-Type, User-Agent y Cookie; redirect manual', async () => {
    const r = await pedir({ headers: { 'X-Otra': '1', Referer: 'https://x.example', Cookie: 'robada=1' } });
    expect(r.status).toBe(200);
    expect(Object.keys(cabecerasEnviadas()).sort()).toEqual(['Content-Type', 'User-Agent']);
    expect(cabecerasEnviadas()['User-Agent']).toBe('Tertulia/1.0');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.redirect).toBe('manual');
    expect(init.body).toBe(XML);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(FORO);
  });

  it('devuelve status y cuerpo del foro con solo las cabeceras de seguridad', async () => {
    fetchMock.mockResolvedValue(respuestaForo(fixture('get_forum.xml'), [], { 'X-Debug': 'secreto' }, 500));
    const r = await pedir();
    expect(r.status).toBe(500);
    expect(await r.text()).toBe(fixture('get_forum.xml'));
    const h = Object.fromEntries(r.headers.entries());
    expect(h).toEqual({
      'content-type': 'text/xml; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'",
    });
  });

  it('ninguna cabecera del foro llega al cliente (Set-Cookie incluido, sin SESSION_SECRET)', async () => {
    fetchMock.mockResolvedValue(respuestaForo('<x/>', ['sid=1; HttpOnly'], { 'Access-Control-Allow-Origin': '*', Location: 'x' }));
    env = { ASSETS: env.ASSETS, APP_KEY: clave };
    const r = await pedir();
    expect(r.headers.get('set-cookie')).toBeNull();
    expect(r.headers.get('server')).toBeNull();
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    expect(r.headers.get('x-tertulia-sesion')).toBeNull();
  });
});

describe('sesion', () => {
  it('ciclo completo: Set-Cookie -> token -> Cookie en la siguiente', async () => {
    fetchMock.mockResolvedValueOnce(respuestaForo('<login/>', ['sid=abc; Path=/; HttpOnly', 'uid=7; Max-Age=3600']));
    const r1 = await pedir();
    const token = r1.headers.get('X-Tertulia-Sesion') ?? '';
    expect(token).toMatch(/^[\w-]{40,}$/);
    expect(token).not.toContain('abc');
    expect(r1.headers.get('set-cookie')).toBeNull();
    expect(cabecerasEnviadas(0)['Cookie']).toBeUndefined();

    fetchMock.mockResolvedValueOnce(respuestaForo('<ok/>'));
    const r2 = await pedir({ headers: { 'X-Tertulia-Sesion': token } });
    expect(cabecerasEnviadas(1)['Cookie']).toBe('sid=abc; uid=7');
    expect(r2.headers.get('X-Tertulia-Sesion')).toBeNull();

    // Nuevo Set-Cookie: el token nuevo conserva las cookies previas.
    fetchMock.mockResolvedValueOnce(respuestaForo('<ok/>', ['extra=z']));
    const r3 = await pedir({ headers: { 'X-Tertulia-Sesion': token } });
    const token2 = r3.headers.get('X-Tertulia-Sesion') ?? '';
    expect(token2).not.toBe(token);
    fetchMock.mockResolvedValueOnce(respuestaForo('<ok/>'));
    await pedir({ headers: { 'X-Tertulia-Sesion': token2 } });
    expect(cabecerasEnviadas(3)['Cookie']).toBe('sid=abc; uid=7; extra=z');
  });

  it('token de otro host: se ignora', async () => {
    fetchMock.mockResolvedValueOnce(respuestaForo('<login/>', ['sid=abc']));
    const token = (await pedir()).headers.get('X-Tertulia-Sesion') ?? '';
    fetchMock.mockResolvedValueOnce(respuestaForo('<ok/>'));
    const r = await pedir({ u: FORO_B, headers: { 'X-Tertulia-Sesion': token } });
    expect(r.status).toBe(200);
    expect(cabecerasEnviadas(1)['Cookie']).toBeUndefined();
  });

  it('token manipulado, truncado o basura: se ignora', async () => {
    fetchMock.mockResolvedValueOnce(respuestaForo('<login/>', ['sid=abc']));
    const token = (await pedir()).headers.get('X-Tertulia-Sesion') ?? '';
    const mitad = Math.floor(token.length / 2);
    const cambiado = token.slice(0, mitad) + (token[mitad] === 'A' ? 'B' : 'A') + token.slice(mitad + 1);
    const malos = [cambiado, token.slice(0, -4), 'no es un token!', '***', 'A'.repeat(100)];
    for (const [i, malo] of malos.entries()) {
      const r = await pedir({ headers: { 'X-Tertulia-Sesion': malo } });
      expect(r.status).toBe(200);
      expect(cabecerasEnviadas(i + 1)['Cookie']).toBeUndefined();
    }
  });

  it('token cifrado con otro SESSION_SECRET: se ignora', async () => {
    fetchMock.mockResolvedValueOnce(respuestaForo('<login/>', ['sid=abc']));
    const token = (await pedir()).headers.get('X-Tertulia-Sesion') ?? '';
    env = { ...env, SESSION_SECRET: 'rotado-otro-secreto' };
    await pedir({ headers: { 'X-Tertulia-Sesion': token } });
    expect(cabecerasEnviadas(1)['Cookie']).toBeUndefined();
  });

  it('token caducado (> 30 dias): se ignora', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    fetchMock.mockResolvedValueOnce(respuestaForo('<login/>', ['sid=abc']));
    const token = (await pedir()).headers.get('X-Tertulia-Sesion') ?? '';
    vi.setSystemTime(Date.now() + 29 * 86_400_000);
    await pedir({ headers: { 'X-Tertulia-Sesion': token } });
    expect(cabecerasEnviadas(1)['Cookie']).toBe('sid=abc');
    vi.setSystemTime(Date.now() + 2 * 86_400_000);
    await pedir({ headers: { 'X-Tertulia-Sesion': token } });
    expect(cabecerasEnviadas(2)['Cookie']).toBeUndefined();
  });

  it('cookie con Max-Age=0 o expirada se elimina del token', async () => {
    fetchMock.mockResolvedValueOnce(respuestaForo('<login/>', ['sid=abc', 'a=1', 'b=2']));
    const token = (await pedir()).headers.get('X-Tertulia-Sesion') ?? '';
    fetchMock.mockResolvedValueOnce(
      respuestaForo('<logout/>', ['sid=; Max-Age=0', 'a=x; Expires=Thu, 01 Jan 1970 00:00:00 GMT']),
    );
    const token2 = (await pedir({ headers: { 'X-Tertulia-Sesion': token } })).headers.get('X-Tertulia-Sesion') ?? '';
    fetchMock.mockResolvedValueOnce(respuestaForo('<ok/>'));
    await pedir({ headers: { 'X-Tertulia-Sesion': token2 } });
    expect(cabecerasEnviadas(2)['Cookie']).toBe('b=2');
  });

  it('un token con todas las cookies borradas no envia Cookie', async () => {
    fetchMock.mockResolvedValueOnce(respuestaForo('<login/>', ['sid=abc']));
    const token = (await pedir()).headers.get('X-Tertulia-Sesion') ?? '';
    fetchMock.mockResolvedValueOnce(respuestaForo('<logout/>', ['sid=deleted; Max-Age=0']));
    const token2 = (await pedir({ headers: { 'X-Tertulia-Sesion': token } })).headers.get('X-Tertulia-Sesion') ?? '';
    expect(token2).not.toBe('');
    fetchMock.mockResolvedValueOnce(respuestaForo('<ok/>'));
    await pedir({ headers: { 'X-Tertulia-Sesion': token2 } });
    expect(cabecerasEnviadas(2)['Cookie']).toBeUndefined();
  });
});

describe('limite', () => {
  it('429 tras 60 peticiones por minuto y con Retry-After', async () => {
    for (let i = 0; i < 60; i++) expect((await pedir()).status).toBe(200);
    const r = await pedir();
    expect(r.status).toBe(429);
    expect(((await r.json()) as { error: string }).error).toBe('limite');
    expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(60);
  });

  it('otra clave tiene su propio cubo', async () => {
    for (let i = 0; i < 61; i++) await pedir();
    clave = `${clave}-b`;
    env = { ...env, APP_KEY: clave };
    expect((await pedir()).status).toBe(200);
  });
});

describe('respuestas problematicas del foro', () => {
  it('respuesta > 5 MB sin Content-Length: 502 grande', async () => {
    fetchMock.mockResolvedValue(respuestaForo('x'.repeat(5 * 1024 * 1024 + 1)));
    const r = await pedir();
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toBe('grande');
  });

  it('respuesta > 5 MB con Content-Length: 502 grande', async () => {
    fetchMock.mockResolvedValue(respuestaForo('x', [], { 'Content-Length': String(6 * 1024 * 1024) }));
    const r = await pedir();
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toBe('grande');
  });

  it('respuesta de exactamente 5 MB: pasa', async () => {
    fetchMock.mockResolvedValue(respuestaForo('x'.repeat(5 * 1024 * 1024)));
    expect((await pedir()).status).toBe(200);
  });

  it('redireccion al mismo host: 502 con location', async () => {
    fetchMock.mockResolvedValue(respuestaForo('', [], { Location: 'https://foro-a.example.com/foro/mobiquo/mobiquo.php' }, 301));
    const r = await pedir();
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: 'redireccion', location: 'https://foro-a.example.com/foro/mobiquo/mobiquo.php' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redireccion relativa al mismo host: se resuelve', async () => {
    fetchMock.mockResolvedValue(respuestaForo('', [], { Location: '/foro/mobiquo/mobiquo.php' }, 302));
    const j = (await (await pedir()).json()) as Record<string, unknown>;
    expect(j['location']).toBe('https://foro-a.example.com/foro/mobiquo/mobiquo.php');
  });

  it('redireccion a otro host, a http o a una ruta invalida: sin location', async () => {
    for (const destino of [
      'https://otro.example.net/mobiquo/mobiquo.php',
      'http://foro-a.example.com/mobiquo/mobiquo.php',
      'https://foro-a.example.com/login',
      'https://10.0.0.1/mobiquo/mobiquo.php',
    ]) {
      fetchMock.mockResolvedValueOnce(respuestaForo('', [], { Location: destino }, 307));
      const r = await pedir();
      expect(r.status).toBe(502);
      expect(await r.json()).toEqual({ error: 'redireccion' });
    }
  });

  it('fallo de red: 502 red', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const r = await pedir();
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toBe('red');
  });

  it('timeout de 15 s: 502 red', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('abortado', 'AbortError')));
        }),
    );
    const p = pedir();
    while (fetchMock.mock.calls.length === 0) await new Promise((r) => setImmediate(r));
    await vi.advanceTimersByTimeAsync(14_000);
    let resuelto = false;
    void p.then(() => (resuelto = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(resuelto).toBe(false);
    await vi.advanceTimersByTimeAsync(1_100);
    const r = await p;
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toBe('red');
  });
});

describe('correcciones de cierre', () => {
  it('cuerpo sin Content-Length que supera el tope: 413', async () => {
    const grande = new TextEncoder().encode(`<methodCall>${'a'.repeat(1024 * 1024)}</methodCall>`);
    const flujo = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < grande.length; i += 65536) c.enqueue(grande.slice(i, i + 65536));
        c.close();
      },
    });
    const url = `${ORIGEN}/api/xmlrpc?u=${encodeURIComponent(FORO)}`;
    const req = new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', Origin: ORIGEN, Authorization: `Bearer ${clave}` },
      body: flujo,
      duplex: 'half',
    } as RequestInit);
    expect(req.headers.get('Content-Length')).toBeNull();
    const r = await worker.fetch(req, env);
    expect(r.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cuerpo de respuesta lento que supera el timeout: 502 red', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      const flujo = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode('<methodResponse>'));
          init.signal?.addEventListener('abort', () => c.error(new Error('abortado')));
        },
      });
      return new Response(flujo, { status: 200 });
    });
    const p = pedir();
    while (fetchMock.mock.calls.length === 0) await new Promise((r) => setImmediate(r));
    await vi.advanceTimersByTimeAsync(15_100);
    const r = await p;
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toBe('red');
  });

  it('30 cookies de 4 KB: el token cabe y se descartan las antiguas', async () => {
    const cookies = Array.from({ length: 30 }, (_, i) => `c${i}=${'x'.repeat(4000)}; Path=/`);
    fetchMock.mockImplementationOnce(async () => respuestaForo('<methodResponse/>', cookies));
    const r = await pedir();
    expect(r.status).toBe(200);
    const token = r.headers.get('X-Tertulia-Sesion');
    expect(token).toBeTruthy();
    expect(token!.length).toBeLessThanOrEqual(16 * 1024);
    expect(r.headers.get('X-Tertulia-Sesion-Error')).toBeNull();
    await pedir({ headers: { 'X-Tertulia-Sesion': token! } });
    const enviada = cabecerasEnviadas(1)['Cookie'] ?? '';
    expect(enviada.length).toBeLessThanOrEqual(6 * 1024);
    expect(enviada).toContain('c29=');
    expect(enviada).not.toContain('c0=');
  });

  it('<?xml?>basura: 400 cuerpo', async () => {
    const r = await pedir({ body: '<?xml version="1.0"?>basura' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe('cuerpo');
    expect((await pedir({ body: '<?xml version="1.0"?>\n<methodCall></methodCall>' })).status).toBe(200);
  });
});
