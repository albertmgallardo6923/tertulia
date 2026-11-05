import { beforeEach, describe, expect, it } from 'vitest';
import { AJUSTES_INICIALES } from '../../src/datos/ajustes';
import { aplicarTema, CLAVE_TEMA } from '../../src/ui/tema';

describe('tema de color', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#10141C">';
    localStorage.clear();
  });

  it('el predeterminado es oscuro', () => {
    expect(AJUSTES_INICIALES.tema).toBe('oscuro');
  });

  it('aplica el tema a <html>, recuerda la copia para el pintado anticipado y ajusta theme-color', () => {
    aplicarTema('claro');
    expect(document.documentElement.dataset.tema).toBe('claro');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('claro');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#F7F7F4');
    aplicarTema('oscuro');
    expect(document.documentElement.dataset.tema).toBe('oscuro');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#10141C');
  });
});
