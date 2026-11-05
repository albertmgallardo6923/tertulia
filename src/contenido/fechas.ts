// Fechas en es-ES, relativas («hace 5 min», «ayer»). Se pintan desde `timestamp`.
const relativo = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto', style: 'short' });

function inicioDeDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function fechaRelativa(fecha: Date | null, ahora: Date = new Date()): string {
  if (!fecha || isNaN(fecha.getTime())) return '';
  const seg = Math.round((ahora.getTime() - fecha.getTime()) / 1000);
  if (seg < 45) return 'ahora';
  if (seg < 3600) return relativo.format(-Math.max(1, Math.round(seg / 60)), 'minute');
  const dias = Math.round((inicioDeDia(ahora) - inicioDeDia(fecha)) / 86_400_000);
  if (dias <= 0) return relativo.format(-Math.round(seg / 3600), 'hour');
  if (dias < 7) return relativo.format(-dias, 'day');
  const otroAnio = fecha.getFullYear() !== ahora.getFullYear();
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    ...(otroAnio ? { year: 'numeric' } : {}),
  }).format(fecha);
}

export function fechaCompleta(fecha: Date | null): string {
  if (!fecha || isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(fecha);
}
