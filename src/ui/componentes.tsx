import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { contenidoAHtml } from '../contenido/sanear';
import { t } from '../i18n';
import { hrefDe, mensajeError, useAjustes, volver } from './hooks';
import { IcoAtras, IcoAvisos, IcoForos, IcoMensajes, IcoNovedades, IcoYo } from './iconos';

// ---------- pantalla con barra superior compacta y tirar para recargar ----------

interface PropsPantalla {
  titulo: string;
  atras?: (string | number)[]; // destino de respaldo del botón Atrás
  acciones?: ComponentChildren;
  onRecargar?: () => Promise<void> | void;
  children: ComponentChildren;
}

const UMBRAL_TIRAR = 64;

export function Pantalla({ titulo, atras, acciones, onRecargar, children }: PropsPantalla) {
  const [compacta, setCompacta] = useState(false);
  const [tiro, setTiro] = useState(0);
  const [recargando, setRecargando] = useState(false);
  const inicio = useRef<number | null>(null);

  const alDeslizar = (e: Event) => setCompacta((e.currentTarget as HTMLElement).scrollTop > 36);
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
    <main
      class="pantalla"
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
              <span>{t('comun.atras')}</span>
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
      <h1 class={`titulo-grande${titulo.length > 26 ? ' titulo-grande--largo' : ''}`}>{titulo}</h1>
      <div class="pantalla-cuerpo">{children}</div>
    </main>
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

export function Contenido({ bruto }: { bruto: string }) {
  const { imagenes } = useAjustes();
  const html = useMemo(
    () => contenidoAHtml(bruto, { imagenes, textoBoton: t('contenido.cargarImagen') }),
    [bruto, imagenes],
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const alPulsar = (e: Event) => {
      const boton = (e.target as Element).closest('button.bb-imagen-diferida');
      const src = boton?.getAttribute('data-src');
      if (!boton || !src || !/^https:/i.test(src)) return;
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      boton.replaceWith(img);
    };
    el.addEventListener('click', alPulsar);
    return () => el.removeEventListener('click', alPulsar);
  }, []);

  // El HTML ya pasó por DOMPurify (contenidoAHtml).
  return <div ref={ref} class="contenido-foro" dangerouslySetInnerHTML={{ __html: html }} />;
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
