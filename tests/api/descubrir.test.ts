import { describe, expect, it } from 'vitest';
import { ErrorDireccion, endpointsCandidatos } from '../../src/api/descubrir';

const M = '/mobiquo/mobiquo.php';

describe('endpointsCandidatos', () => {
  it('dominio simple: añade https y rutas habituales en orden', () => {
    expect(endpointsCandidatos('foro.clubtesla.es')).toEqual([
      `https://foro.clubtesla.es${M}`,
      `https://foro.clubtesla.es/forum${M}`,
      `https://foro.clubtesla.es/foro${M}`,
      `https://foro.clubtesla.es/foros${M}`,
      `https://foro.clubtesla.es/forums${M}`,
      `https://foro.clubtesla.es/community${M}`,
    ]);
  });
  it('con ruta: primero la dada, sin barras finales ni duplicados', () => {
    const r = endpointsCandidatos('https://X.com/foro/');
    expect(r[0]).toBe(`https://x.com/foro${M}`);
    expect(r[1]).toBe(`https://x.com${M}`);
    expect(new Set(r).size).toBe(r.length);
  });
  it('acepta un endpoint ya completo', () => {
    expect(endpointsCandidatos(`https://x.com/foro${M}`)[0]).toBe(`https://x.com/foro${M}`);
    expect(endpointsCandidatos('https://x.com/mobiquo/')[0]).toBe(`https://x.com${M}`);
  });
  it('acepta puerto 443 explícito', () => {
    expect(endpointsCandidatos('https://x.com:443')[0]).toBe(`https://x.com${M}`);
  });
  it.each([
    'http://x.com',
    '',
    'ftp://x.com',
    'localhost',
    'https://foo.localhost',
    '127.0.0.1',
    'https://192.168.1.5/foro',
    'https://[::1]/',
    'https://2130706433/',
    'https://x.com:8443',
    'intranet',
    'servidor.local',
    'https://user:pw@x.com',
  ])('rechaza %j', (entrada) => {
    expect(() => endpointsCandidatos(entrada)).toThrow(ErrorDireccion);
  });
});
