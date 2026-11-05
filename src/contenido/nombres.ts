/** Iniciales para el nudo del hilo: dos palabras -> primeras letras; una palabra -> sus dos primeras. */
export function iniciales(nombre: string): string {
  const limpio = nombre.replace(/[^\p{L}\p{N}\s._-]/gu, '').trim();
  if (!limpio) return '?';
  const palabras = limpio.split(/[\s._-]+/).filter(Boolean);
  const letras =
    palabras.length >= 2
      ? Array.from(palabras[0]!)[0]! + Array.from(palabras[1]!)[0]!
      : Array.from(palabras[0] ?? limpio).slice(0, 2).join('');
  return letras.toLocaleUpperCase('es-ES');
}
