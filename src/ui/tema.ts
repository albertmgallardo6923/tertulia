// Tema de color: oscuro por defecto. El valor vive en los ajustes (IndexedDB); una copia en
// localStorage permite a /tema.js aplicarlo antes del primer pintado (la CSP no admite scripts en línea).
import type { Tema } from '../datos/ajustes';

export const CLAVE_TEMA = 'tertulia.tema';
const COLOR_OSCURO = '#10141C';
const COLOR_CLARO = '#F7F7F4';

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  raiz.dataset.tema = tema;
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    /* sin almacenamiento: solo se pierde el pintado anticipado */
  }
  const claro = tema === 'claro' || (tema === 'auto' && matchMedia?.('(prefers-color-scheme: light)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? COLOR_CLARO : COLOR_OSCURO);
}
