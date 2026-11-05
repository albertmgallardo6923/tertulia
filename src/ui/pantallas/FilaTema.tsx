import type { Tema } from '../../api/tipos';
import { fechaCompleta, fechaRelativa, numeroEs } from '../../contenido/fechas';
import { t } from '../../i18n';
import { hrefDe } from '../hooks';
import { IcoBocadillo, IcoFijado } from '../iconos';

/**
 * Fila de tema, sin tarjeta. Todo se pinta como texto (nunca como HTML).
 * `conSesion` indica si el foro informa de lo leído: sin sesión no hay «leído», así que no se atenúa.
 */
export function FilaTema({ foroId, tema, conSesion = true }: { foroId: string; tema: Tema; conSesion?: boolean }) {
  const leido = conSesion && !tema.hayNuevos;
  return (
    <a class={`fila-tema${leido ? ' fila-tema--leido' : ''}`} href={hrefDe('foros', foroId, 't', tema.id)}>
      <span class="fila-tema-punto">
        {tema.hayNuevos && <span class="punto" role="img" aria-label={t('temas.nuevos')} />}
      </span>
      <span class="fila-tema-cuerpo">
        <span class="fila-tema-titulo">
          {tema.fijo && (
            <span class="fijado" title={t('temas.fijado')}>
              <IcoFijado />
            </span>
          )}
          {tema.titulo}
        </span>
        {tema.resumen && (
          <span class="fila-tema-extracto">{tema.resumen.replace(/\[[^\]]*\]/g, '').slice(0, 200)}</span>
        )}
        <span class="fila-tema-meta">
          <span class="meta-autor">{tema.autor}</span>
          <span title={fechaCompleta(tema.fecha)}>{fechaRelativa(tema.fecha)}</span>
          <span class="meta-resp" aria-label={t('temas.respuestas', { n: tema.respuestas })}>
            <IcoBocadillo />
            {numeroEs(tema.respuestas)}
          </span>
        </span>
      </span>
    </a>
  );
}
