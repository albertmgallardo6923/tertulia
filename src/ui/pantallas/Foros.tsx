import { useState } from 'preact/hooks';
import type { Foro } from '../../api/tipos';
import { guardar, leer } from '../../datos/almacen';
import { clienteDe } from '../../datos/clientes';
import { descubrirForo, type ForoDescubierto } from '../../datos/descubrir-foro';
import { guardarForo, idDeEndpoint, leerForo, listarForos, type ForoGuardado } from '../../datos/foros';
import { t } from '../../i18n';
import { ClienteForo } from '../../api/cliente';
import { Aviso, Cargando, ErrorEstado, Pantalla, Vacio } from '../componentes';
import { hrefDe, ir, mensajeError, useCarga } from '../hooks';
import { IcoChevron, IcoMas } from '../iconos';
import { FilaTema } from './FilaTema';

// ---------- lista de foros añadidos ----------

export function ListaForos() {
  const carga = useCarga(listarForos, []);
  const foros = carga.datos;
  const acciones = (
    <a class="btn-icono" href="#/foros/nuevo" aria-label={t('foros.anadir')}>
      <IcoMas />
    </a>
  );
  let cuerpo;
  if (carga.estado === 'cargando') cuerpo = <Cargando />;
  else if (carga.estado === 'error' || !foros) cuerpo = <ErrorEstado error={carga.error} onReintentar={carga.recargar} />;
  else if (foros.length === 0) {
    cuerpo = (
      <Vacio titulo={t('foros.vacio')} texto={t('foros.vacioTexto')}>
        <a class="btn btn-primario" href="#/foros/nuevo">
          {t('foros.anadir')}
        </a>
      </Vacio>
    );
  } else {
    cuerpo = (
      <div class="lista">
        {foros.map((f) => (
          <a key={f.id} class="fila" href={hrefDe('foros', f.id)}>
            <span class="fila-cuerpo">
              <span class="fila-titulo">{f.nombre}</span>
              <span class="fila-meta">
                {f.usuario ? t('foros.conSesion', { usuario: f.usuario }) : t('foros.invitado')}
              </span>
            </span>
            <span class="fila-chevron">
              <IcoChevron />
            </span>
          </a>
        ))}
      </div>
    );
  }
  return (
    <Pantalla titulo={t('pestanas.foros')} acciones={acciones} onRecargar={carga.recargar}>
      {cuerpo}
    </Pantalla>
  );
}

// ---------- iniciar sesión (formulario compartido) ----------

export function FormLogin({
  foro,
  onExito,
  onInvitado,
}: {
  foro: ForoGuardado;
  onExito: (usuario: string) => void;
  onInvitado?: () => void;
}) {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: Event) => {
    e.preventDefault();
    if (!usuario.trim() || !clave) return setError(t('login.vacio'));
    setEnviando(true);
    setError(null);
    try {
      const r = await clienteDe(foro).login(usuario.trim(), clave);
      if (!r.exito) {
        setError(r.mensaje || t('login.fallo'));
      } else {
        setClave(''); // la contraseña no se guarda en ningún sitio
        onExito(r.usuario || usuario.trim());
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} class="formulario">
      <div class="grupo">
        <input
          class="campo"
          type="text"
          name="username"
          autocomplete="username"
          autocapitalize="none"
          autocorrect="off"
          spellcheck={false}
          placeholder={t('login.usuario')}
          aria-label={t('login.usuario')}
          value={usuario}
          onInput={(e) => setUsuario((e.currentTarget as HTMLInputElement).value)}
        />
        <input
          class="campo"
          type="password"
          name="password"
          autocomplete="current-password"
          placeholder={t('login.clave')}
          aria-label={t('login.clave')}
          value={clave}
          onInput={(e) => setClave((e.currentTarget as HTMLInputElement).value)}
        />
      </div>
      {error && <p class="aviso" role="alert">{error}</p>}
      <button class="btn btn-primario" type="submit" disabled={enviando}>
        {enviando ? t('login.entrando') : t('login.entrar')}
      </button>
      {onInvitado && foro.config.invitadoPermitido && (
        <button class="btn btn-secundario" type="button" onClick={onInvitado}>
          {t('login.invitado')}
        </button>
      )}
    </form>
  );
}

export function PantallaLogin({ foroId }: { foroId: string }) {
  const carga = useCarga(() => leerForo(foroId), [foroId]);
  const foro = carga.datos;
  return (
    <Pantalla titulo={t('login.titulo')} atras={['foros', foroId]}>
      {carga.estado === 'cargando' ? (
        <Cargando />
      ) : !foro ? (
        <Vacio titulo={t('foros.noExiste')} />
      ) : (
        <>
          <p class="lead">{t('login.intro', { foro: foro.nombre })}</p>
          <FormLogin
            foro={foro}
            onExito={async (usuario) => {
              await guardarForo({ ...foro, usuario });
              ir('foros', foroId);
            }}
          />
        </>
      )}
    </Pantalla>
  );
}

// ---------- añadir un foro ----------

export function AnadirForo() {
  const [direccion, setDireccion] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [hallado, setHallado] = useState<ForoGuardado | null>(null);

  const buscar = async (e: Event) => {
    e.preventDefault();
    setBuscando(true);
    setError(null);
    try {
      const d: ForoDescubierto = await descubrirForo(direccion);
      const host = new URL(d.endpoint).hostname;
      setHallado({ id: idDeEndpoint(d.endpoint), nombre: host, host, endpoint: d.endpoint, config: d.config });
    } catch (err) {
      setError(err);
    } finally {
      setBuscando(false);
    }
  };

  const terminar = async (foro: ForoGuardado) => {
    await guardarForo(foro);
    ir('foros', foro.id);
  };

  return (
    <Pantalla titulo={t('foros.anadir')} atras={['foros']}>
      {!hallado ? (
        <form class="formulario" onSubmit={buscar}>
          <p class="lead">{t('foros.anadirIntro')}</p>
          <div class="grupo">
            <input
              class="campo"
              type="url"
              inputMode="url"
              name="foro"
              autocomplete="off"
              autocapitalize="none"
              autocorrect="off"
              spellcheck={false}
              placeholder={t('foros.direccionEjemplo')}
              aria-label={t('foros.direccion')}
              value={direccion}
              onInput={(e) => setDireccion((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
          {error !== null && <Aviso error={error} />}
          <button class="btn btn-primario" type="submit" disabled={buscando || !direccion.trim()}>
            {buscando ? t('foros.buscando') : t('foros.buscar')}
          </button>
        </form>
      ) : (
        <div class="formulario">
          <div class="tarjeta">
            <h2>{hallado.nombre}</h2>
            <p class="nota">{t('foros.encontrado', { version: hallado.config.version })}</p>
          </div>
          <p class="lead">{t('foros.sesionIntro')}</p>
          <FormLogin
            foro={hallado}
            onExito={(usuario) => terminar({ ...hallado, usuario })}
            onInvitado={() => terminar(hallado)}
          />
          {!hallado.config.invitadoPermitido && <p class="nota">{t('foros.sinInvitados')}</p>}
        </div>
      )}
    </Pantalla>
  );
}

// ---------- árbol de subforos ----------

interface Fila {
  foro: Foro;
  nivel: number;
}

function aplanar(foros: Foro[], nivel = 0): Fila[] {
  return foros.flatMap((f) => [{ foro: f, nivel }, ...aplanar(f.hijos, nivel + 1)]);
}

async function cargarArbol(foro: ForoGuardado): Promise<Foro[]> {
  const clave = `arbol:${foro.id}`;
  try {
    const arbol = await clienteDe(foro).getForos();
    await guardar(clave, arbol);
    return arbol;
  } catch (e) {
    const guardado = await leer<Foro[]>(clave); // sin conexión: lo último que vimos
    if (guardado) return guardado;
    throw e;
  }
}

export function ArbolForo({ foroId }: { foroId: string }) {
  const carga = useCarga(async () => {
    const foro = await leerForo(foroId);
    if (!foro) return null;
    return { foro, arbol: await cargarArbol(foro) };
  }, [foroId]);

  let cuerpo;
  const d = carga.datos;
  if (carga.estado === 'cargando') cuerpo = <Cargando />;
  else if (carga.estado === 'error') cuerpo = <ErrorEstado error={carga.error} onReintentar={carga.recargar} />;
  else if (!d) cuerpo = <Vacio titulo={t('foros.noExiste')} />;
  else if (d.arbol.length === 0) cuerpo = <Vacio titulo={t('foros.sinSubforos')} />;
  else {
    cuerpo = (
      <div class="lista">
        {aplanar(d.arbol).map(({ foro, nivel }) =>
          foro.soloCategoria ? (
            <div key={foro.id} class="fila fila--categoria" style={{ paddingLeft: `${16 + nivel * 18}px` }}>
              {foro.nombre}
            </div>
          ) : (
            <a
              key={foro.id}
              class="fila"
              style={{ paddingLeft: `${16 + nivel * 18}px` }}
              href={hrefDe('foros', foroId, 'f', foro.id)}
            >
              <span class={`punto${foro.hayNuevos ? ' punto--nuevo' : ''}`} />
              <span class="fila-cuerpo">
                <span class="fila-titulo">{foro.nombre}</span>
              </span>
              <span class="fila-chevron">
                <IcoChevron />
              </span>
            </a>
          ),
        )}
      </div>
    );
  }
  return (
    <Pantalla titulo={d?.foro.nombre ?? t('pestanas.foros')} atras={['foros']} onRecargar={carga.recargar}>
      {cuerpo}
    </Pantalla>
  );
}

// ---------- lista de temas (paginada) ----------

export const POR_PAGINA_TEMAS = 20;

export function Paginador({ pagina, total, enlace }: { pagina: number; total: number; enlace: (p: number) => string }) {
  if (total <= 1) return null;
  return (
    <nav class="paginador" aria-label={t('paginas.etiqueta')}>
      {pagina > 1 ? (
        <a class="btn btn-secundario" href={enlace(pagina - 1)}>
          {t('paginas.anterior')}
        </a>
      ) : (
        <span />
      )}
      <span class="paginador-estado">{t('paginas.de', { n: pagina, total })}</span>
      {pagina < total ? (
        <a class="btn btn-secundario" href={enlace(pagina + 1)}>
          {t('paginas.siguiente')}
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}

function buscarNombre(arbol: Foro[] | undefined, id: string): string | undefined {
  for (const f of arbol ?? []) {
    if (f.id === id) return f.nombre;
    const h = buscarNombre(f.hijos, id);
    if (h) return h;
  }
  return undefined;
}

export function ListaTemas({ foroId, subforoId, pagina }: { foroId: string; subforoId: string; pagina: number }) {
  const carga = useCarga(async () => {
    const foro = await leerForo(foroId);
    if (!foro) return null;
    const cliente: ClienteForo = clienteDe(foro);
    const desde = (pagina - 1) * POR_PAGINA_TEMAS;
    const normales = await cliente.getTemas(subforoId, desde, desde + POR_PAGINA_TEMAS - 1);
    let fijados = [] as typeof normales.temas;
    if (pagina === 1) {
      try {
        fijados = (await cliente.getTemas(subforoId, 0, 9, 'TOP')).temas;
      } catch {
        // Los fijados son un extra: si el foro no los da, seguimos sin ellos.
      }
    }
    const ids = new Set(fijados.map((x) => x.id));
    const nombre = buscarNombre(await leer<Foro[]>(`arbol:${foroId}`), subforoId);
    return { foro, nombre, total: normales.total, temas: [...fijados, ...normales.temas.filter((x) => !ids.has(x.id))] };
  }, [foroId, subforoId, pagina]);

  const d = carga.datos;
  const paginas = d ? Math.max(1, Math.ceil(d.total / POR_PAGINA_TEMAS)) : 1;
  const acciones =
    d?.foro.usuario ? (
      <a class="btn-icono" href={hrefDe('foros', foroId, 'f', subforoId, 'nuevo')} aria-label={t('tema.nuevo')}>
        <IcoMas />
      </a>
    ) : undefined;

  let cuerpo;
  if (carga.estado === 'cargando') cuerpo = <Cargando />;
  else if (carga.estado === 'error') cuerpo = <ErrorEstado error={carga.error} onReintentar={carga.recargar} />;
  else if (!d) cuerpo = <Vacio titulo={t('foros.noExiste')} />;
  else if (d.temas.length === 0) cuerpo = <Vacio titulo={t('temas.vacio')} texto={t('temas.vacioTexto')} />;
  else {
    cuerpo = (
      <>
        {carga.error !== undefined && <Aviso error={carga.error} />}
        <div class="lista">
          {d.temas.map((tema) => (
            <FilaTema key={tema.id} foroId={foroId} tema={tema} />
          ))}
        </div>
        <Paginador
          pagina={pagina}
          total={paginas}
          enlace={(p) => hrefDe('foros', foroId, 'f', subforoId, 'p', p)}
        />
      </>
    );
  }
  return (
    <Pantalla
      titulo={d?.nombre ?? t('temas.titulo')}
      atras={['foros', foroId]}
      acciones={acciones}
      onRecargar={carga.recargar}
    >
      {cuerpo}
    </Pantalla>
  );
}
