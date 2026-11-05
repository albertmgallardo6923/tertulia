import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Hilo } from '../../api/tipos';
import { aTextoPlano } from '../../contenido/sanear';
import { fechaCompleta, fechaRelativa, numeroEs } from '../../contenido/fechas';
import { iniciales } from '../../contenido/nombres';
import { guardarVisto, leerVisto } from '../../datos/visto';
import { borrarBorrador, guardarBorrador, leerBorrador } from '../../datos/borradores';
import { guardarHilo, leerHilo, type HiloEnCache } from '../../datos/cache';
import { clienteDe } from '../../datos/clientes';
import { leerForo, type ForoGuardado } from '../../datos/foros';
import { t } from '../../i18n';
import { Cargando, Contenido, ErrorEstado, Pantalla, Vacio } from '../componentes';
import { hrefDe, ir, mensajeError, useCarga } from '../hooks';
import { IcoChevron, IcoEnviar, IcoPuntos } from '../iconos';
import { Paginador } from './Foros';

export const POR_PAGINA = 20;

interface Datos {
  foro: ForoGuardado;
  hilo: Hilo;
  pagina: number;
  paginas: number;
}

async function cargarPagina(foroId: string, temaId: string, pagina: number): Promise<Datos | null> {
  const foro = await leerForo(foroId);
  if (!foro) return null;
  const desde = (pagina - 1) * POR_PAGINA;
  const hilo = await clienteDe(foro).getHilo(temaId, desde, desde + POR_PAGINA - 1);
  await guardarHilo(foroId, temaId, pagina, hilo);
  return { foro, hilo, pagina, paginas: Math.max(1, Math.ceil(hilo.totalMensajes / POR_PAGINA)) };
}

/** «Ir al último»: pregunta cuántos mensajes hay (uno solo) y salta a la última página. */
async function irAlUltimo(foroId: string, temaId: string): Promise<void> {
  const foro = await leerForo(foroId);
  if (!foro) return;
  const hilo = await clienteDe(foro).getHilo(temaId, 0, 0);
  const ultima = Math.max(1, Math.ceil(hilo.totalMensajes / POR_PAGINA));
  location.replace(hrefDe('foros', foroId, 't', temaId, 'p', ultima));
}

// ---------- hoja para responder ----------

function HojaResponder(props: {
  foro: ForoGuardado;
  hilo: Hilo;
  inicial: string;
  onCerrar: () => void;
  onEnviado: () => void;
}) {
  const { foro, hilo } = props;
  const [texto, setTexto] = useState(props.inicial);
  const [enviando, setEnviando] = useState(false);
  const [publicado, setPublicado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const temporizador = useRef<number>();

  useEffect(() => {
    clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardarBorrador(foro.id, hilo.tema.id, { texto }), 500);
    return () => clearTimeout(temporizador.current);
  }, [texto]);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await clienteDe(foro).responder(hilo.tema.foroId, hilo.tema.id, `Re: ${hilo.tema.titulo}`, texto);
      if (!r.exito) {
        setError(r.mensaje || t('tema.errorEnviar'));
        return;
      }
      clearTimeout(temporizador.current);
      await borrarBorrador(foro.id, hilo.tema.id);
      setPublicado(true);
      setTimeout(props.onEnviado, 700);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  // En el body: la hoja debe quedar por encima de la barra de pestañas.
  return createPortal(
    <div class="hoja-fondo" onClick={(e) => e.target === e.currentTarget && props.onCerrar()}>
      <section class="hoja" role="dialog" aria-modal="true" aria-label={t('tema.responder')}>
        <header class="hoja-cab">
          <button type="button" class="btn-texto btn-texto--tenue" onClick={props.onCerrar}>
            {t('comun.cancelar')}
          </button>
          <h2 class="hoja-titulo">{t('tema.responder')}</h2>
          <button type="button" class="btn-publicar" disabled={enviando || publicado || !texto.trim()} onClick={enviar}>
            {publicado ? t('tema.publicado') : enviando ? t('tema.publicando') : t('tema.publicar')}
          </button>
        </header>
        <textarea
          class="hoja-campo"
          rows={7}
          autofocus
          placeholder={t('tema.escribe')}
          aria-label={t('tema.escribe')}
          value={texto}
          onInput={(e) => setTexto((e.currentTarget as HTMLTextAreaElement).value)}
        />
        <p class="hoja-nota">{t('tema.borradorAuto')}</p>
        {error && <p class="aviso" role="alert">{error}</p>}
      </section>
    </div>,
    document.body,
  );
}

// ---------- tema ----------

export function PantallaTema({ foroId, temaId, pagina }: { foroId: string; temaId: string; pagina: number | 'ultimo' }) {
  const numero = pagina === 'ultimo' ? 0 : pagina;
  const [previo, setPrevio] = useState<HiloEnCache | undefined>();
  const [hoja, setHoja] = useState<string | null>(null); // texto inicial de la hoja, o null si está cerrada
  const [aviso, setAviso] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [vistoPrevio, setVistoPrevio] = useState<number | null>(null);

  const carga = useCarga(async () => {
    if (pagina === 'ultimo') {
      await irAlUltimo(foroId, temaId);
      return null;
    }
    return cargarPagina(foroId, temaId, numero);
  }, [foroId, temaId, pagina]);

  useEffect(() => {
    setPrevio(undefined);
    if (numero > 0) void leerHilo(foroId, temaId, numero).then(setPrevio);
  }, [foroId, temaId, numero]);

  // Lo visto en la visita anterior (se lee una vez; después se actualiza para la siguiente).
  useEffect(() => {
    setVistoPrevio(null);
    void leerVisto(foroId, temaId).then(setVistoPrevio);
  }, [foroId, temaId]);

  const d = carga.datos;
  useEffect(() => {
    if (vistoPrevio === null || !d || d.hilo.mensajes.length === 0) return;
    void guardarVisto(foroId, temaId, (d.pagina - 1) * POR_PAGINA + d.hilo.mensajes.length);
  }, [d, vistoPrevio]);

  const hilo = d?.hilo ?? previo?.hilo;
  const foro = d?.foro;
  const puedeResponder = !!foro?.usuario && !!hilo?.puedeResponder && !hilo.tema.cerrado;
  const sinSesion = !!foro && !foro.usuario;
  const paginas = d?.paginas ?? (previo ? Math.max(1, Math.ceil(previo.hilo.totalMensajes / POR_PAGINA)) : 1);

  const abrirResponder = async (cita = '') => {
    const b = await leerBorrador(foroId, temaId);
    const base = b?.texto ?? '';
    setHoja(cita ? `${base}${base && !base.endsWith('\n') ? '\n' : ''}${cita}` : base);
  };

  const citar = (autor: string, contenido: string) =>
    abrirResponder(`[quote=${autor.replace(/[\]"]/g, '')}]${aTextoPlano(contenido).slice(0, 1500)}[/quote]\n\n`);

  const marcarLeido = async () => {
    if (!foro) return;
    try {
      const r = await clienteDe(foro).marcarLeido(temaId);
      setAviso(r.exito ? t('tema.leido') : r.mensaje || t('tema.errorLeido'));
    } catch (e) {
      setAviso(mensajeError(e));
    }
  };

  useEffect(() => {
    if (!menu) return;
    const fuera = (e: Event) => {
      if (!(e.target as Element).closest('.menu-ancla')) setMenu(false);
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [menu]);

  const acciones = (
    <div class="menu-ancla">
      <button type="button" class="btn-icono" aria-label={t('tema.mas')} aria-expanded={menu} onClick={() => setMenu(!menu)}>
        <IcoPuntos />
      </button>
      {menu && (
        <>
          <div class="menu" role="menu">
            <a role="menuitem" href={hrefDe('foros', foroId, 't', temaId, 'p', 'ultimo')} onClick={() => setMenu(false)}>
              {t('tema.irAlUltimo')}
            </a>
            {foro?.usuario && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  void marcarLeido();
                }}
              >
                {t('tema.marcarLeido')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  let cuerpo;
  if (!hilo && carga.estado === 'cargando') cuerpo = <Cargando />;
  else if (!hilo && carga.estado === 'error') cuerpo = <ErrorEstado error={carga.error} onReintentar={carga.recargar} />;
  else if (!hilo) cuerpo = pagina === 'ultimo' ? <Cargando /> : <Vacio titulo={t('foros.noExiste')} />;
  else {
    cuerpo = (
      <>
        {carga.error !== undefined && (
          <p class="aviso" role="alert">
            {t('tema.sinConexion')} {mensajeError(carga.error)}
          </p>
        )}
        {aviso && <p class="aviso aviso--ok" role="status">{aviso}</p>}
        {hilo.mensajes.length === 0 ? (
          <Vacio titulo={t('tema.sinMensajes')} />
        ) : (
          <div class="hilo">
            {hilo.mensajes.map((m, i) => {
              const absoluto = (numero - 1) * POR_PAGINA + i + 1;
              const nuevo = !!vistoPrevio && absoluto > vistoPrevio;
              const propio = !!foro?.usuario && m.autor.toLowerCase() === foro.usuario.toLowerCase();
              return (
                <article class={`msg${nuevo ? ' msg--nuevo' : ''}${propio ? ' msg--propio' : ''}`} key={m.id}>
                  <header class="msg-cab">
                    <span class="nudo" aria-hidden="true">
                      {iniciales(m.autor)}
                    </span>
                    <strong class="msg-autor">{m.autor}</strong>
                    <span class="msg-fecha" title={fechaCompleta(m.fecha)}>
                      {fechaRelativa(m.fecha)}
                    </span>
                    <span class="msg-num">#{numeroEs(absoluto)}</span>
                  </header>
                  <div class="msg-cuerpo">
                    <Contenido bruto={m.contenido} />
                    {puedeResponder && (
                      <button type="button" class="msg-citar" onClick={() => citar(m.autor, m.contenido)}>
                        {t('tema.citar')}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {numero < paginas && <div class="hilo-cola" aria-hidden="true" />}
          </div>
        )}
        <Paginador pagina={numero} total={paginas} enlace={(p) => hrefDe('foros', foroId, 't', temaId, 'p', p)} />
      </>
    );
  }

  const cabecera = hilo && (
    <header class="hilo-cab">
      <h1 class="hilo-titulo">{hilo.tema.titulo}</h1>
      <div class="hilo-sub">
        <span>
          {t('tema.mensajes', { n: numeroEs(hilo.totalMensajes) })}
          {hilo.tema.cerrado && <span class="hilo-cerrado">{t('tema.cerrado')}</span>}
        </span>
        {paginas > 1 && (
          <span class="hilo-pag">
            {numero < paginas ? (
              <a href={hrefDe('foros', foroId, 't', temaId, 'p', numero + 1)}>
                {t('paginas.de', { n: numeroEs(numero), total: numeroEs(paginas) })}
                <IcoChevron />
              </a>
            ) : (
              t('paginas.de', { n: numeroEs(numero), total: numeroEs(paginas) })
            )}
          </span>
        )}
      </div>
    </header>
  );

  const pie = puedeResponder ? (
    <div class="barra-redactar">
      <button type="button" class="redactar-campo" onClick={() => abrirResponder()}>
        {t('tema.escribeRespuesta')}
      </button>
      <button type="button" class="redactar-enviar" aria-label={t('tema.responder')} onClick={() => abrirResponder()}>
        <IcoEnviar />
      </button>
    </div>
  ) : sinSesion && hilo ? (
    <div class="barra-redactar">
      <a class="redactar-campo" href={hrefDe('foros', foroId, 'login')}>
        {t('tema.iniciaParaResponder')}
      </a>
    </div>
  ) : undefined;

  return (
    <>
      <Pantalla
        titulo={hilo?.tema.titulo ?? t('tema.titulo')}
        atras={['foros', foroId]}
        atrasTexto={hilo?.tema.foroNombre}
        acciones={hilo ? acciones : undefined}
        onRecargar={carga.recargar}
        cabecera={cabecera || undefined}
        pie={pie}
      >
        {cuerpo}
      </Pantalla>
      {hoja !== null && foro && hilo && (
        <HojaResponder
          foro={foro}
          hilo={hilo}
          inicial={hoja}
          onCerrar={() => setHoja(null)}
          onEnviado={() => {
            setHoja(null);
            ir('foros', foroId, 't', temaId, 'p', 'ultimo');
          }}
        />
      )}
    </>
  );
}

// ---------- tema nuevo ----------

export function PantallaNuevoTema({ foroId, subforoId }: { foroId: string; subforoId: string }) {
  const destino = `nuevo-${subforoId}`;
  const [asunto, setAsunto] = useState('');
  const [texto, setTexto] = useState('');
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const carga = useCarga(() => leerForo(foroId), [foroId]);
  const foro = carga.datos;

  useEffect(() => {
    void leerBorrador(foroId, destino).then((b) => {
      if (b) {
        setAsunto(b.asunto ?? '');
        setTexto(b.texto);
      }
      setListo(true);
    });
  }, [foroId, destino]);

  // Autoguardado del borrador (tras cargarlo, para no pisarlo con vacío).
  useEffect(() => {
    if (!listo) return;
    const id = window.setTimeout(() => void guardarBorrador(foroId, destino, { asunto, texto }), 500);
    return () => clearTimeout(id);
  }, [asunto, texto, listo]);

  const enviar = async (e: Event) => {
    e.preventDefault();
    if (!foro || !asunto.trim() || !texto.trim()) return setError(t('tema.nuevoVacio'));
    setEnviando(true);
    setError(null);
    try {
      const r = await clienteDe(foro).nuevoTema(subforoId, asunto.trim(), texto);
      if (!r.exito) return setError(r.mensaje || t('tema.errorEnviar'));
      await borrarBorrador(foroId, destino);
      if (r.id) ir('foros', foroId, 't', r.id);
      else ir('foros', foroId, 'f', subforoId);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla titulo={t('tema.nuevo')} atras={['foros', foroId, 'f', subforoId]}>
      {carga.estado === 'cargando' ? (
        <Cargando />
      ) : !foro?.usuario ? (
        <Vacio titulo={t('tema.necesitaSesion')}>
          <a class="btn btn-primario" href={hrefDe('foros', foroId, 'login')}>
            {t('login.entrar')}
          </a>
        </Vacio>
      ) : (
        <form class="formulario" onSubmit={enviar}>
          <div class="grupo">
            <input
              class="campo"
              type="text"
              name="asunto"
              autocomplete="off"
              placeholder={t('tema.asunto')}
              aria-label={t('tema.asunto')}
              value={asunto}
              onInput={(e) => setAsunto((e.currentTarget as HTMLInputElement).value)}
            />
            <textarea
              class="campo campo--area"
              rows={10}
              placeholder={t('tema.escribe')}
              aria-label={t('tema.escribe')}
              value={texto}
              onInput={(e) => setTexto((e.currentTarget as HTMLTextAreaElement).value)}
            />
          </div>
          <p class="nota">{t('tema.borradorAuto')}</p>
          {error && <p class="aviso" role="alert">{error}</p>}
          <button class="btn btn-primario" type="submit" disabled={enviando}>
            {enviando ? t('tema.publicando') : t('tema.publicar')}
          </button>
        </form>
      )}
    </Pantalla>
  );
}
