import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Hilo } from '../../src/api/tipos';
import { usarSoloMemoria, vaciarMemoria, claves } from '../../src/datos/almacen';
import { borrarBorrador, guardarBorrador, leerBorrador } from '../../src/datos/borradores';
import { guardarHilo, leerHilo, MAX_TEMAS } from '../../src/datos/cache';
import { existe } from '../../src/i18n';

const hilo = (n: number): Hilo => ({
  tema: {
    id: String(n), foroId: '1', foroNombre: 'F', titulo: `T${n}`, autorId: '1', autor: 'a',
    vistas: 0, fecha: new Date(0), cerrado: false, fijo: false, suscrito: false,
  },
  totalMensajes: 1,
  puedeResponder: false,
  mensajes: [],
});

beforeEach(() => {
  usarSoloMemoria(true);
  vaciarMemoria();
});

describe('caché de hilos (LRU de 50 temas)', () => {
  it('guarda y lee una página con su fecha', async () => {
    await guardarHilo('f', '7', 1, hilo(7));
    const g = await leerHilo('f', '7', 1);
    expect(g?.hilo.tema.titulo).toBe('T7');
    expect(g?.hilo.tema.fecha).toBeInstanceOf(Date);
    expect(await leerHilo('f', '7', 2)).toBeUndefined();
  });

  it('expulsa el tema menos reciente (con todas sus páginas) al pasar de 50', async () => {
    await guardarHilo('f', '0', 1, hilo(0));
    await guardarHilo('f', '0', 2, hilo(0));
    for (let i = 1; i < MAX_TEMAS; i++) await guardarHilo('f', String(i), 1, hilo(i));
    await leerHilo('f', '0', 1);
    expect(await leerHilo('f', '0', 1)).toBeDefined(); // justo en el límite: aún está
    await guardarHilo('f', 'nuevo', 1, hilo(99)); // el 51.º expulsa el más antiguo
    expect(await leerHilo('f', '0', 1)).toBeUndefined();
    expect(await leerHilo('f', '0', 2)).toBeUndefined();
    expect(await leerHilo('f', '1', 1)).toBeDefined();
    expect((await claves('hilo:')).length).toBe(MAX_TEMAS);
  });

  it('volver a guardar un tema lo marca como el más reciente', async () => {
    for (let i = 0; i < MAX_TEMAS; i++) await guardarHilo('f', String(i), 1, hilo(i));
    await guardarHilo('f', '0', 1, hilo(0));
    await guardarHilo('f', 'x', 1, hilo(100));
    expect(await leerHilo('f', '0', 1)).toBeDefined();
    expect(await leerHilo('f', '1', 1)).toBeUndefined();
  });
});

describe('borradores', () => {
  it('guarda, lee y borra', async () => {
    await guardarBorrador('f', '7', { texto: 'hola' });
    expect((await leerBorrador('f', '7'))?.texto).toBe('hola');
    await borrarBorrador('f', '7');
    expect(await leerBorrador('f', '7')).toBeUndefined();
  });

  it('un borrador vacío se elimina', async () => {
    await guardarBorrador('f', 'nuevo-3', { asunto: 'a', texto: 'b' });
    await guardarBorrador('f', 'nuevo-3', { asunto: '', texto: '  ' });
    expect(await leerBorrador('f', 'nuevo-3')).toBeUndefined();
  });
});

describe('textos de la interfaz', () => {
  function archivos(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? archivos(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
  }

  it('toda clave t("...") usada en src/ existe en es.json', () => {
    const usadas = new Set<string>();
    for (const f of archivos('src').filter((x) => !x.endsWith('i18n/index.ts'))) {
      const src = readFileSync(f, 'utf-8');
      for (const m of src.matchAll(/\bt\(\s*'([\w.]+)'/g)) usadas.add(m[1]!);
    }
    expect(usadas.size).toBeGreaterThan(40);
    expect([...usadas].filter((k) => !existe(k))).toEqual([]);
  });

  it('existen los mensajes de cada error del proxy', () => {
    for (const c of ['origen', 'clave', 'direccion', 'cuerpo', 'grande', 'limite', 'redireccion', 'red', 'metodo']) {
      expect(existe(`errores.proxy.${c}`)).toBe(true);
    }
  });
});
