import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { ErrorDireccion } from '../api/descubrir';
import { ErrorXmlRpc } from '../api/xmlrpc';
import { ErrorForoCerrado, ErrorNoCompatible } from '../datos/descubrir-foro';
import { ajustesActuales, suscribirAjustes, type Ajustes } from '../datos/ajustes';
import { t } from '../i18n';
import { ErrorProxy } from '../transporte';

// ---------- navegación por hash: #/foros/<id>/t/<tema>/p/<n> ----------

export function leerRuta(): string[] {
  const h = location.hash.replace(/^#\/?/, '');
  return h === '' ? [] : h.split('/').map((p) => decodeURIComponent(p));
}

export function hrefDe(...partes: (string | number)[]): string {
  return '#/' + partes.map((p) => encodeURIComponent(String(p))).join('/');
}

export function ir(...partes: (string | number)[]): void {
  location.hash = hrefDe(...partes);
}

/** Atrás del historial; si la app se abrió en esta pantalla, va al destino de respaldo. */
export function volver(...respaldo: (string | number)[]): void {
  if (history.length > 1) history.back();
  else location.hash = hrefDe(...respaldo);
}

export function useRuta(): string[] {
  const [ruta, setRuta] = useState(leerRuta);
  useEffect(() => {
    const f = () => setRuta(leerRuta());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return ruta;
}

export function useAjustes(): Ajustes {
  const [a, setA] = useState(ajustesActuales);
  useEffect(() => suscribirAjustes(setA), []);
  return a;
}

// ---------- errores legibles ----------

export function mensajeError(e: unknown): string {
  if (e instanceof ErrorProxy) return t(`errores.proxy.${e.codigo}`);
  if (e instanceof ErrorDireccion) return t(`errores.direccion.${e.codigo}`);
  if (e instanceof ErrorNoCompatible) return t('errores.noCompatible');
  if (e instanceof ErrorForoCerrado) return t('errores.foroCerrado');
  if (e instanceof ErrorXmlRpc) return e.message || t('errores.generico');
  return t('errores.generico');
}

// ---------- carga asíncrona con estados ----------

export interface EstadoCarga<T> {
  estado: 'cargando' | 'ok' | 'error';
  datos?: T;
  error?: unknown;
  recargando: boolean;
  recargar: () => Promise<void>;
}

export function useCarga<T>(fn: () => Promise<T>, deps: unknown[]): EstadoCarga<T> {
  const [s, setS] = useState<{ estado: 'cargando' | 'ok' | 'error'; datos?: T; error?: unknown }>({
    estado: 'cargando',
  });
  const [recargando, setRecargando] = useState(false);
  const turno = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const ejecutar = useCallback(async (inicial: boolean) => {
    const mio = ++turno.current;
    if (inicial) setS({ estado: 'cargando' });
    else setRecargando(true);
    try {
      const datos = await fnRef.current();
      if (mio === turno.current) setS({ estado: 'ok', datos });
    } catch (error) {
      // Si ya había datos (recarga fallida) se conservan y el error se muestra como aviso.
      if (mio === turno.current) {
        setS((p) => (inicial || p.datos === undefined ? { estado: 'error', error } : { estado: 'ok', datos: p.datos, error }));
      }
    } finally {
      if (mio === turno.current) setRecargando(false);
    }
  }, []);

  useEffect(() => {
    void ejecutar(true);
    return () => {
      turno.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...s, recargando, recargar: () => ejecutar(false) };
}
