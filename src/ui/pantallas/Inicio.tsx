// Primer uso: guía de instalación (Safari) y clave de la app (ya instalada).
import { useState } from 'preact/hooks';
import { guardarAjustes } from '../../datos/ajustes';
import { t } from '../../i18n';
import { probarClave } from '../../transporte';
import { mensajeError } from '../hooks';
import { IcoCompartir, IcoMasCuadro } from '../iconos';

/** La app está instalada en la pantalla de inicio (iOS: navigator.standalone). */
export function estaInstalada(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
}

export function Bienvenida() {
  const pasos = [
    { icono: <IcoCompartir />, clave: 'bienvenida.paso1' },
    { icono: <IcoMasCuadro />, clave: 'bienvenida.paso2' },
    { icono: <span class="paso-num">3</span>, clave: 'bienvenida.paso3' },
    { icono: <span class="paso-num">4</span>, clave: 'bienvenida.paso4' },
  ];
  return (
    <main class="pantalla pantalla--sola">
      <div class="bienvenida">
        <img class="bienvenida-logo" src="/icono.svg" alt="" width="96" height="96" />
        <h1 class="titulo-grande">{t('bienvenida.titulo')}</h1>
        <p class="lead">{t('bienvenida.intro')}</p>
        <h2 class="seccion">{t('bienvenida.comoInstalar')}</h2>
        <ol class="pasos">
          {pasos.map((p) => (
            <li key={p.clave}>
              <span class="paso-icono">{p.icono}</span>
              <span>{t(p.clave)}</span>
            </li>
          ))}
        </ol>
        <p class="nota">{t('bienvenida.nota')}</p>
      </div>
    </main>
  );
}

export function PantallaClave({ onLista }: { onLista: () => void }) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);

  const enviar = async (e: Event) => {
    e.preventDefault();
    const limpia = clave.trim();
    if (!limpia) return setError(t('clave.vacia'));
    setProbando(true);
    setError(null);
    try {
      await probarClave(limpia);
      await guardarAjustes({ clave: limpia });
      onLista();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setProbando(false);
    }
  };

  return (
    <main class="pantalla pantalla--sola">
      <form class="bienvenida" onSubmit={enviar}>
        <img class="bienvenida-logo" src="/icono.svg" alt="" width="96" height="96" />
        <h1 class="titulo-grande">{t('clave.titulo')}</h1>
        <p class="lead">{t('clave.intro')}</p>
        <div class="grupo">
          <input
            class="campo"
            type="password"
            name="clave-app"
            autocomplete="off"
            autocapitalize="none"
            autocorrect="off"
            spellcheck={false}
            placeholder={t('clave.campo')}
            aria-label={t('clave.campo')}
            value={clave}
            onInput={(e) => setClave((e.currentTarget as HTMLInputElement).value)}
          />
        </div>
        {error && <p class="aviso" role="alert">{error}</p>}
        <button class="btn btn-primario" type="submit" disabled={probando}>
          {probando ? t('clave.probando') : t('clave.entrar')}
        </button>
      </form>
    </main>
  );
}
