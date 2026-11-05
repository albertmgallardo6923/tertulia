import type { Tema } from '../../api/tipos';
import { fechaCompleta, fechaRelativa } from '../../contenido/fechas';
import { t } from '../../i18n';
import { hrefDe } from '../hooks';
import { IcoChevron, IcoFijado } from '../iconos';

/** Fila de tema. Todo se pinta como texto (nunca como HTML). */
export function FilaTema({ foroId, tema }: { foroId: string; tema: Tema }) {
  const meta = [
    tema.autor,
    fechaRelativa(tema.fecha),
    t('temas.respuestas', { n: tema.respuestas }),
  ].filter(Boolean);
  return (
    <a class="fila fila--tema" href={hrefDe('foros', foroId, 't', tema.id)}>
      <span class={`punto${tema.hayNuevos ? ' punto--nuevo' : ''}`} aria-label={tema.hayNuevos ? t('temas.nuevos') : undefined} />
      <span class="fila-cuerpo">
        <span class="fila-titulo">
          {tema.fijo && (
            <span class="fijado" title={t('temas.fijado')}>
              <IcoFijado />
            </span>
          )}
          {tema.titulo}
        </span>
        {tema.resumen && <span class="fila-resumen">{tema.resumen.replace(/\[[^\]]*\]/g, '').slice(0, 160)}</span>}
        <span class="fila-meta" title={fechaCompleta(tema.fecha)}>
          {meta.join(' · ')}
        </span>
      </span>
      <span class="fila-chevron">
        <IcoChevron />
      </span>
    </a>
  );
}
