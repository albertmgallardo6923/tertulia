// Acceso a los textos de la interfaz (todos viven en es.json).
import es from './es.json';

type Arbol = { [k: string]: string | Arbol };

function buscar(clave: string): string | undefined {
  let nodo: string | Arbol | undefined = es as Arbol;
  for (const parte of clave.split('.')) {
    if (nodo === undefined || typeof nodo === 'string') return undefined;
    nodo = nodo[parte];
  }
  return typeof nodo === 'string' ? nodo : undefined;
}

/** `t('clave.anidada', { n: 3 })` sustituye `{n}`. Si falta la clave devuelve la propia clave. */
export function t(clave: string, vars: Record<string, string | number> = {}): string {
  const base = buscar(clave) ?? clave;
  return base.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function existe(clave: string): boolean {
  return buscar(clave) !== undefined;
}
