import { useState } from 'preact/hooks';
import { guardarAjustes, type ModoImagenes, type TamanoLetra } from '../../datos/ajustes';
import { clienteDe } from '../../datos/clientes';
import { guardarForo, listarForos, quitarForo, type ForoGuardado } from '../../datos/foros';
import { borrarSesion } from '../../datos/sesiones';
import { t } from '../../i18n';
import { esDemo } from '../../transporte';
import { Cargando, ErrorEstado, Pantalla, Segmentado } from '../componentes';
import { hrefDe, useAjustes, useCarga } from '../hooks';

function FilaCuenta({ foro, alCambiar }: { foro: ForoGuardado; alCambiar: () => void }) {
  const [ocupado, setOcupado] = useState(false);

  const cerrarSesion = async () => {
    setOcupado(true);
    try {
      await clienteDe(foro).logout(); // si falla (sin red), igualmente olvidamos la sesión aquí
    } catch {
      /* se ignora a propósito */
    }
    await borrarSesion(foro.id);
    await guardarForo({ ...foro, usuario: undefined });
    setOcupado(false);
    alCambiar();
  };

  const quitar = async () => {
    if (!confirm(t('yo.confirmarQuitar', { foro: foro.nombre }))) return;
    await quitarForo(foro.id);
    alCambiar();
  };

  return (
    <div class="fila fila--cuenta">
      <span class="fila-cuerpo">
        <span class="fila-titulo">{foro.nombre}</span>
        <span class="fila-meta">{foro.usuario ? t('foros.conSesion', { usuario: foro.usuario }) : t('foros.invitado')}</span>
      </span>
      <span class="fila-acciones">
        {foro.usuario ? (
          <button type="button" class="btn-texto" disabled={ocupado} onClick={cerrarSesion}>
            {t('yo.cerrarSesion')}
          </button>
        ) : (
          <a class="btn-texto" href={hrefDe('foros', foro.id, 'login')}>
            {t('login.entrar')}
          </a>
        )}
        <button type="button" class="btn-texto btn-texto--peligro" onClick={quitar}>
          {t('yo.quitar')}
        </button>
      </span>
    </div>
  );
}

export function Yo() {
  const ajustes = useAjustes();
  const carga = useCarga(listarForos, []);

  const cambiarImagenes = (v: ModoImagenes) => void guardarAjustes({ imagenes: v });
  const cambiarLetra = (v: TamanoLetra) => void guardarAjustes({ letra: v });

  return (
    <Pantalla titulo={t('pestanas.yo')}>
      <h2 class="seccion">{t('yo.cuentas')}</h2>
      {carga.estado === 'cargando' ? (
        <Cargando />
      ) : carga.estado === 'error' || !carga.datos ? (
        <ErrorEstado error={carga.error} onReintentar={carga.recargar} />
      ) : carga.datos.length === 0 ? (
        <p class="nota">{t('yo.sinCuentas')}</p>
      ) : (
        <div class="lista">
          {carga.datos.map((f) => (
            <FilaCuenta key={f.id} foro={f} alCambiar={() => void carga.recargar()} />
          ))}
        </div>
      )}

      <h2 class="seccion">{t('yo.ajustes')}</h2>
      <div class="lista lista--ajustes">
        <div class="fila fila--ajuste">
          <span class="fila-titulo">{t('yo.imagenes')}</span>
          <Segmentado<ModoImagenes>
            etiqueta={t('yo.imagenes')}
            valor={ajustes.imagenes}
            onCambio={cambiarImagenes}
            opciones={[
              { id: 'siempre', texto: t('yo.imagenesSiempre') },
              { id: 'tocar', texto: t('yo.imagenesTocar') },
            ]}
          />
          <span class="fila-meta">{t('yo.imagenesAyuda')}</span>
        </div>
        <div class="fila fila--ajuste">
          <span class="fila-titulo">{t('yo.letra')}</span>
          <Segmentado<TamanoLetra>
            etiqueta={t('yo.letra')}
            valor={ajustes.letra}
            onCambio={cambiarLetra}
            opciones={[
              { id: 'pequena', texto: t('yo.letraPequena') },
              { id: 'normal', texto: t('yo.letraNormal') },
              { id: 'grande', texto: t('yo.letraGrande') },
              { id: 'enorme', texto: t('yo.letraEnorme') },
            ]}
          />
        </div>
        {!esDemo() && (
          <div class="fila fila--ajuste">
            <span class="fila-titulo">{t('yo.claveApp')}</span>
            <button type="button" class="btn-texto" onClick={() => void guardarAjustes({ clave: '' })}>
              {t('yo.cambiarClave')}
            </button>
          </div>
        )}
      </div>

      <h2 class="seccion">{t('yo.acerca')}</h2>
      <div class="tarjeta">
        <p>
          <strong>Tertulia</strong> · {t('yo.version', { v: '0.1.0' })}
        </p>
        <p class="nota">{t('yo.acercaTexto')}</p>
        {esDemo() && <p class="nota">{t('yo.demo')}</p>}
      </div>
    </Pantalla>
  );
}
