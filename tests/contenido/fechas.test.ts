import { describe, expect, it } from 'vitest';
import { fechaRelativa } from '../../src/contenido/fechas';

const ahora = new Date(2026, 10, 5, 12, 0, 0); // 5 nov 2026, 12:00 local
const hace = (ms: number) => new Date(ahora.getTime() - ms);

describe('fechaRelativa', () => {
  it('ahora, minutos y horas', () => {
    expect(fechaRelativa(hace(10_000), ahora)).toBe('ahora');
    expect(fechaRelativa(hace(5 * 60_000), ahora)).toBe('hace 5 min');
    expect(fechaRelativa(hace(3 * 3_600_000), ahora)).toBe('hace 3 h');
  });

  it('ayer y días', () => {
    expect(fechaRelativa(new Date(2026, 10, 4, 23, 0), ahora)).toBe('ayer');
    expect(fechaRelativa(new Date(2026, 10, 2, 9, 0), ahora)).toBe('hace 3 d');
  });

  it('fechas antiguas en es-ES', () => {
    expect(fechaRelativa(new Date(2026, 9, 1), ahora)).toMatch(/1 oct/);
    expect(fechaRelativa(new Date(2025, 2, 3), ahora)).toMatch(/2025/);
  });

  it('nulo o inválido -> cadena vacía', () => {
    expect(fechaRelativa(null, ahora)).toBe('');
    expect(fechaRelativa(new Date(NaN), ahora)).toBe('');
  });
});
