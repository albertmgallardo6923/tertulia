import type { Tema } from '../../api/tipos';
import { clienteDe } from '../../datos/clientes';
import { listarForos, type ForoGuardado } from '../../datos/foros';
import { t } from '../../i18n';
import { Aviso, Cargando, ErrorEstado, Pantalla, Vacio } from '../componentes';
import { useCarga } from '../hooks';
import { FilaTema } from './FilaTema';

export interface GrupoNovedades {
  foro: ForoGuardado;
  temas: Tema[];
  error?: unknown;
}

const POR_FORO = 20;

/** Con sesión: no leídos. Como invitado: últimos temas. Un foro tras otro (ritmo humano). */
export async function cargarNovedades(): Promise<GrupoNovedades[]> {
  const grupos: GrupoNovedades[] = [];
  for (const foro of await listarForos()) {
    try {
      const cliente = clienteDe(foro);
      const r = foro.usuario ? await cliente.getNoLeidos(0, POR_FORO - 1) : await cliente.getUltimosTemas(0, POR_FORO - 1);
      grupos.push({ foro, temas: r.temas });
    } catch (error) {
      grupos.push({ foro, temas: [], error });
    }
  }
  return grupos;
}

export function Novedades() {
  const carga = useCarga(cargarNovedades, []);
  const grupos = carga.datos;

  let cuerpo;
  if (carga.estado === 'cargando') cuerpo = <Cargando />;
  else if (carga.estado === 'error' || !grupos) cuerpo = <ErrorEstado error={carga.error} onReintentar={carga.recargar} />;
  else if (grupos.length === 0) {
    cuerpo = (
      <Vacio titulo={t('novedades.sinForos')} texto={t('novedades.sinForosTexto')}>
        <a class="btn btn-primario" href="#/foros/nuevo">
          {t('foros.anadir')}
        </a>
      </Vacio>
    );
  } else if (grupos.every((g) => g.temas.length === 0 && !g.error)) {
    cuerpo = <Vacio titulo={t('novedades.alDia')} texto={t('novedades.alDiaTexto')} />;
  } else {
    cuerpo = (
      <>
        {carga.error !== undefined && <Aviso error={carga.error} />}
        {grupos.map((g) => {
          const nuevos = g.temas.filter((x) => x.hayNuevos).length;
          return (
            <section class="grupo-foro" key={g.foro.id}>
              <h2 class="grupo-cab">
                <span class="grupo-nombre">{g.foro.nombre}</span>
                <span class={`grupo-cuenta${nuevos > 0 ? ' grupo-cuenta--nuevos' : ''}`}>
                  {nuevos > 0
                    ? t(nuevos === 1 ? 'novedades.nuevo' : 'novedades.nuevos', { n: nuevos })
                    : g.foro.usuario
                      ? t('novedades.noLeidos')
                      : t('novedades.ultimos')}
                </span>
              </h2>
              {g.error !== undefined ? (
                <Aviso error={g.error} />
              ) : g.temas.length === 0 ? (
                <p class="nota">{t('novedades.foroAlDia')}</p>
              ) : (
                <div class="lista-temas">
                  {g.temas.map((tema) => (
                    <FilaTema key={tema.id} foroId={g.foro.id} tema={tema} conSesion={!!g.foro.usuario} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </>
    );
  }

  return (
    <Pantalla titulo={t('pestanas.novedades')} onRecargar={carga.recargar}>
      {cuerpo}
    </Pantalla>
  );
}
