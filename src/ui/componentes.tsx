import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { contenidoAFragmento, RE_EMOJI } from '../contenido/sanear';
import { t } from '../i18n';
import { hrefDe, mensajeError, useAjustes, volver } from './hooks';
import { IcoAtras, IcoAvisos, IcoCerrar, IcoForos, IcoMensajes, IcoNovedades, IcoYo } from './iconos';

// ---------- pantalla con barra superior compacta y tirar para recargar ----------

interface PropsPantalla {
  titulo: string;
  atras?: (string | number)[]; // destino de respaldo del botón Atrás
  atrasTexto?: string; // etiqueta del botón Atrás (por defecto «Atrás»)
  acciones?: ComponentChildren;
  onRecargar?: () => Promise<void> | void;
  cabecera?: ComponentChildren; // sustituye al título grande (p. ej. cabecera del hilo)
  pie?: ComponentChildren; // barra fija abajo (sobre la barra de pestañas)
  children: ComponentChildren;
}

const UMBRAL_TIRAR = 64;

export function Pantalla({ titulo, atras, atrasTexto, acciones, onRecargar, cabecera, pie, children }: PropsPantalla) {
  const [compacta, setCompacta] = useState(false);
  const [tiro, setTiro] = useState(0);
  const [recargando, setRecargando] = useState(false);
  const inicio = useRef<number | null>(null);

  const alDeslizar = (e: Event) => setCompacta((e.currentTarget as HTMLElement).scrollTop > (cabecera ? 90 : 36));
  const alTocar = (e: TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    inicio.current = onRecargar && el.scrollTop <= 0 ? (e.touches[0]?.clientY ?? null) : null;
  };
  const alMover = (e: TouchEvent) => {
    if (inicio.current === null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - inicio.current;
    setTiro(dy > 0 ? Math.min(dy * 0.5, 96) : 0);
  };
  const alSoltar = async () => {
    const llega = tiro >= UMBRAL_TIRAR;
    inicio.current = null;
    setTiro(0);
    if (llega && onRecargar && !recargando) {
      setRecargando(true);
      try {
        await onRecargar();
      } finally {
        setRecargando(false);
      }
    }
  };

  const altoIndicador = recargando ? 44 : tiro;
  return (
    <>
      <main
        class={`pantalla${pie ? ' pantalla--con-pie' : ''}`}
        onScroll={alDeslizar}
        onTouchStart={alTocar}
        onTouchMove={alMover}
        onTouchEnd={alSoltar}
      >
        <header class={`barra${compacta ? ' barra--compacta' : ''}`}>
          <div class="barra-lado">
            {atras && (
              <button type="button" class="btn-texto btn-atras" onClick={() => volver(...atras)}>
                <IcoAtras />
                <span>{atrasTexto || t('comun.atras')}</span>
              </button>
            )}
          </div>
          <div class="barra-titulo" aria-hidden={!compacta}>
            {titulo}
          </div>
          <div class="barra-lado barra-lado--der">{acciones}</div>
        </header>
        <div class="indicador-recarga" style={{ height: `${altoIndicador}px` }} aria-hidden="true">
          {altoIndicador > 8 && (
            <span class={`rueda${recargando || tiro >= UMBRAL_TIRAR ? ' rueda--gira' : ''}`} />
          )}
        </div>
        {cabecera ?? <h1 class={`titulo-grande${titulo.length > 26 ? ' titulo-grande--largo' : ''}`}>{titulo}</h1>}
        <div class="pantalla-cuerpo">{children}</div>
      </main>
    {pie && <div class="pie-fijo">{pie}</div>}
    </>
  );
}

// ---------- estados ----------

export function Cargando({ texto }: { texto?: string }) {
  return (
    <div class="estado" role="status">
      <span class="rueda rueda--gira" />
      <p>{texto ?? t('comun.cargando')}</p>
    </div>
  );
}

export function Vacio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ComponentChildren }) {
  return (
    <div class="estado">
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function ErrorEstado({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  return (
    <div class="estado estado--error" role="alert">
      <h2>{t('errores.titulo')}</h2>
      <p>{mensajeError(error)}</p>
      {onReintentar && (
        <button type="button" class="btn btn-secundario" onClick={onReintentar}>
          {t('comun.reintentar')}
        </button>
      )}
    </div>
  );
}

export function Aviso({ error }: { error: unknown }) {
  return (
    <p class="aviso" role="alert">
      {mensajeError(error)}
    </p>
  );
}

// ---------- barra de pestañas ----------

const PESTANAS = [
  { id: 'novedades', icono: IcoNovedades },
  { id: 'foros', icono: IcoForos },
  { id: 'mensajes', icono: IcoMensajes },
  { id: 'avisos', icono: IcoAvisos },
  { id: 'yo', icono: IcoYo },
] as const;

export function BarraPestanas({ activa }: { activa: string }) {
  return (
    <nav class="pestanas" aria-label={t('pestanas.etiqueta')}>
      {PESTANAS.map(({ id, icono: Icono }) => (
        <a
          key={id}
          href={hrefDe(id)}
          class={`pestana${activa === id ? ' pestana--activa' : ''}`}
          aria-current={activa === id ? 'page' : undefined}
        >
          <Icono />
          <span>{t(`pestanas.${id}`)}</span>
        </a>
      ))}
    </nav>
  );
}

// ---------- contenido de un foro (siempre saneado) ----------

const ALTO_CITA_PLEGADA = 150; // px: por encima, la cita se pliega

/** Pliega las citas largas y les añade el botón de mostrar más/menos. */
function plegarCitas(el: HTMLElement): void {
  el.querySelectorAll<HTMLElement>('blockquote.bb-quote').forEach((q) => {
    if (q.scrollHeight <= ALTO_CITA_PLEGADA) return;
    q.classList.add('bb-quote--plegable', 'bb-quote--plegada');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'bb-plegar';
    boton.textContent = t('contenido.verMas');
    boton.setAttribute('aria-expanded', 'false');
    q.after(boton);
  });
}

export function Contenido({ bruto }: { bruto: string }) {
  const { imagenes } = useAjustes();
  const ref = useRef<HTMLDivElement>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);

  // El fragmento ya salió de DOMPurify: se inserta tal cual, sin serializar ni reparsear.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.replaceChildren(contenidoAFragmento(bruto, { imagenes, textoBoton: t('contenido.cargarImagen') }));
    plegarCitas(el);
  }, [bruto, imagenes]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const alPulsar = (e: Event) => {
      const objetivo = e.target as Element;
      const diferida = objetivo.closest('button.bb-imagen-diferida, button.bb-emoji-diferido');
      const src = diferida?.getAttribute('data-src');
      if (diferida && src && /^https:/i.test(src)) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        diferida.replaceWith(img);
        return;
      }
      const plegar = objetivo.closest('button.bb-plegar');
      if (plegar) {
        const cita = plegar.previousElementSibling!;
        const plegada = cita.classList.toggle('bb-quote--plegada');
        plegar.textContent = t(plegada ? 'contenido.verMas' : 'contenido.verMenos');
        plegar.setAttribute('aria-expanded', String(!plegada));
        return;
      }
      if (objetivo instanceof HTMLImageElement && !objetivo.closest('a')) {
        const s = objetivo.getAttribute('src') ?? '';
        if (/^https:/i.test(s) && !RE_EMOJI.test(s)) setAmpliada(s);
      }
    };
    el.addEventListener('click', alPulsar);
    return () => el.removeEventListener('click', alPulsar);
  }, []);

  return (
    <>
      <div ref={ref} class="contenido-foro" />
      {ampliada &&
        createPortal(
          <div class="visor" role="dialog" aria-modal="true" aria-label={t('contenido.imagenAmpliada')} onClick={() => setAmpliada(null)}>
            <img src={ampliada} alt="" referrerPolicy="no-referrer" />
            <button type="button" class="visor-cerrar" aria-label={t('contenido.cerrarImagen')}>
              <IcoCerrar />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

// ---------- controles ----------

export function Segmentado<T extends string>(props: {
  valor: T;
  opciones: { id: T; texto: string }[];
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div class="segmentado" role="radiogroup" aria-label={props.etiqueta}>
      {props.opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={props.valor === o.id}
          class={props.valor === o.id ? 'seg--activo' : ''}
          onClick={() => props.onCambio(o.id)}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
